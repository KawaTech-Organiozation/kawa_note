/**
 * markdownUtils.js — Central markdown/content processing utilities
 *
 * Provides pure functions for:
 * - Whitespace preservation in Markdown view mode
 * - Checklist (to-do) toggle and insertion
 * - Line movement (up/down) for item ordering
 * - Checklist progress calculation
 *
 * All functions are stateless, pure, and safe for use in useMemo/useCallback.
 * No external dependencies.
 */

/**
 * Preprocess content for Markdown rendering to preserve single newlines
 * as hard line breaks. Idempotent — calling twice yields the same result.
 *
 * Algorithm:
 * 1. Split content by "\n"
 * 2. For each line:
 *    a. If the line already ends with "  " (two spaces) → skip
 *    b. If the line is empty → skip (empty lines create paragraph breaks)
 *    c. If the line starts with "#" (heading) → skip
 *    d. If the line starts with "```" → enter/exit code block mode → skip lines in code blocks
 *    e. Otherwise → append "  " (two spaces) to force hard line break
 * 3. Re-join with "\n"
 *
 * @param {string} content - Raw note content
 * @returns {string} Preprocessed content with hard line breaks
 */
export function preprocessContent(content) {
  if (!content) return '';

  const lines = content.split('\n');
  let inCodeBlock = false;
  const processed = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code block mode on fenced code block markers
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      processed.push(line);
      continue;
    }

    // Lines inside code blocks — preserve as-is
    if (inCodeBlock) {
      processed.push(line);
      continue;
    }

    // Empty lines — preserve (they create paragraph breaks)
    if (line.trim() === '') {
      processed.push(line);
      continue;
    }

    // Headings — skip (they don't need trailing spaces)
    if (/^#{1,6}\s/.test(line)) {
      processed.push(line);
      continue;
    }

    // Lines already ending with two spaces — skip (idempotency guard)
    if (line.endsWith('  ')) {
      processed.push(line);
      continue;
    }

    // All other lines — append two trailing spaces for hard line break
    processed.push(line + '  ');
  }

  return processed.join('\n');
}

/**
 * Toggle a checkbox at the specified line index.
 * Flips `- [ ]` ↔ `- [x]` at the given line.
 *
 * @param {string} content - Note content
 * @param {number} lineIndex - Zero-based line index to toggle
 * @returns {string} Updated content with toggled checkbox
 */
export function toggleCheckbox(content, lineIndex) {
  if (!content) return '';

  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return content;

  const line = lines[lineIndex];

  if (/- \[x\]/i.test(line)) {
    lines[lineIndex] = line.replace(/- \[x\]/i, '- [ ]');
  } else if (/- \[ \]/.test(line)) {
    lines[lineIndex] = line.replace('- [ ]', '- [x]');
  }

  return lines.join('\n');
}

/**
 * Insert a new checkbox item at the specified cursor line index.
 * Appends `\n- [ ] ` after the current line, or at the end of content.
 *
 * @param {string} content - Note content
 * @param {number|null} cursorLineIndex - Zero-based line index where to insert after. If null, appends to end.
 * @returns {{ content: string, cursorPosition: number }} Updated content and character index where cursor should be placed
 */
export function insertCheckboxItem(content, cursorLineIndex) {
  const newItem = '- [ ] ';

  if (!content || content.trim() === '') {
    return { content: newItem, cursorPosition: newItem.length };
  }

  const lines = content.split('\n');

  if (cursorLineIndex === null || cursorLineIndex === undefined || cursorLineIndex >= lines.length) {
    // Append at end
    const newContent = content + '\n' + newItem;
    return { content: newContent, cursorPosition: newContent.length };
  }

  // Insert after the specified line
  lines.splice(cursorLineIndex + 1, 0, newItem);
  const newContent = lines.join('\n');

  // Calculate character position: sum lengths of lines 0..cursorLineIndex (inclusive) + their newlines
  let cursorPosition = 0;
  for (let i = 0; i <= cursorLineIndex; i++) {
    cursorPosition += lines[i].length + 1; // +1 for \n
  }
  cursorPosition += newItem.length; // end of the new "- [ ] " item

  return { content: newContent, cursorPosition };
}

/**
 * Detect if the line at the given index is a checkbox line (- [ ] or - [x]).
 *
 * @param {string} content - Note content
 * @param {number} lineIndex - Zero-based line index to check
 * @returns {boolean} True if the line is a checkbox line
 */
export function isCheckboxLine(content, lineIndex) {
  if (!content) return false;
  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return false;
  return /^- \[(x| )\]/i.test(lines[lineIndex]);
}

