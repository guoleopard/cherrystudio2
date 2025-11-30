const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// DOM元素
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const sessionList = document.getElementById('session-list');
const newSessionButton = document.getElementById('new-session-button');
const exportSessionsButton = document.getElementById('export-sessions-button');
const importSessionsButton = document.getElementById('import-sessions-button');
const importFileInput = document.getElementById('import-file-input');
// 模型管理DOM元素
const modelList = document.getElementById('model-list');
const addModelButton = document.getElementById('add-model-button');
const modelSettingContainer = document.getElementById('model-setting-container');
const modelSettingTitle = document.getElementById('model-setting-title');
const modelIdInput = document.getElementById('model-id-input');
const modelNameInput = document.getElementById('model-name-input');
const modelProviderInput = document.getElementById('model-provider-input');
const modelApiKeyInput = document.getElementById('model-api-key');
const modelApiUrlInput = document.getElementById('model-api-url');
const modelTemperatureInput = document.getElementById('model-temperature');
const modelTopPInput = document.getElementById('model-top-p');
const modelFrequencyPenaltyInput = document.getElementById('model-frequency-penalty');
const modelPresencePenaltyInput = document.getElementById('model-presence-penalty');
const modelMaxTokensInput = document.getElementById('model-max-tokens');
const saveModelButton = document.getElementById('save-model-button');
const testModelButton = document.getElementById('test-model-button');
const deleteModelButton = document.getElementById('delete-model-button');
const modelSelector = document.getElementById('model-selector');

// 设置文件路径
let settingsPath, sessionsPath;

// 请求用户数据路径
ipcRenderer.send('get-user-data-path');

// 接收用户数据路径
ipcRenderer.on('user-data-path-reply', (event, userDataPath) => {
  settingsPath = path.join(userDataPath, 'settings.json');
  sessionsPath = path.join(userDataPath, 'sessions.json');
  // 加载设置和会话
  loadSettings();
  loadSessionsData();
});

// 当前会话
let currentSessionId = null;
// 当前选中的模型
let currentModelId = null;
// 所有模型配置
let allModels = [];

// 加载设置
function loadSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    // 支持旧的设置格式
    if (settings.model) {
      // 转换为新的多模型格式
      allModels = [{
        id: 'default',
        name: settings.model,
        provider: 'OpenAI',
        apiKey: settings.apiKey,
        apiUrl: settings.apiUrl,
        temperature: settings.temperature,
        topP: settings.topP,
        frequencyPenalty: settings.frequencyPenalty,
        presencePenalty: settings.presencePenalty,
        maxTokens: settings.maxTokens
      }];
      currentModelId = 'default';
    } else {
      // 新的多模型格式
      allModels = settings.models || [];
      currentModelId = settings.currentModelId || (allModels.length > 0 ? allModels[0].id : null);
    }
    
    // 应用主题设置
    const themeToggle = document.getElementById('theme-toggle');
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-theme');
      if (themeToggle) themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('dark-theme');
      if (themeToggle) themeToggle.textContent = '🌙';
    }
    
    // 更新模型列表UI
    updateModelListUI();
    // 加载当前模型的设置
    loadCurrentModelSettings();
  } catch (err) {
    // 如果设置文件不存在，使用默认值
    allModels = [{
      id: 'default',
      name: 'gpt-3.5-turbo',
      provider: 'OpenAI',
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1',
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      maxTokens: 1024
    }];
    currentModelId = 'default';
    saveSettings();
  }
}

