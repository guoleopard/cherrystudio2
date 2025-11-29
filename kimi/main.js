const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 禁用 GPU 加速以避免某些系统上的兼容性问题
app.disableHardwareAcceleration();

let mainWindow;
let settings = {};

// 默认设置
const defaultSettings = {
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-3.5-turbo',
  maxTokens: 2048,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  models: [] // 模型列表
};

// 创建设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const modelsPath = path.join(app.getPath('userData'), 'models.json');

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...defaultSettings, ...JSON.parse(data) };
    } else {
      settings = { ...defaultSettings };
      saveSettings();
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    settings = { ...defaultSettings };
  }
}

// 保存设置
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发模式
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// 应用准备就绪
app.whenReady().then(() => {
  loadSettings();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 应用关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 通信处理
ipcMain.handle('get-settings', () => {
  return settings;
});

ipcMain.handle('save-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return settings;
});

ipcMain.handle('reset-settings', () => {
  settings = { ...defaultSettings };
  saveSettings();
  return settings;
});

// 获取应用信息
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromiumVersion: process.versions.chrome
  };
});

// 模型管理相关 IPC 处理
ipcMain.handle('get-models', async () => {
  try {
    if (fs.existsSync(modelsPath)) {
      const data = fs.readFileSync(modelsPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('加载模型列表失败:', error);
    return [];
  }
});

ipcMain.handle('save-models', async (event, models) => {
  try {
    fs.writeFileSync(modelsPath, JSON.stringify(models, null, 2));
    return true;
  } catch (error) {
    console.error('保存模型列表失败:', error);
    return false;
  }
});

ipcMain.handle('test-model', async (event, model) => {
  try {
    const axios = require('axios');
    
    let testUrl = model.apiUrl;
    let testHeaders = {
      'Content-Type': 'application/json'
    };
    
    // 根据不同厂商设置不同的认证方式
    switch (model.provider) {
      case 'openai':
        testHeaders['Authorization'] = `Bearer ${model.apiKey}`;
        testUrl = model.apiUrl || 'https://api.openai.com/v1/models';
        break;
      case 'anthropic':
        testHeaders['x-api-key'] = model.apiKey;
        testUrl = model.apiUrl || 'https://api.anthropic.com/v1/models';
        break;
      case 'google':
        testUrl = model.apiUrl || `https://generativelanguage.googleapis.com/v1beta/models?key=${model.apiKey}`;
        break;
      case 'azure':
        testHeaders['api-key'] = model.apiKey;
        break;
      case 'huggingface':
        testHeaders['Authorization'] = `Bearer ${model.apiKey}`;
        testUrl = model.apiUrl || `https://huggingface.co/api/models/${model.name}`;
        break;
      default:
        if (model.apiKey) {
          testHeaders['Authorization'] = `Bearer ${model.apiKey}`;
        }
    }
    
    const response = await axios.get(testUrl, {
      headers: testHeaders,
      timeout: 10000
    });
    
    return {
      success: true,
      status: response.status,
      message: '模型连接成功'
    };
  } catch (error) {
    console.error('模型测试失败:', error);
    return {
      success: false,
      error: error.message,
      message: '模型连接失败: ' + error.message
    };
  }
});

// 显示错误对话框
ipcMain.handle('show-error', (event, title, content) => {
  dialog.showErrorBox(title, content);
});

// 显示信息对话框
ipcMain.handle('show-message', (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

// AI 请求处理
ipcMain.handle('ai-request', async (event, { message, model, apiKey, provider, apiUrl, maxTokens, temperature }) => {
  try {
    let response;
    
    // 根据不同厂商调用不同的API
    switch (provider) {
      case 'openai':
        response = await callOpenAIAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      case 'anthropic':
        response = await callAnthropicAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      case 'google':
        response = await callGoogleAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      case 'azure':
        response = await callAzureAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      case 'huggingface':
        response = await callHuggingFaceAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      case 'custom':
        response = await callCustomAPI(message, model.name, apiKey, apiUrl, maxTokens, temperature);
        break;
      default:
        throw new Error(`不支持的厂商: ${provider}`);
    }
    
    return response;
  } catch (error) {
    console.error('AI 请求失败:', error);
    throw new Error(error.response?.data?.error?.message || error.message || 'AI 请求失败');
  }
});

// OpenAI API 调用
async function callOpenAIAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  const url = apiUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await axios.post(url, {
    model: modelName,
    messages: [
      { role: 'user', content: message }
    ],
    max_tokens: maxTokens || 2048,
    temperature: temperature || 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  return response.data.choices[0].message.content;
}

// Anthropic API 调用
async function callAnthropicAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  const url = apiUrl || 'https://api.anthropic.com/v1/messages';
  
  const response = await axios.post(url, {
    model: modelName,
    max_tokens: maxTokens || 2048,
    messages: [
      { role: 'user', content: message }
    ],
    temperature: temperature || 0.7
  }, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    timeout: 30000
  });
  
  return response.data.content[0].text;
}

// Google API 调用
async function callGoogleAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  const url = apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const response = await axios.post(url, {
    contents: [{
      parts: [{ text: message }]
    }],
    generationConfig: {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    }
  }, {
    headers: {
      'Content-Type': 'application/json'
    },
    params: {
      key: apiKey
    },
    timeout: 30000
  });
  
  return response.data.candidates[0].content.parts[0].text;
}

// Azure OpenAI API 调用
async function callAzureAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  if (!apiUrl) {
    throw new Error('Azure OpenAI 需要指定 API 地址');
  }
  
  const response = await axios.post(apiUrl, {
    messages: [
      { role: 'user', content: message }
    ],
    max_tokens: maxTokens || 2048,
    temperature: temperature || 0.7
  }, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  return response.data.choices[0].message.content;
}

// Hugging Face API 调用
async function callHuggingFaceAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  const url = apiUrl || `https://api-inference.huggingface.co/models/${modelName}`;
  
  const response = await axios.post(url, {
    inputs: message,
    parameters: {
      max_new_tokens: maxTokens || 2048,
      temperature: temperature || 0.7,
      return_full_text: false
    }
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  return response.data[0].generated_text;
}

// 自定义 API 调用
async function callCustomAPI(message, modelName, apiKey, apiUrl, maxTokens, temperature) {
  if (!apiUrl) {
    throw new Error('自定义模型需要指定 API 地址');
  }
  
  // 这里提供一个通用的API调用模板，可以根据实际需求修改
  const response = await axios.post(apiUrl, {
    model: modelName,
    prompt: message,
    max_tokens: maxTokens || 2048,
    temperature: temperature || 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  // 假设响应格式为 { text: "回复内容" } 或 { choices: [{ text: "回复内容" }] }
  return response.data.text || response.data.choices?.[0]?.text || response.data.choices?.[0]?.message?.content || JSON.stringify(response.data);
}