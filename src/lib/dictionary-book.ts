/**
 * Dictionary Book PDF & Print Generator
 * Formats CSV dictionary exports into a publication-ready multilingual lexicon book.
 */

export interface DictionaryBookEntry {
  id: string;
  headword: string;
  translations: { language: string; text: string }[];
  letter: string;
}

export interface DictionaryBookData {
  headers: string[];
  languages: string[];
  entries: DictionaryBookEntry[];
  letterGroups: { letter: string; entries: DictionaryBookEntry[] }[];
  totalEntries: number;
}

export interface BookConfig {
  title: string;
  subtitle: string;
  author: string;
  edition: string;
  primaryLanguage: string;
  layout: "two-column" | "grid" | "pocket";
  includeCover: boolean;
  includeToc: boolean;
  includeId: boolean;
  fontSize: "sm" | "base" | "lg";
}

export const DEFAULT_BOOK_CONFIG: BookConfig = {
  title: "KOROT Multilingual Dictionary",
  subtitle: "Koch – Bangla – English Comprehensive Lexicon",
  author: "KORO Language Documentation",
  edition: "First Edition • " + new Date().getFullYear(),
  primaryLanguage: "",
  layout: "two-column",
  includeCover: true,
  includeToc: true,
  includeId: false,
  fontSize: "base",
};

/**
 * Robust RFC 4180 compliant CSV parser.
 * Handles quoted fields, escaped quotes, multiline values, and UTF-8 BOM.
 */
export function parseCsv(text: string): string[][] {
  // Strip BOM if present
  let clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  clean = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentVal.trim());
        currentVal = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentVal.trim());
        // Only push row if it contains at least one non-empty value
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts parsed CSV rows into structured DictionaryBookData.
 */
export function buildBookData(rows: string[][], preferredPrimaryLang?: string): DictionaryBookData {
  if (rows.length === 0) {
    return {
      headers: [],
      languages: [],
      entries: [],
      letterGroups: [],
      totalEntries: 0,
    };
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  // Find ID column index if present
  let idColIndex = rawHeaders.findIndex((h) => /^id$/i.test(h) || /concept.*id/i.test(h));
  if (idColIndex === -1 && rawHeaders[0] && rawHeaders[0].length === 24 && /^[0-9a-fA-F]+$/.test(rawHeaders[0])) {
    idColIndex = 0;
  }

  // Language columns are non-ID columns
  const languageColumns: { index: number; name: string }[] = [];
  rawHeaders.forEach((colName, idx) => {
    if (idx !== idColIndex && colName.length > 0) {
      languageColumns.push({ index: idx, name: colName });
    }
  });

  const languageNames = languageColumns.map((l) => l.name);

  // Determine primary language (headword)
  let primaryCol = languageColumns[0];
  if (preferredPrimaryLang) {
    const found = languageColumns.find(
      (l) => l.name.toLowerCase() === preferredPrimaryLang.toLowerCase(),
    );
    if (found) primaryCol = found;
  }

  const entries: DictionaryBookEntry[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0) continue;

    const id = idColIndex !== -1 && row[idColIndex] ? row[idColIndex] : `entry-${r}`;
    const primaryWord = primaryCol && row[primaryCol.index] ? row[primaryCol.index].trim() : "";

    if (!primaryWord && !row.some((c, idx) => idx !== idColIndex && c.trim().length > 0)) {
      continue;
    }

    const translations: { language: string; text: string }[] = [];
    languageColumns.forEach((col) => {
      const val = row[col.index] ? row[col.index].trim() : "";
      if (val) {
        translations.push({ language: col.name, text: val });
      }
    });

    // Derive section letter
    let letter = "#";
    if (primaryWord) {
      const firstChar = primaryWord.normalize("NFD").charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(firstChar)) {
        letter = firstChar;
      } else if (/^[\u0980-\u09FF]$/.test(firstChar)) {
        // Bengali unicode block
        letter = firstChar;
      } else {
        letter = firstChar || "#";
      }
    }

    entries.push({
      id,
      headword: primaryWord || (translations[0] ? translations[0].text : "Untitled"),
      translations,
      letter,
    });
  }

  // Sort entries alphabetically by headword
  entries.sort((a, b) => a.headword.localeCompare(b.headword, undefined, { sensitivity: "base" }));

  // Group by letter
  const groupMap = new Map<string, DictionaryBookEntry[]>();
  for (const entry of entries) {
    const group = groupMap.get(entry.letter) || [];
    group.push(entry);
    groupMap.set(entry.letter, group);
  }

  const letterGroups = Array.from(groupMap.entries())
    .map(([letter, groupEntries]) => ({ letter, entries: groupEntries }))
    .sort((a, b) => a.letter.localeCompare(b.letter, undefined, { sensitivity: "base" }));

  return {
    headers: rawHeaders,
    languages: languageNames,
    entries,
    letterGroups,
    totalEntries: entries.length,
  };
}

/**
 * Generates publication-ready HTML for the dictionary book.
 * Includes print-specific CSS (@page, page-break, multi-column lexicon layout).
 */
export function generateBookHtml(data: DictionaryBookData, config: BookConfig): string {
  const primaryLangName = config.primaryLanguage || data.languages[0] || "Headword";
  const otherLanguages = data.languages.filter(
    (l) => l.toLowerCase() !== primaryLangName.toLowerCase(),
  );

  const fontSizeCss =
    config.fontSize === "sm"
      ? "font-size: 9pt; line-height: 1.35;"
      : config.fontSize === "lg"
      ? "font-size: 11pt; line-height: 1.5;"
      : "font-size: 10pt; line-height: 1.4;";

  const coverHtml = config.includeCover
    ? `
    <div class="book-cover page-break-after">
      <div class="cover-inner">
        <div class="cover-ornament-top">❖</div>
        <div class="cover-badge">KOROT DICTIONARY SERIES</div>
        <h1 class="cover-title">${escapeHtml(config.title)}</h1>
        <div class="cover-divider"></div>
        <h2 class="cover-subtitle">${escapeHtml(config.subtitle)}</h2>
        <div class="cover-languages">
          ${data.languages
            .map((lang) => `<span class="cover-lang-tag">${escapeHtml(lang)}</span>`)
            .join("")}
        </div>
        <div class="cover-meta">
          <p class="cover-edition">${escapeHtml(config.edition)}</p>
          <p class="cover-author">${escapeHtml(config.author)}</p>
          <p class="cover-stats">${data.totalEntries} Lexical Concepts • Comprehensive Edition</p>
        </div>
        <div class="cover-ornament-bottom">❖</div>
      </div>
    </div>
  `
    : "";

  const tocHtml = config.includeToc
    ? `
    <div class="book-toc page-break-after">
      <div class="toc-header">
        <h2>Table of Contents & Index</h2>
        <div class="toc-divider"></div>
      </div>
      <div class="toc-summary-box">
        <div class="toc-stat">
          <span class="stat-number">${data.totalEntries}</span>
          <span class="stat-label">Total Words</span>
        </div>
        <div class="toc-stat">
          <span class="stat-number">${data.languages.length}</span>
          <span class="stat-label">Languages</span>
        </div>
        <div class="toc-stat">
          <span class="stat-number">${data.letterGroups.length}</span>
          <span class="stat-label">Alphabet Sections</span>
        </div>
      </div>
      <div class="toc-grid">
        ${data.letterGroups
          .map(
            (g) => `
          <div class="toc-item">
            <span class="toc-letter">${escapeHtml(g.letter)}</span>
            <span class="toc-dots"></span>
            <span class="toc-count">${g.entries.length} entries</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="toc-notice">
        <p><strong>Reading Guide:</strong> Headwords are indexed under <em>${escapeHtml(
          primaryLangName,
        )}</em>. Cross-lingual definitions and synonyms follow each headword badge.</p>
      </div>
    </div>
  `
    : "";

  // Content pages layout
  const isTwoColumn = config.layout === "two-column";
  const isGrid = config.layout === "grid";

  let bodyContent = "";

  if (isGrid) {
    // Multi-lingual Tabular Grid
    bodyContent = `
      <div class="dictionary-grid-view">
        ${data.letterGroups
          .map(
            (group) => `
          <div class="letter-section">
            <div class="letter-marker-banner">
              <span class="letter-marker-char">${escapeHtml(group.letter)}</span>
              <span class="letter-marker-desc">${group.entries.length} entries</span>
            </div>
            <table class="dictionary-table">
              <thead>
                <tr>
                  <th style="width: 25%;">${escapeHtml(primaryLangName)}</th>
                  ${otherLanguages
                    .map((lang) => `<th>${escapeHtml(lang)}</th>`)
                    .join("")}
                  ${config.includeId ? '<th style="width: 15%;">ID</th>' : ""}
                </tr>
              </thead>
              <tbody>
                ${group.entries
                  .map((entry) => {
                    const primaryTrans = entry.translations.find(
                      (t) => t.language.toLowerCase() === primaryLangName.toLowerCase(),
                    );
                    const headwordVal = primaryTrans ? primaryTrans.text : entry.headword;
                    return `
                    <tr class="entry-row">
                      <td class="col-primary font-bold">${escapeHtml(headwordVal)}</td>
                      ${otherLanguages
                        .map((lang) => {
                          const t = entry.translations.find(
                            (item) => item.language.toLowerCase() === lang.toLowerCase(),
                          );
                          return `<td>${t ? escapeHtml(t.text) : '<span class="empty-cell">—</span>'}</td>`;
                        })
                        .join("")}
                      ${config.includeId ? `<td class="col-id font-mono">${escapeHtml(entry.id)}</td>` : ""}
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } else {
    // Classic 2-Column or Pocket Lexicon Layout
    bodyContent = `
      <div class="dictionary-lexicon-view ${isTwoColumn ? "two-columns" : "single-column"}">
        ${data.letterGroups
          .map(
            (group) => `
          <div class="letter-block">
            <div class="letter-marker-header">
              <span class="letter-marker-char">${escapeHtml(group.letter)}</span>
              <span class="letter-marker-line"></span>
              <span class="letter-marker-count">${group.entries.length} words</span>
            </div>
            <div class="entries-stream">
              ${group.entries
                .map((entry) => {
                  const primaryTrans = entry.translations.find(
                    (t) => t.language.toLowerCase() === primaryLangName.toLowerCase(),
                  );
                  const headwordVal = primaryTrans ? primaryTrans.text : entry.headword;
                  const targetTranslations = entry.translations.filter(
                    (t) => t.language.toLowerCase() !== primaryLangName.toLowerCase(),
                  );

                  return `
                  <div class="entry-card">
                    <div class="entry-header">
                      <span class="entry-headword">${escapeHtml(headwordVal)}</span>
                      ${
                        config.includeId
                          ? `<span class="entry-id-badge">${escapeHtml(entry.id.slice(-6))}</span>`
                          : ""
                      }
                    </div>
                    <div class="entry-definitions">
                      ${targetTranslations
                        .map(
                          (t) => `
                        <div class="entry-lang-row">
                          <span class="lang-pill">${escapeHtml(t.language)}</span>
                          <span class="lang-translation">${escapeHtml(t.text)}</span>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(config.title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
      @bottom-center {
        content: counter(page);
        font-family: inherit;
        font-size: 8pt;
        color: #64748b;
      }
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", Kalpurush, SolaimanLipi, Vrinda, sans-serif;
      color: #0f172a;
      background: #ffffff;
      ${fontSizeCss}
      -webkit-font-smoothing: antialiased;
    }

    .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    /* Cover Page */
    .book-cover {
      min-height: 85vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 30px 20px;
    }
    .cover-inner {
      border: 3px double #0f172a;
      padding: 40px 30px;
      width: 100%;
      max-width: 550px;
      margin: 0 auto;
      border-radius: 4px;
    }
    .cover-ornament-top, .cover-ornament-bottom {
      font-size: 22px;
      color: #475569;
      letter-spacing: 4px;
    }
    .cover-badge {
      display: inline-block;
      margin-top: 15px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 2px;
      color: #2563eb;
      text-transform: uppercase;
      padding: 3px 12px;
      background: #eff6ff;
      border-radius: 9999px;
      border: 1px solid #bfdbfe;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.15;
      margin-top: 20px;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .cover-divider {
      width: 80px;
      height: 3px;
      background: #2563eb;
      margin: 18px auto;
    }
    .cover-subtitle {
      font-size: 13pt;
      font-weight: 500;
      color: #334155;
      line-height: 1.4;
      margin-bottom: 25px;
    }
    .cover-languages {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 30px;
    }
    .cover-lang-tag {
      font-size: 9.5pt;
      font-weight: 600;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #1e293b;
    }
    .cover-meta {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      margin-bottom: 20px;
      color: #64748b;
      font-size: 9pt;
      line-height: 1.6;
    }
    .cover-author {
      font-weight: 600;
      color: #334155;
    }

    /* Table of Contents */
    .book-toc {
      padding: 20px 0;
    }
    .toc-header h2 {
      font-size: 18pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .toc-divider {
      height: 2px;
      background: #0f172a;
      margin: 10px 0 20px 0;
    }
    .toc-summary-box {
      display: flex;
      gap: 20px;
      padding: 14px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .toc-stat {
      flex: 1;
      text-align: center;
    }
    .stat-number {
      display: block;
      font-size: 16pt;
      font-weight: 800;
      color: #2563eb;
    }
    .stat-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 16px;
      margin-bottom: 24px;
    }
    .toc-item {
      display: flex;
      align-items: baseline;
      font-size: 9.5pt;
    }
    .toc-letter {
      font-weight: 700;
      font-size: 11pt;
      color: #0f172a;
      min-width: 20px;
    }
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #cbd5e1;
      margin: 0 6px;
    }
    .toc-count {
      color: #64748b;
      font-size: 8.5pt;
    }
    .toc-notice {
      margin-top: 30px;
      padding: 12px 16px;
      background: #eff6ff;
      border-left: 3px solid #2563eb;
      font-size: 8.5pt;
      color: #1e40af;
      border-radius: 0 6px 6px 0;
    }

    /* Running Header */
    .running-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 15px;
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Multi-column Lexicon View */
    .dictionary-lexicon-view.two-columns {
      column-count: 2;
      column-gap: 20px;
      column-rule: 1px solid #e2e8f0;
    }
    .letter-block {
      break-inside: auto;
      margin-bottom: 16px;
    }
    .letter-marker-header {
      display: flex;
      align-items: center;
      gap: 8px;
      break-after: avoid;
      break-inside: avoid;
      margin: 12px 0 8px 0;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #0f172a;
    }
    .letter-marker-char {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .letter-marker-line {
      flex: 1;
      height: 1px;
      background: #cbd5e1;
    }
    .letter-marker-count {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .entry-card {
      break-inside: avoid;
      padding: 5px 0;
      border-bottom: 1px dashed #e2e8f0;
      margin-bottom: 4px;
    }
    .entry-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
    }
    .entry-headword {
      font-weight: 700;
      color: #0f172a;
      font-size: 10.5pt;
    }
    .entry-id-badge {
      font-size: 6.5pt;
      font-family: monospace;
      color: #94a3b8;
    }
    .entry-definitions {
      margin-top: 3px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .entry-lang-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 9pt;
      line-height: 1.35;
    }
    .lang-pill {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 0 4px;
      border-radius: 3px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .lang-translation {
      color: #334155;
    }

    /* Tabular Grid View */
    .dictionary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9pt;
    }
    .dictionary-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dictionary-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .dictionary-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .dictionary-table .font-bold {
      font-weight: 700;
      color: #0f172a;
    }
    .dictionary-table .empty-cell {
      color: #cbd5e1;
    }
    .col-id {
      font-size: 7.5pt;
      color: #64748b;
    }

    /* Print specifics */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  <div class="running-header">
    <span>${escapeHtml(config.title)}</span>
    <span>${escapeHtml(config.subtitle)}</span>
  </div>
  ${bodyContent}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Opens a print dialog in a dedicated, isolated window for 100% crisp vector PDF rendering.
 */
export function printDictionaryBook(data: DictionaryBookData, config: BookConfig): void {
  const html = generateBookHtml(data, config);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups for this site to generate the PDF book.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts and styles to render before triggering print
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}
