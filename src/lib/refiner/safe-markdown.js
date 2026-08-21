'use strict';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(value) {
  return String(value || '')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,;:!?])/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/g, '$1<em>$2</em>');
}

function renderSafeMarkdown(markdown) {
  const lines = escapeHtml(markdown).split('\n');
  const output = [];
  let listType = '';
  let isCode = false;

  function closeList() {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = '';
  }

  function openList(type) {
    if (listType === type) return;
    closeList();
    listType = type;
    output.push(`<${type}>`);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*```/.test(line)) {
      closeList();
      output.push(isCode ? '</code></pre>' : '<pre><code>');
      isCode = !isCode;
      continue;
    }
    if (isCode) {
      output.push(`${line}\n`);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }

    const tableDivider = lines[index + 1] && /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(lines[index + 1]);
    if (line.includes('|') && tableDivider) {
      closeList();
      const headers = line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      output.push(`<table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>`);
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        const cells = lines[index].replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
        output.push(`<tr>${cells.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`);
        index += 1;
      }
      output.push('</tbody></table>');
      index -= 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      openList('ul');
      output.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      openList('ol');
      output.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }
    const quote = line.match(/^\s*&gt;\s?(.+)$/);
    if (quote) {
      closeList();
      output.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    output.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeList();
  if (isCode) output.push('</code></pre>');
  return output.join('');
}

function buildBrowserMarkdownRuntime() {
  return [
    `const escapeHtml = ${escapeHtml.toString()};`,
    `const renderInlineMarkdown = ${renderInlineMarkdown.toString()};`,
    `const renderSafeMarkdown = ${renderSafeMarkdown.toString()};`
  ].join('\n');
}

module.exports = {
  buildBrowserMarkdownRuntime,
  escapeHtml,
  renderSafeMarkdown
};
