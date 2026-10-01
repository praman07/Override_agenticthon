/**
 * Research Paper Section Detection and Page-Aware Chunking Engine.
 *
 * Preserves exact page boundaries and tracks active sections so that page
 * numbers and section context survive all the way to citation retrieval.
 */

const ACADEMIC_SECTIONS = [
  'Abstract',
  'Introduction',
  'Background',
  'Related Work',
  'Methods',
  'Methodology',
  'Materials and Methods',
  'System Architecture',
  'Experiments',
  'Results',
  'Evaluation',
  'Discussion',
  'Conclusion',
  'Conclusions',
  'Future Work',
  'References',
  'Acknowledgments',
];

// Regex matching common academic heading formats in markdown or raw text
const SECTION_HEADING_REGEX = new RegExp(
  `^(?:#{1,4}\\s+|[0-9IVX]+\\.\\s+|[A-Z\\s]{2,}:?\\s*)?(${ACADEMIC_SECTIONS.join('|')})\\b[:\\s]*$`,
  'im'
);

/**
 * Detects if a line represents an academic section heading.
 * Returns the normalized section name if matched, or null.
 *
 * @param {string} line
 * @returns {string | null}
 */
export function detectSectionHeading(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (trimmed.length > 80) return null; // Headings are reasonably short

  const match = trimmed.match(SECTION_HEADING_REGEX);
  if (match && match[1]) {
    // Return canonical capitalized section name
    const found = match[1].trim();
    const canonical = ACADEMIC_SECTIONS.find(
      (s) => s.toLowerCase() === found.toLowerCase()
    );
    return canonical || found;
  }
  return null;
}

/**
 * Splits text into chunks using recursive character delimiters
 * (paragraphs -> sentences -> words) respecting maximum chunk size and overlap.
 *
 * @param {string} text
 * @param {number} [chunkSize=1200]
 * @param {number} [chunkOverlap=200]
 * @returns {string[]}
 */
export function recursiveSplitText(text, chunkSize = 1200, chunkOverlap = 200) {
  if (!text || !text.trim()) return [];

  const delimiters = ['\n\n', '\n', '. ', '; ', ' ', ''];

  function split(textToSplit, currentDelimIdx) {
    if (textToSplit.length <= chunkSize) {
      return [textToSplit];
    }

    if (currentDelimIdx >= delimiters.length) {
      // Force split by character length if no delimiter works
      const chunks = [];
      let start = 0;
      while (start < textToSplit.length) {
        chunks.push(textToSplit.slice(start, start + chunkSize));
        start += chunkSize - chunkOverlap;
      }
      return chunks;
    }

    const delimiter = delimiters[currentDelimIdx];
    const rawParts = delimiter ? textToSplit.split(delimiter) : textToSplit.split('');
    const splits = [];
    let currentPart = '';

    for (let i = 0; i < rawParts.length; i++) {
      const piece = rawParts[i];
      const addition = currentPart.length === 0 ? piece : piece ? `${delimiter}${piece}` : '';
      if (currentPart.length + addition.length <= chunkSize) {
        currentPart += addition;
      } else {
        if (currentPart.trim()) {
          splits.push(currentPart.trim());
        }
        // If single piece exceeds chunk size, split with next delimiter
        if (piece.length > chunkSize) {
          splits.push(...split(piece, currentDelimIdx + 1));
          currentPart = '';
        } else {
          // Carry over overlap if possible
          if (chunkOverlap > 0 && currentPart.length > chunkOverlap) {
            const overlapText = currentPart.slice(-chunkOverlap);
            currentPart = overlapText + (piece ? `${delimiter}${piece}` : '');
          } else {
            currentPart = piece;
          }
        }
      }
    }

    if (currentPart.trim()) {
      splits.push(currentPart.trim());
    }

    return splits;
  }

  return split(text, 0).filter((c) => c && c.trim().length > 30);
}

/**
 * Chunks an array of pages while preserving exact page boundaries and tracking section state.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {string} paperId
 * @param {object} [options]
 * @param {number} [options.chunkSize=1200]
 * @param {number} [options.chunkOverlap=200]
 * @returns {{ chunks: Array<{ chunkId: string, paperId: string, pageNumber: number, section: string | null, chunkIndex: number, text: string }>, detectedSections: Record<string, string> }}
 */
export function chunkPagesAware(pages, paperId, options = {}) {
  const { chunkSize = 1200, chunkOverlap = 200 } = options;
  const chunks = [];
  const detectedSections = {};
  let currentSection = null;
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageNum = Number(page.pageNumber) || 1;
    const pageText = (page.text || '').trim();
    if (!pageText) continue;

    // Scan lines to identify any section headings on this page
    const lines = pageText.split('\n');
    let pageWorkingSection = currentSection;

    for (const line of lines) {
      const detected = detectSectionHeading(line);
      if (detected) {
        pageWorkingSection = detected;
        currentSection = detected;
        if (!detectedSections[detected]) {
          detectedSections[detected] = `Page ${pageNum}`;
        }
      }
    }

    // Split page text into chunks
    const pageSplits = recursiveSplitText(pageText, chunkSize, chunkOverlap);

    for (const splitText of pageSplits) {
      // Check if this specific chunk contains a section heading
      const chunkLines = splitText.split('\n');
      for (const line of chunkLines) {
        const detected = detectSectionHeading(line);
        if (detected) {
          pageWorkingSection = detected;
          break;
        }
      }

      const chunkId = `${paperId}-p${pageNum}-c${globalChunkIndex}`;
      chunks.push({
        chunkId,
        paperId,
        pageNumber: pageNum,
        section: pageWorkingSection || null,
        chunkIndex: globalChunkIndex,
        text: splitText,
      });

      globalChunkIndex += 1;
    }
  }

  return { chunks, detectedSections };
}
