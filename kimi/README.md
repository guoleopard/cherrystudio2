# Cherry Studio 模型管理系统

## 项目概述

这是一个基于 Electron 框架的仿 Cherry Studio 桌面应用，现已实现完整的模型管理功能。应用支持多厂商 AI 模型集成，提供直观的模型管理和切换界面。

## 主要功能

### ✅ 已完成的功能

1. **模型管理系统**
   - 添加、编辑、删除模型
   - 支持多种模型厂商（OpenAI、Anthropic、Google、Azure、HuggingFace、自定义）
   - 模型连接状态检测
   - 模型参数配置（温度、最大令牌数等）

2. **会话界面**
   - 模型切换下拉选择器
   - 实时模型状态显示
   - 智能错误处理

3. **多厂商 API 支持**
   - OpenAI GPT 系列
   - Anthropic Claude 系列
   - Google Gemini 系列
   - Azure OpenAI
   - Hugging Face
   - 自定义 API 接口

4. **用户体验**
   - 现代化的界面设计
   - 响应式布局
   - 加载状态指示
   - 错误提示和处理

### 🎯 技术特点

- **Electron 架构**：主进程 + 渲染进程分离
- **IPC 通信**：安全的进程间通信
- **本地数据存储**：JSON 文件存储配置和模型数据
- **模块化设计**：清晰的代码结构和功能分离
- **错误处理**：完善的异常捕获和用户提示

## 文件结构

```
kimi/
├── main.js                 # 主进程代码
├── package.json           # 项目配置
├── renderer/
│   ├── index.html        # 主界面
│   ├── script.js         # 渲染进程逻辑
│   └── styles.css        # 样式文件
├── test_models.md        # 测试指南
└── demo_models.json      # 演示数据
```

## 使用指南

### 1. 安装和运行

```bash
npm install
npm start
```

### 2. 添加模型

1. 点击侧边栏底部的"模型管理"按钮
2. 点击"添加模型"按钮
3. 选择厂商并填写模型信息
4. 保存模型配置

### 3. 测试模型

1. 在模型列表中点击"测试"按钮
2. 查看连接状态（在线/离线）
3. 如果离线，检查 API 密钥和网络连接

### 4. 使用模型聊天

1. 在主界面选择要使用的模型
2. 输入消息并发送
3. 系统会自动使用选中的模型进行回复

## 配置说明

### 模型配置参数

- **厂商**：选择 AI 模型提供商
- **模型名称**：具体的模型版本
- **API Key**：访问模型的密钥
- **API 地址**：自定义 API 端点（可选）
- **最大令牌数**：回复的最大长度
- **温度**：生成回复的随机性（0-1）
- **启用状态**：是否可用该模型

### 支持的模型

#### OpenAI
- gpt-3.5-turbo
- gpt-4
- gpt-4-turbo
- 其他 GPT 系列模型

#### Anthropic
- claude-3-haiku-20240307
- claude-3-sonnet-20240229
- claude-3-opus-20240229

#### Google
- gemini-pro
- gemini-pro-vision

#### Azure OpenAI
- 支持所有 Azure OpenAI 模型

#### Hugging Face
- 支持 Hugging Face 推理 API

#### 自定义
- 支持任何兼容 OpenAI API 格式的模型

## 开发说明

### IPC 通信接口

#### 主进程处理
- `get-models`：获取模型列表
- `save-models`：保存模型配置
- `test-model`：测试模型连接
- `ai-request`：发送 AI 请求

#### 错误处理
- 网络错误
- API 认证错误
- 模型不存在错误
- 参数验证错误

### 扩展开发

#### 添加新厂商
1. 在 `main.js` 中添加新的 API 调用函数
2. 在模型测试逻辑中添加对应的测试方法
3. 更新厂商名称映射

#### 自定义界面
- 修改 `renderer/styles.css` 调整样式
- 修改 `renderer/index.html` 调整界面结构
- 修改 `renderer/script.js` 调整交互逻辑

## 注意事项

1. **API 密钥安全**：密钥存储在本地，请妥善保管
2. **网络要求**：需要能够访问对应的 API 服务
3. **模型限制**：不同模型有不同的使用限制和定价
4. **错误处理**：完善的错误提示帮助快速定位问题

## 后续计划

- [ ] 聊天记录保存和导出
- [ ] 多语言支持
- [ ] 主题切换（深色/浅色）
- [ ] 高级参数配置
- [ ] 批量模型测试
- [ ] 模型性能对比

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT License