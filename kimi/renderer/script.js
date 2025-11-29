const { ipcRenderer } = require('electron');

// 全局变量
let settings = {};
let currentChat = [];
let isGenerating = false;
let abortController = null;

// DOM 元素
const elements = {
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    stopBtn: document.getElementById('stop-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    messagesContainer: document.getElementById('messages-container'),
    modelSelect: document.getElementById('model-select'),
    inputCounter: document.getElementById('input-counter'),
    loadingOverlay: document.getElementById('loading-overlay'),
    
    // 设置相关
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings'),
    
    // 设置表单元素
    apiKey: document.getElementById('api-key'),
    apiUrl: document.getElementById('api-url'),
    defaultModel: document.getElementById('default-model'),
    maxTokens: document.getElementById('max-tokens'),
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temperature-value'),
    
    // 快速操作
    quickActionBtns: document.querySelectorAll('.quick-action-btn'),
    
    // 新对话
    newChatBtn: document.getElementById('new-chat-btn')
};

// 初始化应用
async function initApp() {
    try {
        // 加载设置
        settings = await ipcRenderer.invoke('get-settings');
        updateSettingsUI();
        
        // 绑定事件
        bindEvents();
        
        // 更新应用信息
        updateAppInfo();
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        showError('初始化失败', error.message);
    }
}

// 绑定事件
function bindEvents() {
    // 消息输入
    elements.messageInput.addEventListener('input', handleInputChange);
    elements.messageInput.addEventListener('keydown', handleInputKeydown);
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.stopBtn.addEventListener('click', stopGeneration);
    elements.clearChatBtn.addEventListener('click', clearChat);
    
    // 模型选择器
    if (elements.modelSelect) {
        elements.modelSelect.addEventListener('input', handleModelChange);
        
        // 模型输入框失去焦点时保存设置
        elements.modelSelect.addEventListener('blur', (e) => {
            const modelName = e.target.value.trim();
            if (modelName && modelName !== settings.model) {
                settings.model = modelName;
                saveSettings();
                // 同步更新设置页面的模型输入框
                if (elements.defaultModel) {
                    elements.defaultModel.value = modelName;
                }
            }
        });
    }
    
    // 设置
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.saveSettings.addEventListener('click', saveSettingsHandler);
    elements.resetSettings.addEventListener('click', resetSettingsHandler);
    
    // 温度滑块
    elements.temperature.addEventListener('input', updateTemperatureDisplay);
    
    // 默认模型输入框事件
    if (elements.defaultModel) {
        elements.defaultModel.addEventListener('input', (e) => {
            const modelName = e.target.value.trim();
            if (modelName) {
                settings.model = modelName;
                saveSettings();
                // 同步更新主界面模型选择器
                if (elements.modelSelect) {
                    elements.modelSelect.value = modelName;
                }
            }
        });
        
        // 默认模型输入框失去焦点时保存设置
        elements.defaultModel.addEventListener('blur', (e) => {
            const modelName = e.target.value.trim();
            if (modelName && modelName !== settings.model) {
                settings.model = modelName;
                saveSettings();
                if (elements.modelSelect) {
                    elements.modelSelect.value = modelName;
                }
            }
        });
    }
    
    // 快速操作
    elements.quickActionBtns.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    
    // 新对话
    elements.newChatBtn.addEventListener('click', createNewChat);
    
    // 点击模态框外部关闭
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            closeSettings();
        }
    });
}

// 处理输入变化
function handleInputChange() {
    const text = elements.messageInput.value;
    const length = text.length;
    const maxLength = 4000;
    
    elements.inputCounter.textContent = `${length}/${maxLength}`;
    
    if (length > maxLength) {
        elements.inputCounter.style.color = '#e74c3c';
        elements.sendBtn.disabled = true;
    } else {
        elements.inputCounter.style.color = '#999';
        elements.sendBtn.disabled = false;
    }
    
    // 自动调整高度
    autoResizeTextarea();
}

