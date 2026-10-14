const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  onWindowStateChanged: (callback) => {
    ipcRenderer.on('window:state-changed', (_event, value) => callback(value));
  },

  // Persistent History
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (history) => ipcRenderer.invoke('history:save', history),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Persistent Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Clipboard, System Locale & External Links
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),
  readFromClipboard: () => ipcRenderer.invoke('clipboard:read'),
  getSystemLocale: () => ipcRenderer.invoke('system:get-locale'),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url)
});
