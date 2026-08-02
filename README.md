# Codesome 文档站

[codesome｜Agentic 入门宝典](03-Agentic入门宝典.md)

## 维护命令

```bash
npm run generate:titles  # 扫描公开 Markdown，生成标题映射和 Decap 配置
npm run check            # 完整站点契约
npm run review:cms       # 只读发现和检查 cms/* 编辑变更
```

根目录 `NN-*.md` 是公开文章集合。新文章使用唯一 H1 并加入 `_sidebar.md` 后，运行 `npm run generate:titles`，即会自动进入 `admin/config.yml` 的编辑范围。详见 [文章生命周期流程](docs/ARTICLE_LIFECYCLE.md)。
