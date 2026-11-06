const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// กันไม่ให้ภาพค้างตอนหน้าต่างถูกเกมบัง (OBS ยังจับภาพได้ลื่น)
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

let win = null, hook = null, learning = false;
const send = (ch, d) => { if (win && !win.isDestroyed()) win.webContents.send(ch, d); };

function createWindow() {
  win = new BrowserWindow({
    width: 980, height: 720, title: 'PNGTuber', backgroundColor: '#00ff00',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
  win.webContents.on('did-finish-load', startHook);
  win.on('closed', () => { win = null; });
}

// ฟังปุ่มทั้งเครื่องแบบ "ไม่แย่งปุ่ม" ปุ่มจะไปถึงเกม/OBS ด้วย
let hookStarted = false;
function startHook() {
  if (hookStarted) return;
  hookStarted = true;
  try {
    const m = require('uiohook-napi');
    hook = m.uIOhook;
    const names = {};
    Object.keys(m.UiohookKey).forEach(k => { if (typeof m.UiohookKey[k] === 'number') names[m.UiohookKey[k]] = k; });
    const MOD = new Set(['Ctrl', 'CtrlRight', 'Alt', 'AltRight', 'Shift', 'ShiftRight', 'Meta', 'MetaRight']);
    const down = new Set();
    hook.on('keydown', e => {
      if (down.has(e.keycode)) return;          // ตัด auto-repeat
      down.add(e.keycode);
      const n = names[e.keycode] || ('Key' + e.keycode);
      if (MOD.has(n)) return;
      const d = { keycode: e.keycode, ctrl: !!e.ctrlKey, alt: !!e.altKey, shift: !!e.shiftKey, meta: !!e.metaKey, label: n };
      if (learning) { learning = false; send('learned', n === 'Escape' ? { cancel: true } : d); return; }
      send('key', d);
    });
    hook.on('keyup', e => down.delete(e.keycode));
    hook.start();
  } catch (err) { send('hook-error', String(err && err.message || err)); }
}

ipcMain.on('learn', () => { learning = true; });
ipcMain.on('learn-cancel', () => { learning = false; });

if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'media'));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { try { hook && hook.stop(); } catch (e) {} });
