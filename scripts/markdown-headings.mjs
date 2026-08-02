function isHeadingLine(line) {
  return Boolean(markdownHeading(line));
}

function demoteHtmlHeadings(line) {
  return line
    .replace(/<h1\b/gi, '<h2')
    .replace(/<\/h1\s*>/gi, '</h2>');
}

function fenceMarker(line) {
  const prefix = blockquotePrefix(line);
  return line.slice(prefix.length).match(/^ {0,3}(`{3,}|~{3,})/);
}

function blockquotePrefix(line) {
  return line.match(/^ {0,3}(?:(?:>[ \t]?)+)/)?.[0] || '';
}

function markdownHeading(line) {
  const match = line.match(/^( {0,3}(?:(?:>[ \t]?)+)?)(#{1,6})(?:[ \t]+(.+?)[ \t]*|$)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    hashes: match[2],
    text: (match[3] || '').replace(/[ \t]+#+[ \t]*$/, '').trim()
  };
}

function demoteMarkdownHeading(line) {
  const heading = markdownHeading(line);
  if (!heading || heading.hashes.length !== 1) return line;
  return `${heading.prefix}##${line.slice(heading.prefix.length + 1)}`;
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

    const quotePrefix = blockquotePrefix(line);
    if (/^=+\s*$/.test(line.slice(quotePrefix.length)) && index > 0) {
      const previousSourceLine = lines[index - 1];
      const previousLine = normalizedLines.at(-1) || '';
      const previousIsFence = fenceMarker(previousSourceLine);
      const previousQuotePrefix = blockquotePrefix(previousSourceLine);
      const previousBody = previousLine.slice(previousQuotePrefix.length);
      if (
        quotePrefix === previousQuotePrefix &&
        previousBody.trim() &&
        !isHeadingLine(previousSourceLine) &&
        !previousIsFence
      ) {
        normalizedLines[normalizedLines.length - 1] = `${quotePrefix}## ${previousBody.trim()}`;
        continue;
      }
    }

    normalizedLines.push(demoteMarkdownHeading(demoteHtmlHeadings(line)));
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
    const atx = markdownHeading(line);
    if (atx) result.push({ level: atx.hashes.length, text: atx.text, order: index });

    const quotePrefix = blockquotePrefix(line);
    if (/^=+\s*$/.test(line.slice(quotePrefix.length)) && index > 0) {
      const previous = lines[index - 1];
      const previousQuotePrefix = blockquotePrefix(previous);
      const previousBody = previous.slice(previousQuotePrefix.length).trim();
      if (
        quotePrefix === previousQuotePrefix &&
        previousBody &&
        !isHeadingLine(previous) &&
        !fenceMarker(previous)
      ) {
        result.push({ level: 1, text: previousBody, order: index - 0.5 });
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