/**
 * Check if a checkbox line at the given index is empty (no text after "- [ ] ").
 *
 * @param {string} content - Note content
 * @param {number} lineIndex - Zero-based line index to check
 * @returns {boolean} True if the line is a checkbox with no trailing text
 */
export function isEmptyCheckboxLine(content, lineIndex) {
  if (!content) return false;
  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return false;
  return /^- \[(x| )\]\s*$/i.test(lines[lineIndex]);
}

/**
 * Move a line up by swapping it with the line above.
 *
 * @param {string} content - Note content
 * @param {number} lineIndex - Zero-based line index to move
 * @returns {{ content: string, newLineIndex: number }} Updated content and new cursor line index
 */
export function moveLineUp(content, lineIndex) {
  if (!content) return { content: '', newLineIndex: 0 };

  const lines = content.split('\n');

  // Guard: already at top
  if (lineIndex <= 0 || lineIndex >= lines.length) {
    return { content, newLineIndex: lineIndex };
  }

  // Swap lines
  const temp = lines[lineIndex - 1];
  lines[lineIndex - 1] = lines[lineIndex];
  lines[lineIndex] = temp;

  // Renumber if both lines are numbered list items
  const updatedContent = renumberIfNeeded(lines);

  return { content: updatedContent, newLineIndex: lineIndex - 1 };
}

/**
 * Move a line down by swapping it with the line below.
 *
 * @param {string} content - Note content
 * @param {number} lineIndex - Zero-based line index to move
 * @returns {{ content: string, newLineIndex: number }} Updated content and new cursor line index
 */
export function moveLineDown(content, lineIndex) {
  if (!content) return { content: '', newLineIndex: 0 };

  const lines = content.split('\n');

  // Guard: already at bottom
  if (lineIndex < 0 || lineIndex >= lines.length - 1) {
    return { content, newLineIndex: lineIndex };
  }

  // Swap lines
  const temp = lines[lineIndex + 1];
  lines[lineIndex + 1] = lines[lineIndex];
  lines[lineIndex] = temp;

  // Renumber if needed
  const updatedContent = renumberIfNeeded(lines);

  return { content: updatedContent, newLineIndex: lineIndex + 1 };
}

/**
 * Calculate checklist progress from note content.
 *
 * @param {string} content - Note content
 * @returns {{ completed: number, total: number }} Checklist progress counts
 */
export function getChecklistProgress(content) {
  if (!content) return { completed: 0, total: 0 };

  const lines = content.split('\n');
  let total = 0;
  let completed = 0;

  for (const line of lines) {
    if (/- \[ \]/.test(line)) {
      total++;
    } else if (/- \[x\]/i.test(line)) {
      total++;
      completed++;
    }
  }

  return { completed, total };
}

/**
 * Check if a line is a list item (bullet, numbered, or checkbox).
 *
 * @param {string} line - Single line of text
 * @returns {boolean} True if the line is a list item
 */
export function isListLine(line) {
  if (!line) return false;
  const trimmed = line.trimStart();
  return (
    /^[-*+]\s/.test(trimmed) ||    // Bullet list: - item, * item, + item
    /^\d+\.\s/.test(trimmed) ||     // Numbered list: 1. item
    /^- \[(x| )\]/i.test(trimmed)   // Checkbox list: - [ ] item, - [x] item
  );
}

/**
 * Get an array of line indices that contain checkbox items.
 * Used for mapping rendered checkbox DOM elements to content line indices.
 *
 * @param {string} content - Note content
 * @returns {number[]} Array of zero-based line indices containing checkboxes
 */
export function getCheckboxLineIndices(content) {
  if (!content) return [];

  return content.split('\n')
    .map((line, idx) => ({ idx, isCheckbox: /- \[(x| )\]/i.test(line) }))
    .filter(l => l.isCheckbox)
    .map(l => l.idx);
}

/**
 * Renumber numbered list items sequentially after a reorder operation.
 * Finds contiguous blocks of numbered list items and renumbers them from 1.
 *
 * @param {string[]} lines - Array of content lines
 * @returns {string} Rejoined content string with renumbered lists
 */
function renumberIfNeeded(lines) {
  const result = [...lines];
  let i = 0;

  while (i < result.length) {
    // Check if current line is a numbered list item
    const match = result[i].match(/^(\s*)\d+\.\s/);
    if (match) {
      const indent = match[1];
      const blockStart = i;
      let num = 1;

      // Find and renumber the entire contiguous block
      while (i < result.length) {
        const lineMatch = result[i].match(/^(\s*)\d+(\.\s.*)/);
        if (lineMatch && lineMatch[1] === indent) {
          result[i] = indent + num + lineMatch[2];
          num++;
          i++;
        } else {
          break;
        }
      }
    } else {
      i++;
    }
  }

  return result.join('\n');
}
