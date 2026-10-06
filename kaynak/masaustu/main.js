/* Ordu Savaşı Ultra — yerel uygulama kabuğu (kendi penceresi).
   Güvenlik kilitleri:
   - Kabuk komutu / OS.execute / child_process YOK. Konsol penceresi yok.
   - Oyun dosyaları sadece paket içinden (app://) yüklenir; yol dışına çıkış engellenir.
   - Ağ: SADECE tek izinli HTTPS adresi (imzalı içerik paketleri). Diğer tüm istekler iptal.
   - Yeni pencere, gezinme, izin istekleri (kamera, mikrofon, konum…) reddedilir.
   - Renderer: sandbox + contextIsolation, Node erişimi yok, geliştirici araçları kapalı. */
const { app, BrowserWindow, protocol, session, Menu, net, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const PACK_ORIGIN = 'https://alsatplaza-commits.github.io/ordu-savasi-ultra/packs/';
const ROOT = path.join(__dirname, 'app');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: false } }]);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
if (!app.requestSingleInstanceLock()) { app.quit(); }

function createWindow() {
  const win = new BrowserWindow({
    width: Math.min(1440, screen.getPrimaryDisplay().workAreaSize.width), height: Math.min(900, screen.getPrimaryDisplay().workAreaSize.height), minWidth: 800, minHeight: 480,
    title: 'Ordu Savaşı Ultra', backgroundColor: '#0d1117', autoHideMenuBar: true, show: false,
    icon: path.join(ROOT, 'ikon.png'),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, devTools: false, spellcheck: false, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://oyun/')) e.preventDefault(); });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.on('enter-full-screen', () => {});
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.loadURL('app://oyun/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    if (u.host !== 'oyun') return new Response('yok', { status: 404 });
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const full = path.normalize(path.join(ROOT, rel));
    if (!full.startsWith(ROOT + path.sep)) return new Response('yasak', { status: 403 });
    return net.fetch(pathToFileURL(full).toString());
  });
  const ses = session.defaultSession;
  ses.webRequest.onBeforeRequest((details, cb) => {
    const url = details.url;
    if (url.startsWith('app://oyun/') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('devtools:')) return cb({ cancel: false });
    if (url.startsWith(PACK_ORIGIN)) return cb({ cancel: false });
    cb({ cancel: true });
  });
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  ses.on('will-download', (e, item) => { if (!item.getURL().startsWith('blob:app://oyun/')) e.preventDefault(); });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('web-contents-created', (e, wc) => { wc.on('will-redirect', (ev, url) => { if (!url.startsWith('app://oyun/') && !url.startsWith(PACK_ORIGIN)) ev.preventDefault(); }); });
app.on('window-all-closed', () => app.quit());
