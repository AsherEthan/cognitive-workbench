import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { HermesManager } from './lib/hermes-manager.mjs';
import { startWorkbenchServer } from './lib/server.mjs';
import { prepareWorkspace } from './lib/workspace.mjs';
import { handleSelfAwarenessRequest } from '../integrations/lifeos/modules/self-awareness.ts';
import { practices, practiceSources } from '../frontend/src/lib/practices/catalog.ts';

app.setName('認知工作台');
let window = null;
let server = null;
let manager = null;
let quitting = false;
let quitPending = false;

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    const workspace = join(app.getPath('userData'), 'workspace');
    const frontendDir = join(app.getAppPath(), 'frontend', 'out');
    if (['awareness', 'practices', 'agent'].some(page => !existsSync(join(frontendDir, page + '.html')) && !existsSync(join(frontendDir, page, 'index.html')))) throw new Error('缺少前端編譯產物。請先執行 npm run desktop:build。');
    prepareWorkspace(workspace, practices, practiceSources);
    process.env.SELF_AWARENESS_USER_DIR = workspace;
    manager = new HermesManager({ workspace, settingsPath: join(app.getPath('userData'), 'desktop-settings.json') });
    server = await startWorkbenchServer({ frontendDir, manager, awarenessHandler: handleSelfAwarenessRequest });
    await session.defaultSession.cookies.set({ url: server.origin, name: 'cw_session', value: server.token, httpOnly: true, sameSite: 'strict', path: '/' });
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
      { label: '檔案', submenu: [
        { label: '自我覺察', accelerator: 'CmdOrCtrl+1', click: () => window?.loadURL(server.origin + '/awareness') },
        { label: '練習與實踐', accelerator: 'CmdOrCtrl+2', click: () => window?.loadURL(server.origin + '/practices') },
        { type: 'separator' }, { label: '開啟工作目錄', click: () => shell.openPath(workspace) },
        ...(process.platform !== 'darwin' ? [{ role: 'quit' }] : []),
      ] },
      { label: '設定', submenu: [{ label: '資訊處理層', accelerator: 'CmdOrCtrl+,', click: () => window?.loadURL(server.origin + '/agent') }] },
      { label: '編輯', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '檢視', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : [])] },
      { label: '視窗', submenu: [{ role: 'minimize' }, { role: 'close' }] },
      { label: '說明', submenu: [{ label: 'Hermes 安裝與模型設定', click: () => shell.openExternal('https://hermes-agent.nousresearch.com/docs/getting-started/quickstart') }] },
    ]));
    const createWindow = () => {
      window = new BrowserWindow({ width: 1440, height: 940, minWidth: 920, minHeight: 640, backgroundColor: '#080f14', title: '認知工作台', show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
      window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url) && new URL(url).origin !== server.origin) void shell.openExternal(url); return { action: 'deny' }; });
      window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== server.origin) event.preventDefault(); });
      window.once('ready-to-show', () => window?.show());
      window.on('closed', () => { window = null; });
      void window.loadURL(server.origin + '/awareness');
    };
    createWindow();
    app.on('activate', () => { if (!window) createWindow(); });
    // Existing Hermes is an explicit external prerequisite for this first build.
    // No installers, package managers, or model requests run during app boot.
  }).catch(error => { dialog.showErrorBox('工作台未能啟動', error.message); app.quit(); });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', event => {
    if (quitting || !manager) return;
    event.preventDefault();
    if (quitPending) return;
    quitPending = true;
    void (async () => {
      if (manager.activeSessions.size) {
        const answer = await dialog.showMessageBox({ type: 'question', message: 'Agent 還在執行，停止並結束工作台？', detail: '已完成的內容會保留；目前工作將被中斷。', buttons: ['繼續執行', '停止並結束'], defaultId: 0, cancelId: 0 });
        if (answer.response === 0) { quitPending = false; return; }
      }
      await manager.stop();
      await server?.close();
      quitting = true; app.quit();
    })();
  });
}
