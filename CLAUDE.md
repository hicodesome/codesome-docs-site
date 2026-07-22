# doc-codesome

Codesome 平台使用文档站（Docsify 静态站点）。部署架构：PM2 内置静态服务器跑在 3009 端口，服务器上已有的 Caddy 反向代理 doc.codesome.ai → 127.0.0.1:3009（片段见 Caddyfile）。

## PM2 Services

| Port | Name | Type |
|------|------|------|
| 3009 | doc-site-3009 | PM2 内置静态服务器（serve） |

**Terminal Commands:**
```bash
pm2 start ecosystem.config.js    # 首次启动
pm2 save                         # 保存进程列表（持久化必须）
pm2 startup                      # Linux 开机自启（按提示执行输出的命令）
pm2 restart doc-site-3009 / pm2 stop doc-site-3009
pm2 logs / pm2 status / pm2 monit
pm2 resurrect                    # 手动恢复已保存的进程列表
```
