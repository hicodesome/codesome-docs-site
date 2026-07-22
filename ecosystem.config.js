// PM2 配置：用 PM2 内置静态服务器托管 Docsify 文档站（端口 3009）
// 服务器上已有的 Caddy 只需加一条 reverse_proxy 指向 127.0.0.1:3009（见 Caddyfile）
// 首次启动：pm2 start ecosystem.config.js && pm2 save
// 开机自启（Linux 服务器）：pm2 startup（按提示执行输出的命令），之后 pm2 save
module.exports = {
  apps: [
    {
      name: 'doc-site-3009',
      // "serve" 是 PM2 内置的静态文件服务器，无需任何额外依赖
      script: 'serve',
      cwd: __dirname,
      env: {
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 3009,
        // Docsify 是 SPA，未命中路径回退到 index.html
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
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
