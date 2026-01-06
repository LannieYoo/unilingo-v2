/**
 * File Helper Utilities
 * 파일 관련 유틸리티
 */

/**
 * 파일명 생성
 * @param {string} prefix - 파일명 접두사
 * @returns {string} 생성된 파일명
 */
export function generateFileName(prefix = 'vosk-stt') {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  return `${prefix}-${timestamp}.txt`
}

/**
 * 텍스트를 파일로 다운로드
 * @param {string} content - 파일 내용
 * @param {string} fileName - 파일명
 */
export function downloadAsFile(content, fileName) {
  if (!content) return

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = fileName || generateFileName()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default { generateFileName, downloadAsFile }
