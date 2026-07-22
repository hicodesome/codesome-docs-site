# Codesome 使用文档

> Codesome 平台的安装配置、问题排查与进阶使用教程合集。左侧边栏按主题分组，右上角可全文搜索。

## 常用地址

| 场景 | 地址 |
| --- | --- |
| 下单购买 | <https://fk.codesome.cn/> |
| V3 后台 / 兑换 / API Key / 使用记录 | <https://v3.codesome.cn/dashboard> |
| V3 API Key 创建 | <https://v3.codesome.cn/keys> |
| 二合一主界面 | <https://v5.codesome.cn> |
| 服务状态 | <https://status.codesome.cn> |

## 快速导航

- **第一次使用**：先看对应计划的安装配置教程（V3 计划或二合一计划），再创建 API Key。
- **遇到报错**：直接查 [使用问题速查](02-使用问题速查.md)。
- **想省 Token**：看 [Token 降费执行手册](03-Token降费执行手册.md)。

## 本地阅读

```bash
npm install
npm run dev
# 浏览器打开 http://localhost:3000
```

没有 Node 环境时，任何静态文件服务器指向本目录即可（如 `python -m http.server`）。

## 目录约定

- `0X-` 前缀表示分类：`01` 安装配置、`02` 问题排查、`03` 进阶玩法、`04/05` 课程与福利
- 所有截图统一放在 `images/`，文档内用相对路径 `images/xxx.png` 引用
- 新增文档后记得同步更新 `_sidebar.md`
