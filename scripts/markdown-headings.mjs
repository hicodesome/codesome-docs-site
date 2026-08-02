function isHeadingLine(line) {
  return /^ {0,3}#{1,6}(?:\s|$)/.test(line);
}

function demoteHtmlHeadings(line) {
  return line
    .replace(/<h1\b/gi, '<h2')
    .replace(/<\/h1\s*>/gi, '</h2>');
}

function fenceMarker(line) {
  return line.match(/^ {0,3}(`{3,}|~{3,})/);
}

/**
 * Assert that an article source is already in its publishable form.
 *
 * Runtime layers may validate this contract, but they must not repair a bad
 * source file silently: doing so would let an invalid article pass CI and
 * return later through another serving path.
 */
export function assertCanonicalArticleMarkdown(markdown, title) {
  if (typeof markdown !== 'string' || typeof title !== 'string' || !title.trim()) {
    throw new TypeError('article Markdown and title must be non-empty strings');
  }
  if (markdown.startsWith('\uFEFF') || markdown.includes('\r')) {
    throw new Error('article Markdown must be UTF-8 without BOM and use LF line endings');
  }

  const expectedPrefix = `# ${title}`;
  if (markdown.split('\n', 1)[0] !== expectedPrefix) {
    throw new Error(`article Markdown must start with the registered H1: ${title}`);
  }

  const h1s = headings(markdown).filter(heading => heading.level === 1);
  if (h1s.length !== 1 || h1s[0].text !== title) {
    throw new Error(`article Markdown must contain exactly one registered H1: ${title}`);
  }

  return markdown;
}

/**
 * Make the registered article title the only level-one heading.
 *
 * The browser title injector mirrors this deliberately small transformation.
 * Keeping it idempotent matters because the public server and Docsify can
 * both touch the same Markdown response during one page load.
 */
export function normalizeArticleMarkdown(markdown, title) {
  if (typeof markdown !== 'string' || typeof title !== 'string' || !title.trim()) {
    throw new TypeError('article Markdown and title must be non-empty strings');
  }

  const source = markdown.replace(/^\uFEFF/, '');
  const lines = source.split(/\r?\n/);
  const canonicalPrefix = lines[0] === `# ${title}`;
  const firstBodyLine = canonicalPrefix ? 1 : 0;
  const normalizedLines = [];
  let fence = null;

  for (let index = firstBodyLine; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = fenceMarker(line);

    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      normalizedLines.push(line);
      continue;
    }

    if (fence) {
      normalizedLines.push(line);
      continue;
    }

    if (/^ {0,3}=+\s*$/.test(line) && index > 0) {
      const previousSourceLine = lines[index - 1];
      const previousLine = normalizedLines.at(-1) || '';
      const previousIsFence = fenceMarker(previousSourceLine);
      if (previousLine.trim() && !isHeadingLine(previousSourceLine) && !previousIsFence) {
        normalizedLines[normalizedLines.length - 1] = `## ${previousLine.trim()}`;
        continue;
      }
    }

    normalizedLines.push(
      demoteHtmlHeadings(line).replace(/^( {0,3})#(?=\s+)/, '$1##')
    );
  }

  const prefix = `# ${title}`;
  const normalized = canonicalPrefix
    ? [prefix, ...normalizedLines].join('\n')
    : [prefix, '', ...normalizedLines].join('\n');
  return assertCanonicalArticleMarkdown(normalized, title);
}

export function headings(markdown) {
  const result = [];
  let fence = null;
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const visibleLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = fenceMarker(line);
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