// 处理输入键盘事件
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!elements.sendBtn.disabled) {
            sendMessage();
        }
    }
}

// 自动调整文本框高度
function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 120);
    textarea.style.height = newHeight + 'px';
}

// 发送消息
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || isGenerating) return;
    
    if (!settings.apiKey) {
        showError('配置错误', '请先配置 API Key');
        openSettings();
        return;
    }
    
    // 添加用户消息
    addMessage('user', message);
    elements.messageInput.value = '';
    handleInputChange();
    
    // 显示加载状态
    showLoading(true);
    
    try {
        await generateResponse(message);
    } catch (error) {
        console.error('生成回复失败:', error);
        showError('生成失败', error.message);
        addMessage('assistant', '抱歉，我遇到了一些问题。请检查您的网络连接和 API 配置。');
    } finally {
        showLoading(false);
    }
}

// 生成回复
async function generateResponse(message) {
    isGenerating = true;
    elements.sendBtn.disabled = true;
    elements.stopBtn.disabled = false;
    
    // 创建 AbortController 用于中断请求
    abortController = new AbortController();
    
    // 构建消息历史
    const messages = [
        ...currentChat.map(msg => ({
            role: msg.type,
            content: msg.content
        })),
        { role: 'user', content: message }
    ];
    
    // 创建助手的消息容器
    const assistantMessage = addMessage('assistant', '');
    
    try {
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: elements.modelSelect ? elements.modelSelect.value.trim() : settings.model || 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: parseInt(settings.maxTokens),
                temperature: parseFloat(settings.temperature),
                top_p: settings.topP,
                frequency_penalty: settings.frequencyPenalty,
                presence_penalty: settings.presencePenalty,
                stream: true
            }),
            signal: abortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        while (true) {
            if (abortController.signal.aborted) {
                break;
            }
            
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices[0]?.delta?.content;
                        if (delta) {
                            fullContent += delta;
                            updateMessageContent(assistantMessage, fullContent);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
        
        // 更新当前聊天
        currentChat.push(
            { type: 'user', content: message, timestamp: new Date() },
            { type: 'assistant', content: fullContent, timestamp: new Date() }
        );
        
    } catch (error) {
        if (error.name === 'AbortError') {
            updateMessageContent(assistantMessage, assistantMessage.querySelector('.message-content').textContent + ' [已中断]');
        } else {
            throw error;
        }
    } finally {
        isGenerating = false;
        elements.sendBtn.disabled = false;
        elements.stopBtn.disabled = true;
        abortController = null;
    }
}

// 停止生成
function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
}

// 添加消息
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    bubbleDiv.appendChild(contentDiv);
    messageDiv.appendChild(bubbleDiv);
    
    // 添加时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    messageDiv.appendChild(timeDiv);
    
    // 移除欢迎消息
    const welcomeMessage = elements.messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// 更新消息内容
function updateMessageContent(messageElement, content) {
    const contentDiv = messageElement.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.textContent = content;
        scrollToBottom();
    }
}

