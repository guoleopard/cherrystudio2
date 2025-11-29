const { ipcRenderer, app } = require('electron');
const fs = require('fs');
const path = require('path');

// DOM元素
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const modelInput = document.getElementById('model-input');
const apiKeyInput = document.getElementById('api-key');
const apiUrlInput = document.getElementById('api-url');
const temperatureInput = document.getElementById('temperature');
const maxTokensInput = document.getElementById('max-tokens');

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 加载设置
function loadSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    modelInput.value = settings.model || 'gpt-3.5-turbo';
    apiKeyInput.value = settings.apiKey || '';
    apiUrlInput.value = settings.apiUrl || 'https://api.openai.com/v1';
    temperatureInput.value = settings.temperature || 0.7;
    maxTokensInput.value = settings.maxTokens || 1024;
  } catch (err) {
    // 如果设置文件不存在，使用默认值
    saveSettings();
  }
}

// 保存设置
function saveSettings() {
  const settings = {
    model: modelInput.value,
    apiKey: apiKeyInput.value,
    apiUrl: apiUrlInput.value,
    temperature: parseFloat(temperatureInput.value),
    maxTokens: parseInt(maxTokensInput.value)
  };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

// 发送消息
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  // 添加用户消息到界面
  addMessage('user', message);
  messageInput.value = '';

  // 获取当前设置
  const settings = {
    model: modelInput.value,
    apiKey: apiKeyInput.value,
    apiUrl: apiUrlInput.value,
    temperature: parseFloat(temperatureInput.value),
    maxTokens: parseInt(maxTokensInput.value)
  };

  // 保存设置
  saveSettings();

  // 向主进程发送消息
  ipcRenderer.send('send-message', { message, settings });
}

// 添加消息到界面
function addMessage(sender, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  messageElement.textContent = content;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 监听主进程的回复
ipcRenderer.on('message-reply', (event, content) => {
  addMessage('assistant', content);
});

// 监听输入框的回车事件
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// 监听发送按钮的点击事件
sendButton.addEventListener('click', sendMessage);

// 加载设置
loadSettings();
