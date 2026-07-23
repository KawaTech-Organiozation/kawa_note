import { safeUrlTransform } from '@/lib/constants';

// Regex to detect URLs (http:// or https://) inline within text
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Split a text line into segments: plain text and URLs.
 *
 * @param {string} text - A single line of text
 * @returns {Array<{type: 'text'|'url', value: string}>} Ordered segments
 */
function splitLineSegments(text) {
  const segments = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'url', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Render a single line's segments (plain text + clickable URLs).
 *
 * @param {string} text - Line text (without checkbox prefix)
 * @param {string} keyPrefix - React key prefix
 * @returns {React.ReactNode[]} Rendered segments
 */
function renderSegments(text, keyPrefix) {
  const segments = splitLineSegments(text);
  return segments.map((seg, i) => {
    if (seg.type === 'url') {
      const safeHref = safeUrlTransform(seg.value);
      if (safeHref === '#') {
        return <span key={`${keyPrefix}-seg-${i}`}>{seg.value}</span>;
      }
      return (
        <a
          key={`${keyPrefix}-seg-${i}`}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {seg.value}
        </a>
      );
    }
    return <span key={`${keyPrefix}-seg-${i}`}>{seg.value}</span>;
  });
}

/**
 * PlainTextRenderer — Read-only note content renderer.
 *
 * Renders note content as plain text preserving whitespace exactly as typed,
 * with automatic URL detection and clickable hyperlinks.
 * Supports interactive checkboxes (- [ ] / - [x]).
 *
 * @param {Object} props
 * @param {string} props.content - Raw note content string
 * @param {function(number): void} props.onCheckboxToggle - Called with line index when checkbox is toggled
 */
export default function PlainTextRenderer({ content, onCheckboxToggle }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="font-mono text-sm leading-relaxed text-slate-700 break-words whitespace-pre-wrap">
      {lines.map((line, lineIndex) => {
        const key = `line-${lineIndex}`;

        // Empty line → preserve as visual blank line
        if (line.trim() === '') {
          return <div key={key} className="h-[1.5em]" />;
        }

        // Checkbox line: - [ ] or - [x]
        const checkboxMatch = line.match(/^(\s*)-\s\[(x| )\]\s?(.*)/i);
        if (checkboxMatch) {
          const isChecked = checkboxMatch[2].toLowerCase() === 'x';
          const restText = checkboxMatch[3];
          const indent = checkboxMatch[1];

          return (
            <div key={key} className="flex items-start gap-2 leading-relaxed">
              {indent && <span>{indent}</span>}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheckboxToggle(lineIndex);
                }}
                className="mt-1 cursor-pointer accent-indigo-600 shrink-0"
              />
              <span className={isChecked ? 'line-through text-slate-400 transition-all duration-200' : ''}>
                {renderSegments(restText, key)}
              </span>
            </div>
          );
        }

        // Regular line → render segments (text + links)
        return (
          <div key={key} className="leading-relaxed">
            {renderSegments(line, key)}
          </div>
        );
      })}
    </div>
  );
}
