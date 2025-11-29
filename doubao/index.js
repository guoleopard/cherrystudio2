const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');


let mainWindow;
let tray = null;
const windowStatePath = path.join(app.getPath('userData'), 'windowState.json');

// 保存窗口状态
function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const isMaximized = mainWindow.isMaximized();
  const windowState = {
    bounds,
    isMaximized
  };
  fs.writeFile(windowStatePath, JSON.stringify(windowState));
}

// 加载窗口状态
function loadWindowState() {
  try {
    const windowState = JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
    return windowState;
  } catch (err) {
    // 如果窗口状态文件不存在，使用默认值
    return {
      bounds: { width: 1000, height: 700 },
      isMaximized: false
    };
  }
}

function createWindow() {
  const windowState = loadWindowState();
  
  mainWindow = new BrowserWindow({
    width: windowState.bounds.width,
    height: windowState.bounds.height,
    x: windowState.bounds.x,
    y: windowState.bounds.y,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // 监听窗口关闭事件，最小化到托盘
  // mainWindow.on('close', (event) => {
  //   if (!app.isQuiting) {
  //     event.preventDefault();
  //     mainWindow.hide();
  //   }
  //   return false;
  // });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  // 监听窗口大小变化
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);
}

// 创建系统托盘
// function createTray() {
//   try {
//     // 尝试使用自定义托盘图标
//     const trayIcon = path.join(__dirname, 'icon.png');
//     tray = new Tray(trayIcon);
//   } catch (err) {
//     // 如果自定义图标不存在，使用Electron默认图标
//     console.log('无法加载自定义托盘图标，使用默认图标:', err.message);
//     tray = new Tray(path.join(__dirname, 'node_modules/electron/dist/resources/electron.exe'));
//   }

//   // 托盘菜单
//   const contextMenu = Menu.buildFromTemplate([
//     { label: '显示窗口', click: () => mainWindow.show() },
//     { label: '退出', click: () => {
//       app.isQuiting = true;
//       app.quit();
//     } }
//   ]);

//   tray.setToolTip('CherryStudio2');
//   tray.setContextMenu(contextMenu);

//   // 托盘双击事件
//   tray.on('double-click', () => {
//     mainWindow.show();
//   });
// }

// 注册全局快捷键
function registerGlobalShortcuts() {
  // 注册显示/隐藏窗口的快捷键（Ctrl+Alt+C）
  const ret = globalShortcut.register('CommandOrControl+Alt+C', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  if (!ret) {
    console.log('全局快捷键注册失败');
  }
}

// 配置自动更新
function setupAutoUpdater() {
  // 配置自动更新
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'your-github-username',
    repo: 'your-github-repo'
  });

  // 自动更新事件监听
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available.');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新可用',
      message: '发现新版本，是否立即更新？',
      buttons: ['是', '否']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '无更新',
      message: '当前已经是最新版本。',
      buttons: ['确定']
    });
  });

  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater: ', err);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '更新失败',
      message: '更新过程中发生错误：' + err.message,
      buttons: ['确定']
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = '下载进度: ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    console.log(log_message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新完成',
      message: '更新已下载完成，是否立即重启应用？',
      buttons: ['是', '稍后']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 检查更新
  autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
    createWindow();
    // createTray();
    registerGlobalShortcuts();
    setupAutoUpdater();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 应用退出时注销全局快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理来自渲染进程的消息
ipcMain.on('send-message', async (event, { message, settings }) => {
  try {
    // 创建OpenAI客户端
    const openai = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.apiUrl
    });

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: settings.model,
      messages: [{ role: 'user', content: message }],
      temperature: settings.temperature,
      top_p: settings.topP,
      frequency_penalty: settings.frequencyPenalty,
      presence_penalty: settings.presencePenalty,
      max_tokens: settings.maxTokens
    });

    // 将回复发送回渲染进程
    mainWindow.webContents.send('message-reply', completion.choices[0].message.content);
  } catch (error) {
    // 处理错误
    mainWindow.webContents.send('message-reply', `Error: ${error.message}`);
  }
});
