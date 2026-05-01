/**
 * Electron Main Process
 * 
 * Creates the desktop window and loads the Vite dev server (development)
 * or the built files (production).
 * 
 * STT: sherpa-onnx (SenseVoice model) — fully offline, no OS dependency.
 * Audio capture: Renderer sends PCM Float32 chunks via IPC.
 */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// Determine if running in development
const isDev = !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'UniLingo',
    icon: path.join(__dirname, '../public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    show: false, // Show after ready-to-show to avoid flash
  })

  // Load the app
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3001'
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

// ─── IPC Handlers ───────────────────────────────────────────────

ipcMain.handle('get-platform', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    isElectron: true,
  }
})

// ─── sherpa-onnx Speech Recognition ─────────────────────────────
const { SherpaOnnxRecognizer } = require('./sherpaOnnxSpeech.cjs')
let speechRecognizer = null

ipcMain.handle('speech:get-languages', async () => {
  return await SherpaOnnxRecognizer.getAvailableLanguages()
})

ipcMain.handle('speech:is-model-installed', () => {
  return SherpaOnnxRecognizer.isModelInstalled()
})

ipcMain.handle('speech:start', async (event, { language }) => {
  try {
    // Cleanup previous session
    if (speechRecognizer) {
      speechRecognizer.stop()
      speechRecognizer.removeAllListeners()
    }

    speechRecognizer = new SherpaOnnxRecognizer()

    // Forward events to renderer
    speechRecognizer.on('started', () => {
      mainWindow?.webContents.send('speech:event', { type: 'started' })
    })

    speechRecognizer.on('final', (data) => {
      mainWindow?.webContents.send('speech:event', {
        type: 'final',
        text: data.text,
        confidence: data.confidence,
      })
    })

    speechRecognizer.on('interim', (data) => {
      mainWindow?.webContents.send('speech:event', {
        type: 'interim',
        text: data.text,
      })
    })

    speechRecognizer.on('error', (data) => {
      mainWindow?.webContents.send('speech:event', {
        type: 'error',
        message: data.message,
      })
    })

    speechRecognizer.on('end', () => {
      mainWindow?.webContents.send('speech:event', { type: 'end' })
    })

    // Start the recognizer (forks worker process, audio will arrive via speech:push-audio IPC)
    await speechRecognizer.start(language)

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * Receive PCM audio chunks from renderer.
 * The renderer captures audio via Web Audio API (AudioWorklet/ScriptProcessor),
 * converts to Float32Array, and sends here via IPC.
 * 
 * Uses ipcMain.on (not .handle) for fire-and-forget performance.
 */
ipcMain.on('speech:push-audio', (event, samples) => {
  if (speechRecognizer && speechRecognizer.isRunning) {
    // IPC transfers create "external" ArrayBuffers that native addons reject.
    // Copy into a fresh Float32Array on the V8 heap.
    const source = new Float32Array(samples)
    const copied = new Float32Array(source.length)
    copied.set(source)
    speechRecognizer.pushAudio(copied)
  }
})

ipcMain.handle('speech:stop', async () => {
  if (speechRecognizer) {
    speechRecognizer.stop()
    speechRecognizer.removeAllListeners()
    speechRecognizer = null
  }
  return { success: true }
})
