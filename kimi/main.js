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
  presencePenalty: 0
};

// 创建设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

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

// 显示错误对话框
ipcMain.handle('show-error', (event, title, content) => {
  dialog.showErrorBox(title, content);
});

// 显示信息对话框
ipcMain.handle('show-message', (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});