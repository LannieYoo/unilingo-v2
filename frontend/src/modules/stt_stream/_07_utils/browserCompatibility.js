// browserCompatibility - 브라우저 호환성 체크
// Whisper WebAssembly 실행에 필요한 기능 확인

export function isWhisperSupported() {
  const checks = {
    webAssembly: checkWebAssembly(),
    webAssemblySIMD: checkWebAssemblySIMD(),
    indexedDB: checkIndexedDB(),
    webWorkers: checkWebWorkers(),
    audioWorklet: checkAudioWorklet(),
    mediaDevices: checkMediaDevices()
  }

  const isSupported = Object.values(checks).every(check => check)

  return {
    isSupported,
    checks,
    missingFeatures: Object.entries(checks)
      .filter(([_, supported]) => !supported)
      .map(([feature]) => feature)
  }
}

function checkWebAssembly() {
  try {
    return typeof WebAssembly !== 'undefined' &&
           WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
  } catch {
    return false
  }
}

function checkWebAssemblySIMD() {
  try {
    return typeof WebAssembly !== 'undefined' &&
           WebAssembly.validate(new Uint8Array([
             0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
             10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
           ]))
  } catch {
    return false
  }
}

function checkIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

function checkWebWorkers() {
  return typeof Worker !== 'undefined'
}

function checkAudioWorklet() {
  return typeof AudioWorkletNode !== 'undefined'
}

function checkMediaDevices() {
  return typeof navigator !== 'undefined' &&
         typeof navigator.mediaDevices !== 'undefined' &&
         typeof navigator.mediaDevices.getUserMedia === 'function'
}

export function getBrowserInfo() {
  const ua = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = 'Unknown'

  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    browserName = 'Chrome'
    const match = ua.match(/Chrome\/(\d+)/)
    if (match) browserVersion = match[1]
  } else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge'
    const match = ua.match(/Edg\/(\d+)/)
    if (match) browserVersion = match[1]
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox'
    const match = ua.match(/Firefox\/(\d+)/)
    if (match) browserVersion = match[1]
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari'
    const match = ua.match(/Version\/(\d+)/)
    if (match) browserVersion = match[1]
  }

  return {
    name: browserName,
    version: parseInt(browserVersion, 10),
    userAgent: ua
  }
}

export function getRecommendedBrowsers() {
  return [
    { name: 'Chrome', minVersion: 90, downloadUrl: 'https://www.google.com/chrome/' },
    { name: 'Edge', minVersion: 90, downloadUrl: 'https://www.microsoft.com/edge' }
  ]
}

export function shouldFallbackToVosk() {
  const { isSupported } = isWhisperSupported()
  return !isSupported
}
