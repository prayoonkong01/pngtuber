const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  learn: () => ipcRenderer.send('learn'),
  cancelLearn: () => ipcRenderer.send('learn-cancel'),
  onKey: f => ipcRenderer.on('key', (_, d) => f(d)),
  onLearned: f => ipcRenderer.on('learned', (_, d) => f(d)),
  onHookError: f => ipcRenderer.on('hook-error', (_, m) => f(m))
});
