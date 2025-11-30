const { ipcRenderer } = require('electron');

// 全局变量
let settings = {};
let currentChat = [];
let isGenerating = false;
let abortController = null;
let models = []; // 模型列表

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
    
    // 模型管理相关
    modelsBtn: document.getElementById('models-btn'),
    modelsModal: document.getElementById('models-modal'),
    closeModels: document.getElementById('close-models'),
    addModelBtn: document.getElementById('add-model-btn'),
    refreshModelsBtn: document.getElementById('refresh-models-btn'),
    modelsList: document.getElementById('models-list'),
    
    // 模型编辑相关
    modelEditModal: document.getElementById('model-edit-modal'),
    closeModelEdit: document.getElementById('close-model-edit'),
    modelForm: document.getElementById('model-form'),
    modelEditTitle: document.getElementById('model-edit-title'),
    modelProvider: document.getElementById('model-provider'),
    modelName: document.getElementById('model-name'),
    modelApiKey: document.getElementById('model-api-key'),
    modelApiUrl: document.getElementById('model-api-url'),
    modelMaxTokens: document.getElementById('model-max-tokens'),
    modelTemperature: document.getElementById('model-temperature'),
    modelTemperatureValue: document.getElementById('model-temperature-value'),
    modelEnabled: document.getElementById('model-enabled'),
    testModelBtn: document.getElementById('test-model-btn'),
    saveModelBtn: document.getElementById('save-model-btn'),
    
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
        
        // 加载模型列表
        models = await ipcRenderer.invoke('get-models');
        
        updateSettingsUI();
        updateModelsUI();
        
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
    
    // 模型管理
    elements.modelsBtn.addEventListener('click', openModels);
    elements.closeModels.addEventListener('click', closeModels);
    elements.addModelBtn.addEventListener('click', openAddModel);
    elements.refreshModelsBtn.addEventListener('click', refreshModelsStatus);
    
    // 模型编辑
    elements.closeModelEdit.addEventListener('click', closeModelEdit);
    elements.saveModelBtn.addEventListener('click', saveModelHandler);
    elements.testModelBtn.addEventListener('click', testModelHandler);
    elements.modelTemperature.addEventListener('input', updateModelTemperatureDisplay);
    
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
    
    // 获取选中的模型
    const selectedModelId = elements.modelSelect.value;
    if (!selectedModelId) {
        showError('错误', '请先选择一个模型');
        return;
    }
    
    const selectedModel = models.find(m => m.id === selectedModelId);
    if (!selectedModel) {
        showError('错误', '选中的模型不存在');
        return;
    }
    
    if (!selectedModel.enabled) {
        showError('错误', '选中的模型已禁用');
        return;
    }
    
    if (!selectedModel.apiKey) {
        showError('配置错误', '选中的模型缺少 API Key');
        return;
    }
    
    // 添加用户消息
    addMessage('user', message);
    elements.messageInput.value = '';
    handleInputChange();
    
    // 显示加载状态
    showLoading(true);
    
    try {
        await generateResponse(message, selectedModel);
    } catch (error) {
        console.error('生成回复失败:', error);
        showError('生成失败', error.message);
        addMessage('assistant', '抱歉，我遇到了一些问题。请检查您的网络连接和 API 配置。');
    } finally {
        showLoading(false);
    }
}

