const { app, BrowserWindow, ipcMain, Menu, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Explicit application identity
app.setName('CIBO Calculator');
app.name = 'CIBO Calculator';
if (process.platform === 'linux' && typeof app.setDesktopName === 'function') {
  app.setDesktopName('hesapmakinesi.desktop');
}
process.title = 'CIBO Calculator';

let mainWindow;

// User Data storage paths for persistence
const getUserDataDir = () => {
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getHistoryFilePath = () => path.join(getUserDataDir(), 'calculator_history.json');
const getSettingsFilePath = () => path.join(getUserDataDir(), 'calculator_settings.json');

// Local fallback directory
const localDataDir = path.join(__dirname, 'data');
if (!fs.existsSync(localDataDir)) {
  try {
    fs.mkdirSync(localDataDir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function loadHistoryFromFile() {
  const primaryPath = getHistoryFilePath();
  const backupPath = path.join(localDataDir, 'history.json');

  try {
    if (fs.existsSync(primaryPath)) {
      const data = fs.readFileSync(primaryPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading primary history:', e);
  }

  try {
    if (fs.existsSync(backupPath)) {
      const data = fs.readFileSync(backupPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading backup history:', e);
  }

  return [];
}

function saveHistoryToFile(history) {
  const primaryPath = getHistoryFilePath();
  const backupPath = path.join(localDataDir, 'history.json');
  const serialized = JSON.stringify(history, null, 2);

  try {
    fs.writeFileSync(primaryPath, serialized, 'utf8');
  } catch (e) {
    console.error('Error writing primary history:', e);
  }

  try {
    fs.writeFileSync(backupPath, serialized, 'utf8');
  } catch (e) {
    console.error('Error writing backup history:', e);
  }
}

function loadSettingsFromFile() {
  const primaryPath = getSettingsFilePath();
  const backupPath = path.join(localDataDir, 'settings.json');
  const defaults = {
    theme: 'default',
    colorScheme: 'dark', // 'light' or 'dark'
    calculatorMode: 'standard', // 'standard' | 'scientific' | 'graphing' | 'programmer' | 'date' | 'converter-*'
    angleMode: 'DEG', // 'DEG' or 'RAD'
    soundEnabled: true,
    transparencyEnabled: false, // Default solid opaque, user can enable frosted glass
    isAlwaysOnTop: false
  };

  try {
    if (fs.existsSync(primaryPath)) {
      const data = fs.readFileSync(primaryPath, 'utf8');
      return { ...defaults, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }

  try {
    if (fs.existsSync(backupPath)) {
      const data = fs.readFileSync(backupPath, 'utf8');
      return { ...defaults, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading backup settings:', e);
  }

  return defaults;
}

function saveSettingsToFile(settings) {
  const primaryPath = getSettingsFilePath();
  const backupPath = path.join(localDataDir, 'settings.json');
  const serialized = JSON.stringify(settings, null, 2);

  try {
    fs.writeFileSync(primaryPath, serialized, 'utf8');
  } catch (e) {
    console.error('Error saving settings:', e);
  }

  try {
    fs.writeFileSync(backupPath, serialized, 'utf8');
  } catch (e) {
    console.error('Error saving backup settings:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 360,
    minHeight: 500,
    frame: false, // Frameless for custom CSD titlebar
    transparent: true,
    backgroundColor: '#00000000',
    title: 'CIBO Calculator',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile('index.html');

  // Track maximize state and send to renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:state-changed', { isMaximized: false });
  });
}

// Window control IPC
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize-toggle', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// External link opening
ipcMain.handle('system:open-external', async (_event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    try {
      await shell.openExternal(url);
      return true;
    } catch (e) {
      console.error('Failed to open external url:', e);
      return false;
    }
  }
  return false;
});

// History IPC
ipcMain.handle('history:load', () => {
  return loadHistoryFromFile();
});

ipcMain.handle('history:save', (event, history) => {
  saveHistoryToFile(history);
  return true;
});

ipcMain.handle('history:clear', () => {
  saveHistoryToFile([]);
  return true;
});

// Settings IPC
ipcMain.handle('settings:load', () => {
  return loadSettingsFromFile();
});

ipcMain.handle('settings:save', (event, settings) => {
  saveSettingsToFile(settings);
  return true;
});

// Clipboard IPC
ipcMain.handle('clipboard:write', (_event, text) => {
  try {
    clipboard.writeText(String(text || ''));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('clipboard:read', () => {
  try {
    return clipboard.readText() || '';
  } catch (e) {
    return '';
  }
});

// System Locale IPC
ipcMain.handle('system:get-locale', () => {
  try {
    return app.getLocale() || 'tr';
  } catch (e) {
    return 'tr';
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