// 保存设置
function saveSettings() {
  const settings = {
    models: allModels,
    currentModelId: currentModelId,
    theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light'
  };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

// 更新模型列表UI
function updateModelListUI() {
  modelList.innerHTML = '';
  allModels.forEach(model => {
    const modelItem = document.createElement('div');
    modelItem.className = `model-item ${model.id === currentModelId ? 'active' : ''}`;
    modelItem.dataset.id = model.id;
    
    const modelInfo = document.createElement('div');
    modelInfo.innerHTML = `<strong>${model.name}</strong><br><small>${model.provider}</small>`;
    
    modelItem.appendChild(modelInfo);
    modelItem.addEventListener('click', () => selectModel(model.id));
    modelList.appendChild(modelItem);
  });
}

// 更新模型选择器UI
function updateModelSelectorUI() {
  modelSelector.innerHTML = '';
  allModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.provider} - ${model.name}`;
    if (model.id === currentModelId) {
      option.selected = true;
    }
    modelSelector.appendChild(option);
  });
}

// 加载当前模型的设置
function loadCurrentModelSettings() {
  const model = allModels.find(m => m.id === currentModelId);
  if (model) {
    modelIdInput.value = model.id;
    modelNameInput.value = model.name;
    modelProviderInput.value = model.provider;
    modelApiKeyInput.value = model.apiKey;
    modelApiUrlInput.value = model.apiUrl;
    modelTemperatureInput.value = model.temperature;
    modelTopPInput.value = model.topP;
    modelFrequencyPenaltyInput.value = model.frequencyPenalty;
    modelPresencePenaltyInput.value = model.presencePenalty;
    modelMaxTokensInput.value = model.maxTokens;
    
    modelSettingTitle.textContent = `${model.provider} - ${model.name}`;
    // 显示保存、测试、删除按钮
    saveModelButton.style.display = 'block';
    testModelButton.style.display = 'block';
    deleteModelButton.style.display = 'block';
  } else {
    // 没有选中的模型，清空表单
    clearModelForm();
    modelSettingTitle.textContent = '模型设置';
    // 只显示保存按钮
    saveModelButton.style.display = 'block';
    testModelButton.style.display = 'none';
    deleteModelButton.style.display = 'none';
  }
}

// 清空模型表单
function clearModelForm() {
  modelIdInput.value = '';
  modelNameInput.value = '';
  modelProviderInput.value = '';
  modelApiKeyInput.value = '';
  modelApiUrlInput.value = 'https://api.openai.com/v1';
  modelTemperatureInput.value = 0.7;
  modelTopPInput.value = 1.0;
  modelFrequencyPenaltyInput.value = 0.0;
  modelPresencePenaltyInput.value = 0.0;
  modelMaxTokensInput.value = 1024;
}

// 添加新模型
function addNewModel() {
  clearModelForm();
  modelSettingTitle.textContent = '添加新模型';
  // 只显示保存按钮
  saveModelButton.style.display = 'block';
  testModelButton.style.display = 'none';
  deleteModelButton.style.display = 'none';
}

// 保存模型
function saveModel() {
  const modelId = modelIdInput.value;
  const modelData = {
    name: modelNameInput.value,
    provider: modelProviderInput.value,
    apiKey: modelApiKeyInput.value,
    apiUrl: modelApiUrlInput.value,
    temperature: parseFloat(modelTemperatureInput.value),
    topP: parseFloat(modelTopPInput.value),
    frequencyPenalty: parseFloat(modelFrequencyPenaltyInput.value),
    presencePenalty: parseFloat(modelPresencePenaltyInput.value),
    maxTokens: parseInt(modelMaxTokensInput.value)
  };
  
  if (modelId) {
    // 更新现有模型
    const index = allModels.findIndex(m => m.id === modelId);
    if (index !== -1) {
      allModels[index] = { ...allModels[index], ...modelData };
    }
  } else {
    // 创建新模型
    const newModel = {
      id: Date.now().toString(),
      ...modelData
    };
    allModels.push(newModel);
    currentModelId = newModel.id;
  }
  
  saveSettings();
  updateModelListUI();
  loadCurrentModelSettings();
  alert('模型保存成功！');
}

// 删除模型
function deleteModel() {
  const modelId = modelIdInput.value;
  if (!modelId) return;
  
  if (confirm('确定要删除这个模型吗？')) {
    allModels = allModels.filter(m => m.id !== modelId);
    if (currentModelId === modelId) {
      currentModelId = allModels.length > 0 ? allModels[0].id : null;
    }
    saveSettings();
    updateModelListUI();
    loadCurrentModelSettings();
    alert('模型删除成功！');
  }
}

// 测试模型
function testModel() {
  const model = {
    name: modelNameInput.value,
    provider: modelProviderInput.value,
    apiKey: modelApiKeyInput.value,
    apiUrl: modelApiUrlInput.value,
    temperature: parseFloat(modelTemperatureInput.value),
    topP: parseFloat(modelTopPInput.value),
    frequencyPenalty: parseFloat(modelFrequencyPenaltyInput.value),
    presencePenalty: parseFloat(modelPresencePenaltyInput.value),
    maxTokens: parseInt(modelMaxTokensInput.value)
  };
  
  if (!model.name || !model.apiKey || !model.apiUrl) {
    alert('请填写模型名称、API Key和API地址！');
    return;
  }
  
  testModelButton.textContent = '测试中...';
  testModelButton.disabled = true;
  
  // 向主进程发送测试请求
  ipcRenderer.send('test-model', model);
}

// 选择模型
function selectModel(modelId) {
  currentModelId = modelId;
  saveSettings();
  updateModelListUI();
  updateModelSelectorUI();
  loadCurrentModelSettings();
}

// 获取当前选中的模型
function getCurrentModel() {
  return allModels.find(m => m.id === currentModelId);
}

// 加载会话
function loadSessions() {
  try {
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    sessionList.innerHTML = '';
    sessions.forEach(session => {
      addSessionToUI(session);
    });
    // 如果没有会话，创建一个新会话
    if (sessions.length === 0) {
      createNewSession();
    } else {
      // 切换到第一个会话
      switchSession(sessions[0].id);
    }
  } catch (err) {
    // 如果会话文件不存在，创建一个新会话
    createNewSession();
  }
}

// 保存会话
function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

// 创建新会话
function createNewSession() {
  const sessions = loadSessionsData();
  const newSession = {
    id: Date.now().toString(),
    title: '新会话',
    messages: [],
    createdAt: new Date().toISOString()
  };
  sessions.push(newSession);
  saveSessions(sessions);
  // 更新UI
  addSessionToUI(newSession);
  // 切换到新会话
  switchSession(newSession.id);
}

// 加载会话数据
function loadSessionsData() {
  try {
    return JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
  } catch (err) {
    return [];
  }
}

// 添加会话到UI
function addSessionToUI(session) {
  const sessionItem = document.createElement('div');
  sessionItem.className = 'session-item';
  sessionItem.dataset.id = session.id;
  
  const sessionTitle = document.createElement('span');
  sessionTitle.textContent = session.title;
  sessionTitle.className = 'session-title';
  
  const sessionActions = document.createElement('div');
  sessionActions.className = 'session-actions';
  
  const renameButton = document.createElement('button');
  renameButton.className = 'session-action-button';
  renameButton.textContent = '✏️';
  renameButton.title = '重命名会话';
  renameButton.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡到会话项
    renameSession(session.id);
  });
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'session-action-button';
  deleteButton.textContent = '🗑️';
  deleteButton.title = '删除会话';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡到会话项
    deleteSession(session.id);
  });
  
  sessionActions.appendChild(renameButton);
  sessionActions.appendChild(deleteButton);
  
  sessionItem.appendChild(sessionTitle);
  sessionItem.appendChild(sessionActions);
  
  sessionItem.addEventListener('click', () => switchSession(session.id));
  sessionList.appendChild(sessionItem);
}

// 切换会话
function switchSession(sessionId) {
  // 保存当前会话的消息
  if (currentSessionId) {
    saveCurrentSessionMessages();
  }
  // 更新当前会话ID
  currentSessionId = sessionId;
  // 清除消息容器
  messagesContainer.innerHTML = '';
  // 加载新会话的消息
  const sessions = loadSessionsData();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.messages.forEach(message => {
      addMessage(message.sender, message.content);
    });
    // 更新会话标题
    updateSessionTitle(sessionId);
  }
  // 更新会话列表的选中状态
  updateSessionListSelection(sessionId);
}

// 保存当前会话的消息
function saveCurrentSessionMessages() {
  const sessions = loadSessionsData();
  const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
  if (sessionIndex !== -1) {
    const messages = Array.from(messagesContainer.children).map(element => {
      return {
        sender: element.classList.contains('user-message') ? 'user' : 'assistant',
        content: element.textContent
      };
    });
    sessions[sessionIndex].messages = messages;
    saveSessions(sessions);
  }
}

// 重命名会话
function renameSession(sessionId) {
  const sessions = loadSessionsData();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    const session = sessions[sessionIndex];
    const newTitle = prompt('请输入新的会话标题:', session.title);
    if (newTitle && newTitle.trim() !== '') {
      session.title = newTitle.trim();
      saveSessions(sessions);
      // 更新UI
      const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
      if (sessionItem) {
        const sessionTitle = sessionItem.querySelector('.session-title');
        if (sessionTitle) {
          sessionTitle.textContent = session.title;
        }
      }
    }
  }
}

// 删除会话
function deleteSession(sessionId) {
  if (confirm('确定要删除这个会话吗？')) {
    const sessions = loadSessionsData();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
    
    // 如果删除的是当前会话，切换到第一个会话
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        switchSession(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
    
    // 更新UI
    const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
    if (sessionItem) {
      sessionItem.remove();
    }
  }
}

// 导出所有会话
function exportSessions() {
  const sessions = loadSessionsData();
  const dataStr = JSON.stringify(sessions, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cherrystudio_sessions_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// 导入会话
function importSessions() {
  importFileInput.click();
}

// 处理文件导入
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedSessions = JSON.parse(e.target.result);
      if (Array.isArray(importedSessions)) {
        const existingSessions = loadSessionsData();
        // 合并会话，避免重复ID
        const mergedSessions = [...existingSessions];
        
        importedSessions.forEach(session => {
          // 检查ID是否已存在
          const exists = existingSessions.some(s => s.id === session.id);
          if (!exists) {
            mergedSessions.push(session);
          }
        });
        
        saveSessions(mergedSessions);
        
        // 重新加载会话
        loadSessions();
        
        alert('会话导入成功！');
      } else {
        throw new Error('导入的文件格式不正确');
      }
    } catch (err) {
      alert(`导入失败: ${err.message}`);
    }
    // 重置文件输入
    importFileInput.value = '';
  };
  reader.readAsText(file);
}

// 更新会话标题
function updateSessionTitle(sessionId) {
  const sessions = loadSessionsData();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    const session = sessions[sessionIndex];
    // 如果有用户消息，用第一条用户消息作为标题
    if (session.messages.length > 0) {
      const userMessage = session.messages.find(m => m.sender === 'user');
      if (userMessage) {
        session.title = userMessage.content.substring(0, 20) + '...';
      }
    }
    saveSessions(sessions);
    // 更新UI
    const sessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
    if (sessionItem) {
      const sessionTitle = sessionItem.querySelector('.session-title');
      if (sessionTitle) {
        sessionTitle.textContent = session.title;
      }
    }
  }
}

// 更新会话列表的选中状态
function updateSessionListSelection(sessionId) {
  // 移除所有选中状态
  document.querySelectorAll('.session-item').forEach(item => {
    item.classList.remove('active');
  });
  // 添加当前会话的选中状态
  const currentSessionItem = document.querySelector(`.session-item[data-id="${sessionId}"]`);
  if (currentSessionItem) {
    currentSessionItem.classList.add('active');
  }
}

// 发送消息
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  // 添加用户消息到界面
  addMessage('user', message);
  messageInput.value = '';

  // 获取当前模型
  const currentModel = getCurrentModel();
  if (!currentModel) {
    alert('请先选择一个模型！');
    return;
  }

  // 向主进程发送消息
  ipcRenderer.send('send-message', { message, model: currentModel });
}

// 格式化消息内容，支持代码块和链接
function formatMessageContent(content) {
  // 替换链接为可点击的a标签
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  content = content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
  
  // 处理代码块，使用三个反引号
  const codeBlockRegex = /```([\s\S]*?)```/g;
  content = content.replace(codeBlockRegex, '<div class="code-block"><pre><code>$1</code></pre></div>');
  
  // 处理行内代码，使用单个反引号
  const inlineCodeRegex = /`([^`]+)`/g;
  content = content.replace(inlineCodeRegex, '<span class="inline-code">$1</span>');
  
  // 替换换行符为br标签
  content = content.replace(/\n/g, '<br>');
  
  return content;
}

// 添加消息到界面
function addMessage(sender, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  messageElement.innerHTML = formatMessageContent(content);
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  // 如果有当前会话，更新会话标题
  if (currentSessionId) {
    updateSessionTitle(currentSessionId);
  }
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

// 监听设置按钮的点击事件
settingsButton.addEventListener('click', () => {
  settingsModal.style.display = settingsModal.style.display === 'block' ? 'none' : 'block';
});

// 监听添加模型按钮的点击事件
addModelButton.addEventListener('click', addNewModel);

// 监听保存模型按钮的点击事件
saveModelButton.addEventListener('click', saveModel);

// 模型选择器改变事件监听
modelSelector.addEventListener('change', (e) => {
  selectModel(e.target.value);
});

// 监听测试模型按钮的点击事件
testModelButton.addEventListener('click', testModel);

// 监听删除模型按钮的点击事件
deleteModelButton.addEventListener('click', deleteModel);

// 监听模型测试结果
ipcRenderer.on('test-model-result', (event, result) => {
  testModelButton.textContent = '测试模型';
  testModelButton.disabled = false;
  
  if (result.success) {
    alert('模型测试成功！');
  } else {
    alert(`模型测试失败: ${result.error}`);
  }
});

// 监听点击设置模态框外部关闭模态框
document.addEventListener('click', (e) => {
  if (e.target === settingsButton) return;
  if (!settingsModal.contains(e.target) && settingsModal.style.display === 'block') {
    settingsModal.style.display = 'none';
  }
});

// 监听主题切换按钮的点击事件
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    themeToggle.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    saveSettings(); // 保存主题设置
  });
}

// 监听新建会话按钮的点击事件
newSessionButton.addEventListener('click', createNewSession);

// 监听导出会话按钮的点击事件
exportSessionsButton.addEventListener('click', exportSessions);

// 监听导入会话按钮的点击事件
importSessionsButton.addEventListener('click', importSessions);

// 监听文件导入事件
importFileInput.addEventListener('change', handleFileImport);

