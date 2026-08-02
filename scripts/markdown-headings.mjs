function isHeadingLine(line) {
  return /^ {0,3}#{1,6}(?:\s|$)/.test(line);
}

export function headings(markdown) {
  const result = [];
  let fence = null;
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const visibleLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      visibleLines.push('');
      continue;
    }
    if (fence) {
      visibleLines.push('');
      continue;
    }

    visibleLines.push(line);
    const atx = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
    if (atx) result.push({ level: atx[1].length, text: atx[2].trim(), order: index });

    if (/^ {0,3}=+\s*$/.test(line) && index > 0) {
      const previous = lines[index - 1];
      if (previous.trim() && !isHeadingLine(previous)) {
        result.push({ level: 1, text: previous.trim(), order: index - 0.5 });
      }
    }
  }

  const visibleSource = visibleLines.join('\n');
  for (const match of visibleSource.matchAll(/<h1\b[^>]*>/gi)) {
    const closingIndex = visibleSource.indexOf('</h1', match.index + match[0].length);
    const inner = closingIndex === -1
      ? ''
      : visibleSource.slice(match.index + match[0].length, closingIndex)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    result.push({ level: 1, text: inner, order: match.index + 0.25 });
  }

  return result
    .sort((left, right) => left.order - right.order)
    .map(({ order, ...heading }) => heading);
}
