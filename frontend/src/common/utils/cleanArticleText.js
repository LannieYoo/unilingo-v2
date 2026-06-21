/**
 * Clean article text — remove noise from web copy-paste.
 * Removes image captions, photo credits, media markers, ads, bylines,
 * and joins broken paragraph lines.
 */
export function cleanArticleText(txt) {
  const lines = txt.split('\n')
  const cleaned = []

  // Patterns to remove entire lines
  const removeLinePatterns = [
    // Media embed markers
    /^\s*(WATCH|LISTEN|READ MORE|READ|VIDEO|RELATED|SEE ALSO|MORE|GALLERY|SLIDESHOW)\s*[|:│]/i,
    // Photo/image credits
    /^\s*\(?\s*(Photo|Image|Picture|Illustration|Video|Graphic|Screenshot)\s*(by|via|courtesy|credit|source|from)/i,
    // Credit lines
    /\((?:Photo|Image|Pic)(?:\s+by)?\s+.*?(?:Getty|AP|Reuters|AFP|Bloomberg|Shutterstock|Alamy|iStock|Unsplash|Pexels|via|Images?|Press|Photo).*?\)/i,
    // Standalone credit patterns
    /^\s*\(.*(?:Getty Images|AP Photo|Reuters|AFP|Bloomberg|Shutterstock|Associated Press).*\)\s*$/i,
    // Multiple credits on one line like (AFP via Getty Images) / (AFP via Getty Images)
    /^\s*\(.*?\)\s*\/\s*\(.*?\)\s*$/,
    // Share/social buttons text
    /^\s*(Share|Tweet|Pin|Email|Print|Save|Bookmark|Like|Follow|Subscribe|Sign up|Sign in|Log in|Register)\s*$/i,
    // Ad markers
    /^\s*(Advertisement|Sponsored|Ad|Promoted|ADVERTISEMENT|Loading\.\.\.)\s*$/i,
    // Navigation breadcrumbs
    /^\s*(Home|News|Sports|Entertainment|Opinion|World|Business)\s*[>»→\/]\s*/i,
    // Copyright lines
    /^\s*©|^\s*Copyright\s/i,
    // "Continue reading" type links
    /^\s*(Continue reading|Read more|Click here|Tap here|Swipe|Scroll down)/i,
    // Time stamps that are just standalone (e.g., "2 hours ago", "Updated 3 min ago")
    /^\s*(Updated|Published|Posted)?\s*\d+\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|days?)\s*ago\s*$/i,
    // Standalone reporter bylines
    /^\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*,?\s*(CBC|CNN|BBC|AP|Reuters|NPR|The .+)?\s*$/,
  ]

  // Patterns to clean from within lines (inline noise)
  const inlineCleanPatterns = [
    // Inline photo credits
    /\s*\((?:Photo|Image)\s+(?:by|via|courtesy)\s+.*?\)/gi,
    /\s*\/\s*\(.*?(?:Getty|AP|Reuters|AFP).*?\)/gi,
  ]

  for (let line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines (will be preserved as paragraph breaks)
    if (!trimmed) {
      cleaned.push('')
      continue
    }

    // Check if entire line should be removed
    let shouldRemove = false
    for (const pattern of removeLinePatterns) {
      if (pattern.test(trimmed)) {
        shouldRemove = true
        break
      }
    }
    if (shouldRemove) continue

    // Check for image caption heuristics:
    // Lines that are duplicated nearby (alt text + caption) — skip if very similar to previous kept line
    if (cleaned.length > 0) {
      const prevLine = cleaned[cleaned.length - 1].trim()
      if (prevLine && trimmed.startsWith(prevLine.substring(0, Math.min(30, prevLine.length)))) {
        // Current line starts with same text as previous — likely duplicate caption
        // Keep the longer one
        if (trimmed.length > prevLine.length) {
          cleaned[cleaned.length - 1] = trimmed
        }
        continue
      }
    }

    // Clean inline noise
    let cleanedLine = trimmed
    for (const pattern of inlineCleanPatterns) {
      cleanedLine = cleanedLine.replace(pattern, '')
    }

    if (cleanedLine.trim()) {
      cleaned.push(cleanedLine.trim())
    }
  }

  // Join broken paragraph lines:
  // If a line doesn't end with sentence-ending punctuation and the next non-empty line
  // starts with a lowercase letter or continues naturally, join them.
  const joined = []
  for (let j = 0; j < cleaned.length; j++) {
    const line = cleaned[j]

    if (!line) {
      // Empty line = paragraph break
      joined.push('')
      continue
    }

    if (joined.length > 0 && joined[joined.length - 1] !== '') {
      const prevLine = joined[joined.length - 1]
      const lastChar = prevLine.slice(-1)
      const firstChar = line[0]
      
      // Join if previous line doesn't end with sentence/paragraph-ending punctuation
      // and current line starts with lowercase, digit, or certain continuation chars
      const endsWithTerminator = /[.!?:"\u201D\u2019]$/.test(prevLine)
      const startsWithContinuation = /^[a-z\d,;"\u201C\u2018(]/.test(line)
      
      if (!endsWithTerminator && startsWithContinuation) {
        // Join with previous line
        joined[joined.length - 1] = prevLine + ' ' + line
        continue
      }
      // Also join if previous line ends mid-word (no space + punctuation pattern)
      if (!endsWithTerminator && /^[A-Z]/.test(firstChar) && !/[.!?:;]$/.test(lastChar)) {
        // Uppercase start after non-terminated line could be a name continuation
        // Only join if the previous line is short (likely a wrapped line, not a heading)
        if (prevLine.length < 80) {
          joined[joined.length - 1] = prevLine + ' ' + line
          continue
        }
      }
    }

    joined.push(line)
  }

  // Remove leading/trailing empty lines and collapse multiple blank lines
  return joined.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