// 滚动到底部
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// 清空聊天
function clearChat() {
    if (currentChat.length === 0) return;
    
    ipcRenderer.invoke('show-message', {
        type: 'question',
        title: '确认清空',
        message: '确定要清空当前对话吗？',
        buttons: ['取消', '确定']
    }).then(result => {
        if (result.response === 1) {
            currentChat = [];
            elements.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <h3>欢迎使用 AI Chat Client</h3>
                    <p>请在下方输入您的问题，我将为您提供帮助。</p>
                    <div class="quick-actions">
                        <button class="quick-action-btn" data-prompt="请介绍一下你自己">请介绍一下你自己</button>
                        <button class="quick-action-btn" data-prompt="今天天气怎么样？">今天天气怎么样？</button>
                        <button class="quick-action-btn" data-prompt="帮我写一段代码">帮我写一段代码</button>
                    </div>
                </div>
            `;
            
            // 重新绑定快速操作事件
            elements.quickActionBtns = document.querySelectorAll('.quick-action-btn');
            elements.quickActionBtns.forEach(btn => {
                btn.addEventListener('click', handleQuickAction);
            });
        }
    });
}

// 处理模型变化
function handleModelChange() {
    if (elements.modelSelect) {
        const modelName = elements.modelSelect.value.trim();
        if (modelName) {
            console.log('模型切换到:', modelName);
            // 可以在这里添加模型验证逻辑
        }
    }
}

// 处理快速操作
function handleQuickAction(e) {
    const prompt = e.target.dataset.prompt;
    elements.messageInput.value = prompt;
    handleInputChange();
    sendMessage();
}

// 创建新对话
function createNewChat() {
    clearChat();
}

// 显示/隐藏加载状态
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 打开设置
async function openSettings() {
    elements.settingsModal.style.display = 'block';
    
    // 重新加载设置
    settings = await ipcRenderer.invoke('get-settings');
    updateSettingsUI();
}

// 关闭设置
function closeSettings() {
    elements.settingsModal.style.display = 'none';
}

// 更新设置 UI
function updateSettingsUI() {
    elements.apiKey.value = settings.apiKey || '';
    elements.apiUrl.value = settings.apiUrl || '';
    elements.defaultModel.value = settings.model || 'gpt-3.5-turbo';
    elements.maxTokens.value = settings.maxTokens || 2048;
    elements.temperature.value = settings.temperature || 0.7;
    
    // 更新模型选择器
    if (elements.modelSelect) {
        elements.modelSelect.value = settings.model || 'gpt-3.5-turbo';
    }
    
    // 如果默认模型输入框存在，也更新它
    if (elements.defaultModel) {
        elements.defaultModel.value = settings.model || 'gpt-3.5-turbo';
    }
    
    updateTemperatureDisplay();
}

// 更新温度显示
function updateTemperatureDisplay() {
    elements.temperatureValue.textContent = elements.temperature.value;
}

// 保存设置
async function saveSettingsHandler() {
    const newSettings = {
        apiKey: elements.apiKey.value.trim(),
        apiUrl: elements.apiUrl.value.trim(),
        model: elements.defaultModel.value,
        maxTokens: parseInt(elements.maxTokens.value),
        temperature: parseFloat(elements.temperature.value)
    };
    
    try {
        settings = await ipcRenderer.invoke('save-settings', newSettings);
        closeSettings();
        showSuccess('设置已保存');
    } catch (error) {
        console.error('保存设置失败:', error);
        showError('保存失败', error.message);
    }
}

// 重置设置
async function resetSettingsHandler() {
    const result = await ipcRenderer.invoke('show-message', {
        type: 'question',
        title: '确认重置',
        message: '确定要重置所有设置为默认值吗？',
        buttons: ['取消', '确定']
    });
    
    if (result.response === 1) {
        try {
            settings = await ipcRenderer.invoke('reset-settings');
            updateSettingsUI();
            showSuccess('设置已重置为默认值');
        } catch (error) {
            console.error('重置设置失败:', error);
            showError('重置失败', error.message);
        }
    }
}

// 更新应用信息
async function updateAppInfo() {
    try {
        const appInfo = await ipcRenderer.invoke('get-app-info');
        document.getElementById('app-name').textContent = appInfo.name;
        document.getElementById('app-version').textContent = appInfo.version;
        document.getElementById('electron-version').textContent = appInfo.electronVersion;
        document.getElementById('node-version').textContent = appInfo.nodeVersion;
    } catch (error) {
        console.error('获取应用信息失败:', error);
    }
}

// 显示错误
function showError(title, content) {
    ipcRenderer.invoke('show-error', title, content);
}

// 显示成功消息
function showSuccess(message) {
    // 可以在这里添加成功提示
    console.log('成功:', message);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);