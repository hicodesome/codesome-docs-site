## 方法说明

本方法无需下载或创建 `.py` 脚本文件，直接在终端中执行命令即可生成图片。

请根据您使用的操作系统，选择对应的方法。

## 一、Windows PowerShell

### 1. 配置 API 信息

```powershell
$env:OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'
$env:OPENAI_BASE_URL = 'https://cc.codesome.ai/v1'
```

请将 `YOUR_OPENAI_API_KEY` 替换为您的实际 API Key。

### 2. 调用生图接口

复制并执行以下完整命令：

```powershell
$body = @{
  model   = 'gpt-image-2'
  prompt  = '这里填写您的图片生成提示词'
  size    = '1024x1024'
  quality = 'medium'
} | ConvertTo-Json

$utf8Body = [System.Text.Encoding]::UTF8.GetBytes($body)

$response = Invoke-RestMethod `
  -Method Post `
  -Uri "$env:OPENAI_BASE_URL/images/generations" `
  -Headers @{
    Authorization = "Bearer $env:OPENAI_API_KEY"
  } `
  -ContentType 'application/json; charset=utf-8' `
  -Body $utf8Body

$outputPath = Join-Path (Get-Location) 'output.png'

[System.IO.File]::WriteAllBytes(
  $outputPath,
  [System.Convert]::FromBase64String($response.data[0].b64_json)
)

Write-Host "图片已保存到：$outputPath"
```

执行成功后，图片会保存为当前目录下的 `output.png`。

## 二、macOS Terminal

### 1. 配置 API 信息

```bash
export OPENAI_API_KEY='YOUR_OPENAI_API_KEY'
export OPENAI_BASE_URL='https://cc.codesome.ai/v1'
```

请将 `YOUR_OPENAI_API_KEY` 替换为您的实际 API Key。

### 2. 调用生图接口

复制并执行以下完整命令：

```bash
curl -sS "$OPENAI_BASE_URL/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "这里填写您的图片生成提示词",
    "size": "1024x1024",
    "quality": "medium"
  }' \
| python3 -c '
import sys
import json
import base64

response = json.load(sys.stdin)
image_data = response["data"][0]["b64_json"]

with open("output.png", "wb") as file:
    file.write(base64.b64decode(image_data))

print("图片已保存到：output.png")
'
```

执行成功后，图片会保存为当前目录下的 `output.png`。

macOS 需要已经安装并能够使用 `python3`。这里只使用 `python3` 解码接口返回的图片数据，不需要创建任何 Python 文件。

## 三、需要修改的内容

使用前请修改以下内容：

* `YOUR_OPENAI_API_KEY`：替换为您的实际 API Key。

* `这里填写您的图片生成提示词`：替换为您想生成的图片描述。

* `output.png`：可以替换为其他输出文件名，例如 `a-cat.png`。

建议输出文件名继续使用 `.png` 后缀。

## 四、常用参数

* 图片尺寸：`"size": "1024x1024"`

* 图片质量：`"quality": "medium"`

* 生图模型：`"model": "gpt-image-2"`

## 五、注意事项

1. 环境变量仅对当前终端窗口有效，关闭终端后需要重新配置。

2. API Base URL 已经包含 `/v1`，调用接口时只需要继续添加 `/images/generations`，最终请求地址为 `https://cc.codesome.ai/v1/images/generations`。

3. PowerShell 命令使用反引号 `` ` `` 进行换行。

4. macOS Terminal 命令使用反斜杠 `\` 进行换行。

5. 如果接口调用失败，请先检查：

* API Key 是否填写正确；

* 生图分组是否已经开通；

* 当前账户余额是否充足；

* 模型名称是否填写为 `gpt-image-2`；

* 网络是否能够正常访问 API 地址。
