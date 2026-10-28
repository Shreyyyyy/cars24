'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline text formatting: **bold**, *italic*, `code`, [link](url)
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex to match tokens: **bold**, *italic*, `code`, [link](url)
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-gray-900">
          {renderInline(inner)}
        </strong>
      );
    }

    // Italic: *text* (only if not bold)
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-gray-700">
          {renderInline(inner)}
        </em>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-mono border border-slate-200"
        >
          {inner}
        </code>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;
      return (
        <a
          key={index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:text-red-700 underline font-medium"
        >
          {linkText}
        </a>
      );
    }

    // Regular text
    return <span key={index}>{part}</span>;
  });
}

/**
 * Robust, lightweight Markdown parser and renderer for friendly chatbot conversations.
 * Eliminates raw '#' hashtags, '*' asterisks, and renders tables, lists, and callouts gracefully.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // 2. Horizontal Divider (--- or ***)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-gray-100" />);
      i++;
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-base font-semibold text-gray-900 mt-5 mb-2 first:mt-0">
            {renderInline(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-[15px] font-semibold text-gray-900 mt-6 mb-2 border-t border-gray-100 pt-4 first:mt-0 first:border-t-0 first:pt-0">
            {renderInline(headingText)}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-sm font-semibold text-gray-900 mt-4 mb-1.5 first:mt-0">
            {renderInline(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h4-${i}`} className="text-sm font-medium text-gray-800 mt-3 mb-1">
            {renderInline(headingText)}
          </h4>
        );
      }
      i++;
      continue;
    }

    // 4. Markdown Table
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // First line is header
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        // Second line is separator (|:---|:---|), skip or check
        const dataRowStartIdx = tableLines[1].includes('---') ? 2 : 1;
        const bodyRows = tableLines.slice(dataRowStartIdx).map((rowLine) =>
          rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
        );
        // Right-align columns whose cells are figures (units, ₹, %, +/- changes)
        const isFigure = (c: string) => /^[*\s]*[+\-−–]?\s*₹?\s*[\d,.]+\s*(%|pp|L|lakh|Cr|crore|x|days|units)?[*\s]*$/i.test(c) || c === '—' || c === '-';
        const numericCols = headerCells.map((_, cIdx) => {
          const cells = bodyRows.map(r => r[cIdx] || '').filter(c => c && c !== '—' && c !== '-');
          return cells.length > 0 && cells.every(isFigure);
        });

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${numericCols[hIdx] ? 'text-right' : ''}`}
                    >
                      {renderInline(h.replace(/\*\*/g, ''))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bodyRows.map((row, rIdx) => {
                  const isTotal = /^(\*\*)?(total|grand total|overall|all india|national)\b/i.test(row[0] || '');
                  return (
                    <tr key={rIdx} className={isTotal ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-700'}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`whitespace-nowrap px-3 py-2 ${numericCols[cIdx] ? 'text-right tabular-nums' : ''}`}
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 5. Code Block (```lang ... ```)
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++; // skip opening
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing
      }
      elements.push(
        <div key={`code-${i}`} className="my-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 font-mono text-xs overflow-x-auto">
          <pre>{codeLines.join('\n')}</pre>
        </div>
      );
      continue;
    }

    // 6. Blockquote (> note)
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '');
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2 border-l-2 border-gray-300 pl-3 text-sm text-gray-600 leading-relaxed"
        >
          {renderInline(quoteText)}
        </div>
      );
      i++;
      continue;
    }

    // 7. Unordered List (- item or * item or • item)
    if (/^(\*|\-|\•)\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^(\*|\-|\•)\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^(\*|\-|\•)\s+/, ''));
        i++;
      }

      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-800 leading-relaxed">
              <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Ordered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }

      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-800 leading-relaxed">
              <span className="w-4 flex-shrink-0 text-right text-sm tabular-nums text-gray-500">{idx + 1}.</span>
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-gray-800 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-2.5 font-normal ${className}`}>{elements}</div>;
};

export default MarkdownRenderer;
