/**
 * overlapMerge - pending interim과 새 final 결과의 오버랩 병합
 * 
 * 세션 재시작 시 마지막 interim이 새 세션의 첫 final과 중복될 수 있음
 * 이를 감지하고 병합하여 중복 방지
 */

import { normalizeForComparison } from './normalize'
import { debugLogger } from './debugLogger'

/**
 * 두 텍스트의 오버랩을 찾아 병합
 * @param {string} pending - 이전 세션의 마지막 interim
 * @param {string} firstFinal - 새 세션의 첫 final 결과
 * @returns {string} 병합된 결과
 */
export function overlapMerge(pending, firstFinal) {
  if (!pending || !firstFinal) {
    return firstFinal || pending || ''
  }

  const normPending = normalizeForComparison(pending)
  const normFinal = normalizeForComparison(firstFinal)

  // 완전 중복 체크
  if (normPending === normFinal) {
    debugLogger.info('overlapMerge: exact duplicate, using firstFinal', { pending, firstFinal })
    return firstFinal
  }

  // pending이 firstFinal에 포함되어 있으면 firstFinal만 사용
  if (normFinal.includes(normPending)) {
    debugLogger.info('overlapMerge: pending contained in firstFinal', { pending, firstFinal })
    return firstFinal
  }

  // firstFinal이 pending에 포함되어 있으면 pending만 사용
  if (normPending.includes(normFinal)) {
    debugLogger.info('overlapMerge: firstFinal contained in pending', { pending, firstFinal })
    return pending
  }

  // 부분 오버랩 찾기 (pending의 끝부분이 firstFinal의 시작부분과 겹치는지)
  const pendingWords = normPending.split(' ')
  const finalWords = normFinal.split(' ')

  // 최대 오버랩 길이 (단어 기준)
  const maxOverlap = Math.min(pendingWords.length, finalWords.length)

  for (let overlapLen = maxOverlap; overlapLen >= 1; overlapLen--) {
    const pendingTail = pendingWords.slice(-overlapLen).join(' ')
    const finalHead = finalWords.slice(0, overlapLen).join(' ')

    if (pendingTail === finalHead) {
      // 오버랩 발견 - pending + firstFinal의 나머지 부분
      const mergedWords = [
        ...pending.trim().split(' '),
        ...firstFinal.trim().split(' ').slice(overlapLen)
      ]
      const merged = mergedWords.join(' ')
      debugLogger.info('overlapMerge: partial overlap found', { 
        pending, 
        firstFinal, 
        overlapLen, 
        merged 
      })
      return merged
    }
  }

  // 오버랩 없음 - 둘 다 사용
  debugLogger.info('overlapMerge: no overlap, concatenating', { pending, firstFinal })
  return pending.trim() + ' ' + firstFinal.trim()
}

export default overlapMerge
