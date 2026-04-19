/**
 * Sanitize AI-generated clinical text before database persistence.
 * Strips HTML tags, script injections, and markdown-based XSS vectors
 * while preserving clinical formatting (bullet points, numbered lists, line breaks).
 */
export function sanitizeAIOutput(text: string): string {
  if (text == null || typeof text !== 'string') return text;

  // 1. Strip all HTML tags: <script>, <div>, etc.
  let cleaned = text.replace(/<[^>]*>/g, '');

  // 2. Remove javascript: protocol URIs (e.g. [Click](javascript:alert('xss')))
  // Matches javascript: with optional spaces/tabs/newlines
  cleaned = cleaned.replace(/javascript\s*:/ig, '');

  // 3. Remove data: URIs (except plain text)
  // We'll be safe and remove all data: URIs in markdown links/images
  cleaned = cleaned.replace(/data\s*:/ig, '');

  // 4. Strip event handler attributes - Since we stripped HTML tags above,
  // event handlers like onerror=... inside tags are already gone.
  // But just in case any weird markdown parsing creates them:
  cleaned = cleaned.replace(/\bon[a-z]+\s*=/ig, '');

  // 5. Preserve markdown structure (bullets, numbered lists, headers)
  // (We don't need to do anything special here as long as we only strip HTML tags)
  
  // 6. Return cleaned text
  return cleaned;
}
