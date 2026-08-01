// PM2 配置：用同一 Node 服务托管 Docsify 文档站和 /admin-api/ 编辑网关（端口 3009）
// 服务器上已有的 Caddy 只需将 doc.codesome.ai 反代到 127.0.0.1:3009（见 Caddyfile）
// 首次启动：pm2 start ecosystem.config.js && pm2 save
// 开机自启（Linux 服务器）：pm2 startup（按提示执行输出的命令），之后 pm2 save
// 编辑 Token 哈希、会话密钥和 GitHub 凭据必须由生产环境注入，不得写入此文件。
module.exports = {
  apps: [
    {
      name: 'doc-site-3009',
      script: 'server.mjs',
      interpreter: 'node',
      cwd: __dirname,
      env: {
        PORT: 3009
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      out_file: './logs/doc-site-out.log',
      error_file: './logs/doc-site-error.log',
      merge_logs: true,
      time: true
    }
  ]
}
