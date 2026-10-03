const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

// ── Low-latency audio flags ──────────────────────────────────────
// Must be set BEFORE app.whenReady()
process.env.PULSE_LATENCY_MSEC = '5' // Force PipeWire-Pulse server to use 5ms buffers
// Reduces Chromium's internal audio buffer
app.commandLine.appendSwitch('audio-buffer-size', '256')      // samples (256 @ 48kHz ≈ 5.3ms)
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess') // single-process audio
app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns') // faster WebRTC path
app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-Audio-MinimizeResamplingOnMobile/Enabled/')


function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#e0e5ec',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#e0e5ec',
      symbolColor: '#4a5568',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // allow local file:// media
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    // win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

// ── File dialog ──────────────────────────────────────────────────
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Video/Audio Files', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'wav', 'flac', 'ogg'] }
    ]
  })
  if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0]
  return null
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
