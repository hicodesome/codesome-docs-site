# PIAgent 模型配置示例

本文只提供 PIAgent 的模型配置示例。

请将配置中的 `YOUR_CODESOME_API_KEY` 占位符替换为自己的 Codesome API Key。API Key 属于敏感信息，请不要公开、提交到公开代码仓库，或发送到公开群组和论坛。

PIAgent 的安装方法、配置文件位置、加载方式、字段含义以及版本更新，请自行查阅 PIAgent 官方文档。本文不展开这些内容，也不提供具体配置步骤。

```json
{
  "providers": {
    "codesome": {
      "baseUrl": "https://cc.codesome.ai",
      "api": "openai-responses",
      "apiKey": "YOUR_CODESOME_API_KEY",
      "models": [
        {
          "id": "gpt-5.6-luna",
          "name": "GPT-5.6 Luna",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 272000,
          "maxTokens": 128000,
          "cost": {
            "input": 0,
            "output": 0,
            "cacheRead": 0,
            "cacheWrite": 0
          }
        }
      ]
    }
  }
}
```
