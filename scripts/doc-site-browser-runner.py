#!/usr/bin/env python3
"""Run Docsify assertions inside the Chrome DRM container over CDP."""

from __future__ import annotations

import base64
import json
import os
import socket
import struct
import sys
import time
from urllib.request import urlopen


class WebSocket:
    def __init__(self, url: str):
        if not url.startswith("ws://"):
            raise RuntimeError("only ws:// CDP endpoints are supported")
        authority, _, resource = url[5:].partition("/")
        host, separator, port_text = authority.partition(":")
        port = int(port_text) if separator else 80
        self.sock = socket.create_connection((host, port), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET /{resource} HTTP/1.1\r\nHost: {authority}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        ).encode("ascii")
        self.sock.sendall(request)
        response = b""
        while b"\r\n\r\n" not in response:
            response += self.sock.recv(4096)
        if b" 101 " not in response.split(b"\r\n", 1)[0]:
            raise RuntimeError("CDP websocket handshake failed")

    def close(self):
        self.sock.close()

    def send(self, payload: str):
        data = payload.encode("utf-8")
        mask = os.urandom(4)
        length = len(data)
        if length < 126:
            header = bytes([0x81, 0x80 | length])
        elif length < 65536:
            header = bytes([0x81, 0x80 | 126]) + struct.pack("!H", length)
        else:
            header = bytes([0x81, 0x80 | 127]) + struct.pack("!Q", length)
        masked = bytes(value ^ mask[index % 4] for index, value in enumerate(data))
        self.sock.sendall(header + mask + masked)

    def receive(self) -> str:
        def exact(size: int) -> bytes:
            result = b""
            while len(result) < size:
                chunk = self.sock.recv(size - len(result))
                if not chunk:
                    raise RuntimeError("CDP websocket closed")
                result += chunk
            return result

        fragments = []
        while True:
            first, second = exact(2)
            opcode = first & 0x0F
            length = second & 0x7F
            if length == 126:
                length = struct.unpack("!H", exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", exact(8))[0]
            mask = exact(4) if second & 0x80 else None
            data = exact(length)
            if mask:
                data = bytes(value ^ mask[index % 4] for index, value in enumerate(data))
            if opcode == 0x8:
                raise RuntimeError("CDP websocket closed")
            if opcode == 0x9:
                continue
            if opcode in (0x1, 0x2):
                fragments = [data]
            elif opcode == 0x0:
                fragments.append(data)
            if first & 0x80:
                return b"".join(fragments).decode("utf-8")


class CDP:
    def __init__(self, websocket_url: str):
        self.websocket = WebSocket(websocket_url)
        self.counter = 0
        self.events = []

    def close(self):
        self.websocket.close()

    def call(self, method: str, params: dict | None = None, session_id: str | None = None):
        self.counter += 1
        call_id = self.counter
        message = {"id": call_id, "method": method, "params": params or {}}
        if session_id:
            message["sessionId"] = session_id
        self.websocket.send(json.dumps(message))
        while True:
            incoming = json.loads(self.websocket.receive())
            if incoming.get("id") == call_id:
                if "error" in incoming:
                    raise RuntimeError(incoming["error"].get("message", "CDP command failed"))
                return incoming.get("result", {})
            if "method" in incoming:
                self.events.append(incoming)

    def drain_events(self):
        events, self.events = self.events, []
        return events


def browser_websocket_url():
    try:
        with urlopen("http://127.0.0.1:9222/json/version", timeout=5) as response:
            data = json.load(response)
    except Exception as exc:
        raise RuntimeError("Chrome CDP is unavailable") from exc
    if not data.get("webSocketDebuggerUrl"):
        raise RuntimeError("Chrome did not expose a browser websocket")
    return data["webSocketDebuggerUrl"]


def evaluate(cdp: CDP, expression: str, session_id: str):
    result = cdp.call(
        "Runtime.evaluate",
        {"expression": expression, "returnByValue": True, "awaitPromise": True},
        session_id,
    )
    if "exceptionDetails" in result:
        raise RuntimeError("page evaluation failed")
    return result.get("result", {}).get("value")


def console_errors(events):
    errors = []
    for event in events:
        method = event.get("method")
        params = event.get("params", {})
        if method == "Runtime.exceptionThrown":
            details = params.get("exceptionDetails", {})
            errors.append(details.get("text") or details.get("exception", {}).get("description", "runtime exception"))
        elif method == "Log.entryAdded":
            entry = params.get("entry", {})
            if entry.get("level") in {"error", "assert"}:
                errors.append(entry.get("text", "console error"))
        elif method == "Runtime.consoleAPICalled" and params.get("type") in {"error", "assert"}:
            args = params.get("args", [])
            errors.append(" ".join(str(arg.get("value", arg.get("description", ""))) for arg in args))
    return [str(error) for error in errors if str(error).strip()]


def wait_for_page(cdp: CDP, session_id: str, article: str, title: str, deadline: float, require_article: bool = False):
    article_json = json.dumps(article, ensure_ascii=False)
    title_json = json.dumps(title, ensure_ascii=False)
    article_base_json = json.dumps(article[:-3] if article.lower().endswith('.md') else article, ensure_ascii=False)
    while time.monotonic() < deadline:
        state = evaluate(
            cdp,
            """(() => {
              const article = %s;
              const title = %s;
              const articleBase = %s;
              const hash = decodeURIComponent(location.hash || '');
              const h1 = document.querySelector('.markdown-section h1')?.textContent?.trim() || '';
              return {
                ready: document.readyState === 'complete',
                sidebar: Boolean(document.querySelector('.sidebar-nav a')),
                markdown: Boolean(document.querySelector('.markdown-section')),
                route: hash,
                article: hash.includes(article) || hash.includes(articleBase),
                h1: h1,
                title: title
              };
            })()""" % (article_json, title_json, article_base_json),
            session_id,
        ) or {}
        if state.get("ready") and state.get("sidebar") and state.get("markdown"):
            if require_article and state.get("article") and state.get("h1") == state.get("title"):
                return state
            if not require_article and not state.get("article"):
                return state
        time.sleep(0.25)
    raise RuntimeError("timed out waiting for Docsify content")


def prepare_and_wait_for_images(cdp: CDP, session_id: str, deadline: float):
    evaluate(
        cdp,
        """(() => {
          const images = Array.from(document.querySelectorAll('.markdown-section img'));
          images.forEach(image => image.scrollIntoView({block: 'center'}));
          window.scrollTo(0, 0);
          return images.length;
        })()""",
        session_id,
    )
    while time.monotonic() < deadline:
        state = evaluate(
            cdp,
            """(() => {
              const images = Array.from(document.querySelectorAll('.markdown-section img'));
              return {
                count: images.length,
              complete: images.every(image => image.complete)
              };
            })()""",
            session_id,
        ) or {}
        if state.get("complete"):
            return state
        time.sleep(0.25)
    raise RuntimeError("timed out waiting for article images")


def snapshot(cdp: CDP, session_id: str, article: str):
    article_json = json.dumps(article, ensure_ascii=False)
    return evaluate(
        cdp,
        """(() => {
          const article = %s;
          const links = Array.from(document.querySelectorAll('.sidebar-nav a'));
          const target = links.find(link => {
            const href = decodeURIComponent(link.getAttribute('href') || '');
            return href.endsWith(article) || href.endsWith(article.replace(/\\.md$/, ''));
          });
          const section = document.querySelector('.markdown-section');
          return {
            sidebarTitles: links.map(link => (link.textContent || '').trim()).filter(Boolean),
            targetLink: target ? {text: target.textContent.trim(), href: target.getAttribute('href')} : null,
            h1: section?.querySelector('h1')?.textContent?.trim() || '',
            bodyText: section?.textContent || '',
            images: Array.from(section?.querySelectorAll('img') || []).map(image => ({
              src: image.currentSrc || image.src,
              complete: image.complete,
              naturalWidth: image.naturalWidth
            })),
            href: location.href
          };
        })()""" % article_json,
        session_id,
    ) or {}


def capture(cdp: CDP, session_id: str):
    return cdp.call("Page.captureScreenshot", {"format": "png", "fromSurface": True}, session_id).get("data", "")


def run(config, websocket_url):
    cdp = CDP(websocket_url)
    context_id = None
    target_id = None
    try:
        context_id = cdp.call("Target.createBrowserContext")["browserContextId"]
        target_id = cdp.call("Target.createTarget", {"url": "about:blank", "browserContextId": context_id})["targetId"]
        session_id = cdp.call("Target.attachToTarget", {"targetId": target_id, "flatten": True})["sessionId"]
        cdp.call("Page.enable", session_id=session_id)
        cdp.call("Runtime.enable", session_id=session_id)
        cdp.call("Log.enable", session_id=session_id)
        cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 1280, "height": 900, "deviceScaleFactor": 1, "mobile": False
        }, session_id=session_id)

        base_url = config["url"].rstrip("/")
        timeout_s = max(10, config["timeout_ms"] / 1000)
        cdp.call("Page.navigate", {"url": base_url + "/#/"}, session_id=session_id)
        wait_for_page(cdp, session_id, config["article"], config["title"], time.monotonic() + timeout_s)
        home_events = cdp.drain_events()
        home = snapshot(cdp, session_id, config["article"])
        home_events += cdp.drain_events()
        home["consoleErrors"] = console_errors(home_events)
        home["html"] = evaluate(cdp, "document.documentElement.outerHTML", session_id)
        home["screenshot"] = capture(cdp, session_id)

        navigation = evaluate(
            cdp,
            """(() => {
              const article = %s;
              const links = Array.from(document.querySelectorAll('.sidebar-nav a'));
              const target = links.find(link => {
                const href = decodeURIComponent(link.getAttribute('href') || '');
                return href.endsWith(article) || href.endsWith(article.replace(/\\.md$/, ''));
              });
              if (!target) return {clicked: false, href: location.href};
              target.click();
              return {clicked: true, href: target.href};
            })()""" % json.dumps(config["article"], ensure_ascii=False),
            session_id,
        ) or {"clicked": False, "href": ""}
        is_homepage = config["article"] == "03-Agentic入门宝典.md"
        if navigation.get("clicked"):
            wait_for_page(cdp, session_id, config["article"], config["title"], time.monotonic() + timeout_s, True)
        elif not is_homepage:
            wait_for_page(cdp, session_id, config["article"], config["title"], time.monotonic() + timeout_s, True)
        prepare_and_wait_for_images(cdp, session_id, time.monotonic() + timeout_s)
        article_events = cdp.drain_events()
        article = snapshot(cdp, session_id, config["article"])
        article_events += cdp.drain_events()
        article["consoleErrors"] = console_errors(article_events)
        article["html"] = evaluate(cdp, "document.documentElement.outerHTML", session_id)
        article["screenshot"] = capture(cdp, session_id)
        return {"status": "PASS", "home": home, "navigation": navigation, "article": article}
    finally:
        if target_id:
            try:
                cdp.call("Target.closeTarget", {"targetId": target_id})
            except Exception:
                pass
        if context_id:
            try:
                cdp.call("Target.disposeBrowserContext", {"browserContextId": context_id})
            except Exception:
                pass
        cdp.close()


def main():
    try:
        encoded = sys.argv[1]
        padding = "=" * (-len(encoded) % 4)
        config = json.loads(base64.urlsafe_b64decode(encoded + padding))
        try:
            websocket_url = browser_websocket_url()
        except Exception as exc:
            result = {"status": "SKIP", "reason": str(exc)}
        else:
            try:
                result = run(config, websocket_url)
            except Exception as exc:
                result = {"status": "FAIL", "reason": str(exc)}
    except Exception as exc:
        result = {"status": "FAIL", "reason": f"invalid runner input: {exc}"}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
