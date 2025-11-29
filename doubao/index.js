const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require('openai');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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
      max_tokens: settings.maxTokens
    });

    // 将回复发送回渲染进程
    mainWindow.webContents.send('message-reply', completion.choices[0].message.content);
  } catch (error) {
    // 处理错误
    mainWindow.webContents.send('message-reply', `Error: ${error.message}`);
  }
});