// 生成回复
async function generateResponse(message, model) {
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
                'Authorization': `Bearer ${model.apiKey}`
            },
            body: JSON.stringify({
                model: model.name,
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
    
    // 创建消息头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.innerHTML = `
        <span class="message-role">${type === 'user' ? '👤 我' : '🤖 AI'}</span>
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
    `;
    
    // 创建消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    
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

// 模型管理函数
function openModels() {
    elements.modelsModal.style.display = 'block';
    renderModelsList();
}

function closeModels() {
    elements.modelsModal.style.display = 'none';
}

function openAddModel() {
    elements.modelEditTitle.textContent = '添加模型';
    elements.modelForm.reset();
    elements.modelTemperatureValue.textContent = '0.7';
    elements.modelEnabled.checked = true;
    elements.modelEditModal.style.display = 'block';
}

function closeModelEdit() {
    elements.modelEditModal.style.display = 'none';
}

function updateModelTemperatureDisplay() {
    elements.modelTemperatureValue.textContent = elements.modelTemperature.value;
}

async function saveModelHandler() {
    const model = {
        id: Date.now().toString(),
        provider: elements.modelProvider.value,
        name: elements.modelName.value.trim(),
        apiKey: elements.modelApiKey.value.trim(),
        apiUrl: elements.modelApiUrl.value.trim(),
        maxTokens: parseInt(elements.modelMaxTokens.value) || 2048,
        temperature: parseFloat(elements.modelTemperature.value) || 0.7,
        enabled: elements.modelEnabled.checked,
        status: 'unknown',
        lastTest: null
    };
    
    if (!model.provider || !model.name) {
        showError('验证错误', '请填写厂商和模型名称');
        return;
    }
    
    try {
        // 检查是否已存在同名模型
        const existingIndex = models.findIndex(m => m.name === model.name && m.provider === model.provider);
        if (existingIndex !== -1) {
            models[existingIndex] = { ...models[existingIndex], ...model };
        } else {
            models.push(model);
        }
        
        await ipcRenderer.invoke('save-models', models);
        updateModelsUI();
        closeModelEdit();
        showMessage('成功', '模型保存成功');
    } catch (error) {
        console.error('保存模型失败:', error);
        showError('保存失败', error.message);
    }
}

async function testModelHandler() {
    const model = {
        provider: elements.modelProvider.value,
        name: elements.modelName.value.trim(),
        apiKey: elements.modelApiKey.value.trim(),
        apiUrl: elements.modelApiUrl.value.trim()
    };
    
    if (!model.provider || !model.name) {
        showError('验证错误', '请填写厂商和模型名称');
        return;
    }
    
    elements.testModelBtn.disabled = true;
    elements.testModelBtn.textContent = '测试中...';
    
    try {
        const result = await ipcRenderer.invoke('test-model', model);
        if (result.success) {
            showMessage('测试成功', result.message);
        } else {
            showError('测试失败', result.message);
        }
    } catch (error) {
        console.error('模型测试失败:', error);
        showError('测试失败', error.message);
    } finally {
        elements.testModelBtn.disabled = false;
        elements.testModelBtn.textContent = '测试连接';
    }
}

async function refreshModelsStatus() {
    elements.refreshModelsBtn.disabled = true;
    elements.refreshModelsBtn.innerHTML = '<span class="icon">🔄</span> 测试中...';
    
    try {
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            if (!model.enabled) continue;
            
            model.status = 'testing';
            renderModelsList();
            
            try {
                const result = await ipcRenderer.invoke('test-model', model);
                model.status = result.success ? 'online' : 'offline';
                model.lastTest = new Date().toISOString();
            } catch (error) {
                model.status = 'offline';
                model.lastTest = new Date().toISOString();
            }
        }
        
        await ipcRenderer.invoke('save-models', models);
        renderModelsList();
        showMessage('刷新完成', '模型状态已更新');
    } catch (error) {
        console.error('刷新模型状态失败:', error);
        showError('刷新失败', error.message);
    } finally {
        elements.refreshModelsBtn.disabled = false;
        elements.refreshModelsBtn.innerHTML = '<span class="icon">🔄</span> 刷新状态';
    }
}

function renderModelsList() {
    if (!elements.modelsList) return;
    
    if (models.length === 0) {
        elements.modelsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无模型，请点击上方按钮添加模型</div>';
        return;
    }
    
    elements.modelsList.innerHTML = models.map(model => {
        const statusClass = model.status === 'online' ? 'online' : 
                           model.status === 'offline' ? 'offline' : 
                           model.status === 'testing' ? 'testing' : 'unknown';
        const statusText = model.status === 'online' ? '在线' : 
                          model.status === 'offline' ? '离线' : 
                          model.status === 'testing' ? '测试中' : '未测试';
        
        return `
            <div class="model-item">
                <div class="model-info">
                    <div class="model-name">${model.name}</div>
                    <div class="model-details">
                        <span class="model-provider">${getProviderName(model.provider)}</span>
                        <span>最大令牌: ${model.maxTokens}</span>
                        <span>温度: ${model.temperature}</span>
                        <div class="model-status">
                            <div class="status-indicator ${statusClass}"></div>
                            <span>${statusText}</span>
                        </div>
                    </div>
                </div>
                <div class="model-actions">
                    <button class="btn btn-secondary" onclick="editModel('${model.id}')">编辑</button>
                    <button class="btn btn-secondary" onclick="testSingleModel('${model.id}')">测试</button>
                    <button class="btn btn-secondary" onclick="deleteModel('${model.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function getProviderName(provider) {
    const providerNames = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'azure': 'Azure OpenAI',
        'huggingface': 'Hugging Face',
        'custom': '自定义'
    };
    return providerNames[provider] || provider;
}

