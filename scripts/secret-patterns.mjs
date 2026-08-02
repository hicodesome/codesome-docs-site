export const SECRET_PATTERNS = [
  { name: 'sk_cr', pattern: /sk_cr-[A-Za-z0-9]{24,}/g },
  { name: 'sk', pattern: /sk-[A-Za-z0-9]{24,}/g },
  { name: 'cr', pattern: /cr-[A-Za-z0-9]{24,}/g },
  { name: 'ghp', pattern: /ghp_[A-Za-z0-9]{20,}/g },
  { name: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{20,}/g }
];

export function scanTextForSecrets(content, path = 'input') {
  const findings = [];
  String(content).split(/\r?\n/).forEach((line, index) => {
    for (const { name, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) findings.push({ path, line: index + 1, name });
    }
  });
  return findings;
}

export function scanAddedDiffForSecrets(diff) {
  const findings = [];
  let path = 'diff';
  let addedLine = 0;
  for (const line of String(diff).split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      path = line.slice(6);
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      addedLine = Number(hunk[1]) - 1;
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLine += 1;
      for (const finding of scanTextForSecrets(line.slice(1), path)) {
        findings.push({ ...finding, line: addedLine });
      }
    } else if (!line.startsWith('-') && !line.startsWith('\\')) {
      addedLine += 1;
    }
  }
  return findings;
}

export function redactSecrets(content) {
  let redacted = String(content);
  for (const { name, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, `[REDACTED:${name}]`);
  }
  return redacted;
}
