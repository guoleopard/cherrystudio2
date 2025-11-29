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
const topPInput = document.getElementById('top-p');
const frequencyPenaltyInput = document.getElementById('frequency-penalty');
const presencePenaltyInput = document.getElementById('presence-penalty');
const maxTokensInput = document.getElementById('max-tokens');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const sessionList = document.getElementById('session-list');
const newSessionButton = document.getElementById('new-session-button');
const exportSessionsButton = document.getElementById('export-sessions-button');
const importSessionsButton = document.getElementById('import-sessions-button');
const importFileInput = document.getElementById('import-file-input');

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const sessionsPath = path.join(app.getPath('userData'), 'sessions.json');

// 当前会话
let currentSessionId = null;

// 加载设置
function loadSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    modelInput.value = settings.model || 'gpt-3.5-turbo';
    apiKeyInput.value = settings.apiKey || '';
    apiUrlInput.value = settings.apiUrl || 'https://api.openai.com/v1';
    temperatureInput.value = settings.temperature || 0.7;
    topPInput.value = settings.topP || 1.0;
    frequencyPenaltyInput.value = settings.frequencyPenalty || 0.0;
    presencePenaltyInput.value = settings.presencePenalty || 0.0;
    maxTokensInput.value = settings.maxTokens || 1024;
    
    // 应用主题设置
    const themeToggle = document.getElementById('theme-toggle');
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-theme');
      if (themeToggle) themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('dark-theme');
      if (themeToggle) themeToggle.textContent = '🌙';
    }
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
    topP: parseFloat(topPInput.value),
    frequencyPenalty: parseFloat(frequencyPenaltyInput.value),
    presencePenalty: parseFloat(presencePenaltyInput.value),
    maxTokens: parseInt(maxTokensInput.value),
    theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light'
  };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
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

  // 获取当前设置
  const settings = {
    model: modelInput.value,
    apiKey: apiKeyInput.value,
    apiUrl: apiUrlInput.value,
    temperature: parseFloat(temperatureInput.value),
    topP: parseFloat(topPInput.value),
    frequencyPenalty: parseFloat(frequencyPenaltyInput.value),
    presencePenalty: parseFloat(presencePenaltyInput.value),
    maxTokens: parseInt(maxTokensInput.value)
  };

  // 保存设置
  saveSettings();

  // 向主进程发送消息
  ipcRenderer.send('send-message', { message, settings });
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

// 加载设置和会话
loadSettings();
loadSessions();