window.editModel = function(id) {
    const model = models.find(m => m.id === id);
    if (!model) return;
    
    elements.modelEditTitle.textContent = '编辑模型';
    elements.modelProvider.value = model.provider;
    elements.modelName.value = model.name;
    elements.modelApiKey.value = model.apiKey;
    elements.modelApiUrl.value = model.apiUrl;
    elements.modelMaxTokens.value = model.maxTokens;
    elements.modelTemperature.value = model.temperature;
    elements.modelTemperatureValue.textContent = model.temperature;
    elements.modelEnabled.checked = model.enabled;
    
    elements.modelEditModal.style.display = 'block';
};

window.testSingleModel = async function(id) {
    const model = models.find(m => m.id === id);
    if (!model) return;
    
    model.status = 'testing';
    renderModelsList();
    
    try {
        const result = await ipcRenderer.invoke('test-model', model);
        model.status = result.success ? 'online' : 'offline';
        model.lastTest = new Date().toISOString();
        
        await ipcRenderer.invoke('save-models', models);
        renderModelsList();
        
        if (result.success) {
            showMessage('测试成功', `${model.name} 连接正常`);
        } else {
            showError('测试失败', result.message);
        }
    } catch (error) {
        model.status = 'offline';
        model.lastTest = new Date().toISOString();
        await ipcRenderer.invoke('save-models', models);
        renderModelsList();
        showError('测试失败', error.message);
    }
};

window.deleteModel = async function(id) {
    if (!confirm('确定要删除这个模型吗？')) return;
    
    try {
        models = models.filter(m => m.id !== id);
        await ipcRenderer.invoke('save-models', models);
        updateModelsUI();
        renderModelsList();
        showMessage('删除成功', '模型已删除');
    } catch (error) {
        console.error('删除模型失败:', error);
        showError('删除失败', error.message);
    }
};

function updateModelsUI() {
    // 更新模型选择器
    if (elements.modelSelect) {
        elements.modelSelect.innerHTML = '<option value="">选择模型</option>';
        models.filter(m => m.enabled).forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${getProviderName(model.provider)})`;
            elements.modelSelect.appendChild(option);
        });
        
        // 如果当前设置中的模型存在，选中它
        if (settings.model) {
            const currentModel = models.find(m => m.name === settings.model);
            if (currentModel) {
                elements.modelSelect.value = currentModel.id;
            }
        }
    }
    
    // 更新默认模型选择器
    if (elements.defaultModel) {
        elements.defaultModel.innerHTML = '<option value="">选择默认模型</option>';
        models.filter(m => m.enabled).forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${getProviderName(model.provider)})`;
            elements.defaultModel.appendChild(option);
        });
        
        // 如果当前设置中的模型存在，选中它
        if (settings.model) {
            const currentModel = models.find(m => m.name === settings.model);
            if (currentModel) {
                elements.defaultModel.value = currentModel.id;
            }
        }
    }
}

// 显示错误
function showError(title, content) {
    ipcRenderer.invoke('show-error', title, content);
    alert(`${title}: ${content}`);
}

// 显示成功消息
function showMessage(title, content) {
    console.log(`${title}: ${content}`);
    alert(`${title}: ${content}`);
}

// 显示成功消息
function showSuccess(message) {
    // 可以在这里添加成功提示
    console.log('成功:', message);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);