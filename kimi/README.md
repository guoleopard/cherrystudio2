# AI Chat Client

一个仿照 Cherry Studio 的 Electron 桌面大模型会话客户端，支持多种大语言模型的本地运行和配置。

## 功能特性

### 🎯 核心功能
- **多模型支持**: 支持 GPT-3.5 Turbo、GPT-4、GPT-4 Turbo 等多种模型
- **流式响应**: 实时显示 AI 回复，提供更好的用户体验
- **会话管理**: 支持创建新对话、清空对话历史
- **参数配置**: 可自定义模型参数（温度、最大令牌数等）

### ⚙️ 配置功能
- **API 设置**: 支持自定义 API Key 和 API URL
- **模型参数**: 可调整温度、最大令牌数等参数
- **默认模型**: 支持设置默认使用的模型
- **设置持久化**: 配置自动保存到本地

### 🎨 界面特性
- **现代化 UI**: 采用现代化的设计风格，类似 Cherry Studio
- **响应式布局**: 适配不同屏幕尺寸
- **深色主题**: 专业的配色方案
- **流畅动画**: 平滑的过渡效果

### 🔧 技术特性
- **Electron 框架**: 跨平台桌面应用
- **流式 API**: 支持 OpenAI 流式响应
- **本地存储**: 设置和配置本地持久化
- **错误处理**: 完善的错误提示和处理机制

## 项目结构

```
ai-chat-client/
├── main.js              # 主进程文件
├── package.json         # 项目配置
├── renderer/           # 渲染进程文件
│   ├── index.html      # 主界面
│   ├── styles.css      # 样式文件
│   └── script.js       # 交互逻辑
├── assets/             # 资源文件
│   └── icon.png        # 应用图标
└── README.md          # 项目文档
```

## 快速开始

### 环境要求
- Node.js (版本 16 或更高)
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 构建应用
```bash
# 构建所有平台
npm run build

# 仅构建当前平台
npm run dist
```

## 使用说明

### 1. 首次使用配置
1. 启动应用后，点击右下角的"设置"按钮
2. 在 API 设置中输入您的 OpenAI API Key
3. 可以选择修改 API URL（默认为 OpenAI 官方 API）
4. 根据需要调整模型参数
5. 点击"保存设置"

### 2. 开始对话
1. 在主界面选择要使用的模型
2. 在输入框中输入您的问题
3. 按 Enter 或点击发送按钮
4. 等待 AI 回复（支持流式显示）

### 3. 会话管理
- **新对话**: 点击左上角的"新对话"按钮
- **清空对话**: 点击右上角的"清空"按钮
- **快速操作**: 使用欢迎界面的快捷按钮快速开始

### 4. 模型参数说明
- **温度 (Temperature)**: 控制回复的随机性，0-2 之间，值越大越随机
- **最大令牌数 (Max Tokens)**: 限制回复的最大长度
- **模型选择**: 根据需求选择不同的 GPT 模型

## API 配置

### OpenAI API
默认使用 OpenAI 官方 API：
```
API URL: https://api.openai.com/v1/chat/completions
```

### 自定义 API
支持使用兼容 OpenAI API 格式的第三方服务：
- Azure OpenAI
- 其他 OpenAI 兼容服务

### 获取 API Key
1. 访问 [OpenAI 官网](https://platform.openai.com/)
2. 注册账号并创建 API Key
3. 确保账户有足够的额度

## 开发指南

### 添加新模型
1. 在 `renderer/index.html` 的模型选择器中添加新选项
2. 在 `main.js` 的默认设置中添加新模型配置
3. 更新模型参数验证逻辑

### 自定义主题
修改 `renderer/styles.css` 中的颜色变量：
```css
:root {
    --primary-color: #3498db;
    --secondary-color: #2c3e50;
    --background-color: #f5f5f5;
    /* ... 其他颜色变量 */
}
```

### 添加新功能
1. 在 `main.js` 中添加 IPC 处理函数
2. 在 `renderer/script.js` 中添加对应的 UI 逻辑
3. 更新界面样式

## 构建和发布

### 构建命令
```bash
# Windows
npm run build

# macOS
npm run build

# Linux
npm run build
```

### 发布配置
修改 `package.json` 中的 `build` 配置：
```json
{
  "build": {
    "appId": "com.yourcompany.ai-chat-client",
    "productName": "AI Chat Client",
    "directories": {
      "output": "dist"
    }
  }
}
```

## 常见问题

### Q: API Key 无效怎么办？
A: 请检查以下几点：
1. API Key 是否正确复制，没有多余的空格
2. API Key 是否还有可用额度
3. API URL 是否正确配置

### Q: 无法连接到 API 怎么办？
A: 可能的解决方案：
1. 检查网络连接
2. 确认 API URL 是否正确
3. 检查防火墙设置
4. 尝试使用代理

### Q: 回复速度很慢怎么办？
A: 可以尝试：
1. 选择更快的模型（如 GPT-3.5 Turbo）
2. 降低 max_tokens 参数
3. 检查网络连接质量

### Q: 如何更新到最新版本？
A: 下载最新版本的安装包，重新安装即可，设置会自动保留。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 Issue
- 描述清楚遇到的问题
- 提供复现步骤
- 注明操作系统和版本

### 提交代码
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎯 支持 GPT-3.5 Turbo、GPT-4 等模型
- ⚙️ 完整的设置和配置系统
- 🎨 现代化 UI 界面
- 🔧 流式响应支持

## 联系方式

如有问题或建议，欢迎通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至: your-email@example.com

---

**享受使用 AI Chat Client！** 🚀