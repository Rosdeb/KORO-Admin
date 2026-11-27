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
  layout: "two-column" | "grid" | "compact-inline";
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
  let idColIndex = rawHeaders.findIndex((h) => /^id$/i.test(h) || /concept.*id/i.test(h));
  if (idColIndex === -1 && rawHeaders[0] && rawHeaders[0].length === 24 && /^[0-9a-fA-F]+$/.test(rawHeaders[0])) {
    idColIndex = 0;
  }

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
 * Perfectly aligned typography, standard A4 margins, repeating headers, and zero overflowing cards.
 */
export function generateBookHtml(data: DictionaryBookData, config: BookConfig): string {
  const primaryLangName = config.primaryLanguage || data.languages[0] || "Headword";
  const otherLanguages = data.languages.filter(
    (l) => l.toLowerCase() !== primaryLangName.toLowerCase(),
  );

  const fontSizeCss =
    config.fontSize === "sm"
      ? "font-size: 8.5pt; line-height: 1.35;"
      : config.fontSize === "lg"
      ? "font-size: 10.5pt; line-height: 1.5;"
      : "font-size: 9.5pt; line-height: 1.4;";

  // 1. Cover Page
  const coverHtml = config.includeCover
    ? `
    <div class="book-cover page-break-after">
      <div class="cover-frame">
        <div class="cover-header-ornament">
          <span class="ornament-dot">✦</span>
          <span class="ornament-line"></span>
          <span class="ornament-symbol">❖</span>
          <span class="ornament-line"></span>
          <span class="ornament-dot">✦</span>
        </div>

        <div class="cover-series-pill">KOROT MULTILINGUAL LEXICON</div>

        <h1 class="cover-title">${escapeHtml(config.title)}</h1>
        <div class="cover-title-rule"></div>
        <h2 class="cover-subtitle">${escapeHtml(config.subtitle)}</h2>

        <div class="cover-languages-box">
          <div class="cover-lang-label">DOCUMENTED LANGUAGES</div>
          <div class="cover-lang-chips">
            ${data.languages
              .map((lang) => `<span class="cover-lang-chip">${escapeHtml(lang)}</span>`)
              .join("")}
          </div>
        </div>

        <div class="cover-bottom-meta">
          <div class="meta-row font-medium">${escapeHtml(config.edition)}</div>
          <div class="meta-row text-muted">${escapeHtml(config.author)}</div>
          <div class="meta-badge">${data.totalEntries} Total Lexical Concepts • Fully Indexed</div>
        </div>

        <div class="cover-footer-ornament">❖</div>
      </div>
    </div>
  `
    : "";

  // 2. Table of Contents
  const tocHtml = config.includeToc
    ? `
    <div class="book-toc page-break-after">
      <div class="toc-title-bar">
        <h2>Table of Contents & Index</h2>
        <span class="toc-badge">${data.totalEntries} Entries • ${data.letterGroups.length} Sections</span>
      </div>

      <div class="toc-summary-deck">
        <div class="deck-card">
          <span class="deck-num">${data.totalEntries}</span>
          <span class="deck-lbl">Total Words</span>
        </div>
        <div class="deck-card">
          <span class="deck-num">${data.languages.length}</span>
          <span class="deck-lbl">Languages</span>
        </div>
        <div class="deck-card">
          <span class="deck-num">${data.letterGroups.length}</span>
          <span class="deck-lbl">Alphabet Chapters</span>
        </div>
        <div class="deck-card">
          <span class="deck-num">${escapeHtml(primaryLangName)}</span>
          <span class="deck-lbl">Primary Index</span>
        </div>
      </div>

      <div class="toc-columns">
        ${data.letterGroups
          .map(
            (g) => `
          <div class="toc-line">
            <span class="toc-char">${escapeHtml(g.letter)}</span>
            <span class="toc-leader"></span>
            <span class="toc-val">${g.entries.length} words</span>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="toc-instructions">
        <strong>Structure Guide:</strong> All entries are alphabetized under the primary headword language (<em>${escapeHtml(
          primaryLangName,
        )}</em>). Cross-lingual synonyms and definitions appear in strict vertical alignment under each headword card.
      </div>
    </div>
  `
    : "";

  // 3. Body Content based on layout
  let bodyContent = "";

  if (config.layout === "grid") {
    // Perfectly Aligned Multi-lingual Comparative Table
    bodyContent = `
      <div class="dictionary-view grid-layout">
        ${data.letterGroups
          .map(
            (group) => `
          <div class="letter-section-container">
            <div class="letter-banner">
              <span class="letter-char">${escapeHtml(group.letter)}</span>
              <span class="letter-meta">${group.entries.length} concepts</span>
            </div>
            <table class="lexicon-table">
              <thead>
                <tr>
                  <th class="th-primary" style="width: 28%;">${escapeHtml(primaryLangName)}</th>
                  ${otherLanguages
                    .map((lang) => `<th>${escapeHtml(lang)}</th>`)
                    .join("")}
                  ${config.includeId ? '<th class="th-id" style="width: 12%;">ID</th>' : ""}
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
                    <tr class="table-row">
                      <td class="td-primary">${escapeHtml(headwordVal)}</td>
                      ${otherLanguages
                        .map((lang) => {
                          const t = entry.translations.find(
                            (item) => item.language.toLowerCase() === lang.toLowerCase(),
                          );
                          return `<td class="td-lang">${t ? escapeHtml(t.text) : '<span class="cell-empty">—</span>'}</td>`;
                        })
                        .join("")}
                      ${config.includeId ? `<td class="td-id">${escapeHtml(entry.id.slice(-8))}</td>` : ""}
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
  } else if (config.layout === "compact-inline") {
    // Compact Oxford Style Inline Paragraphs
    bodyContent = `
      <div class="dictionary-view compact-layout">
        ${data.letterGroups
          .map(
            (group) => `
          <div class="compact-letter-block">
            <div class="letter-banner compact-banner">
              <span class="letter-char">${escapeHtml(group.letter)}</span>
              <span class="letter-meta">${group.entries.length} words</span>
            </div>
            <div class="compact-entries-stream">
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
                  <div class="compact-entry-item">
                    <span class="compact-bullet">▪</span>
                    <strong class="compact-headword">${escapeHtml(headwordVal)}</strong>
                    ${config.includeId ? `<span class="compact-id">[${escapeHtml(entry.id.slice(-6))}]</span>` : ""}
                    <span class="compact-definitions">
                      ${targetTranslations
                        .map(
                          (t) => `
                        <span class="compact-lang-def">
                          <span class="compact-lang-lbl">${escapeHtml(t.language)}:</span>
                          <span class="compact-lang-val">${escapeHtml(t.text)}</span>
                        </span>
                      `,
                        )
                        .join(" • ")}
                    </span>
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
  } else {
    // Classic 2-Column Aligned Lexicon Cards (Default)
    bodyContent = `
      <div class="dictionary-view two-column-layout">
        ${data.letterGroups
          .map(
            (group) => `
          <div class="letter-group-block">
            <div class="letter-banner">
              <span class="letter-char">${escapeHtml(group.letter)}</span>
              <span class="letter-line"></span>
              <span class="letter-meta">${group.entries.length} words</span>
            </div>
            <div class="entries-column-flow">
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
                  <div class="lexicon-card">
                    <div class="card-head">
                      <div class="headword-title">${escapeHtml(headwordVal)}</div>
                      ${
                        config.includeId
                          ? `<div class="headword-id">${escapeHtml(entry.id.slice(-6))}</div>`
                          : ""
                      }
                    </div>
                    <div class="translations-grid">
                      ${targetTranslations
                        .map(
                          (t) => `
                        <div class="trans-row">
                          <div class="trans-label">${escapeHtml(t.language)}</div>
                          <div class="trans-value">${escapeHtml(t.text)}</div>
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
    /* A4 Standards & Print Paged Media */
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
      @top-left {
        content: "${escapeHtml(config.title)}";
        font-family: inherit;
        font-size: 7.5pt;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 0.5pt solid #cbd5e1;
        padding-bottom: 2mm;
      }
      @top-right {
        content: "${escapeHtml(config.subtitle)}";
        font-family: inherit;
        font-size: 7.5pt;
        color: #64748b;
        border-bottom: 0.5pt solid #cbd5e1;
        padding-bottom: 2mm;
      }
      @bottom-left {
        content: "${escapeHtml(config.author)}";
        font-family: inherit;
        font-size: 7.5pt;
        color: #94a3b8;
        border-top: 0.5pt solid #e2e8f0;
        padding-top: 2mm;
      }
      @bottom-right {
        content: "Page " counter(page);
        font-family: inherit;
        font-size: 7.5pt;
        font-weight: 600;
        color: #64748b;
        border-top: 0.5pt solid #e2e8f0;
        padding-top: 2mm;
      }
    }

    @page :first {
      margin-top: 0;
      margin-bottom: 0;
      @top-left { content: none; }
      @top-right { content: none; }
      @bottom-left { content: none; }
      @bottom-right { content: none; }
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", "Vrinda", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      ${fontSizeCss}
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    /* =========================================
       1. COVER PAGE
       ========================================= */
    .book-cover {
      min-height: 92vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 10px;
    }
    .cover-frame {
      border: 2px solid #0f172a;
      outline: 1px solid #cbd5e1;
      outline-offset: 4px;
      padding: 45px 35px;
      width: 100%;
      max-width: 540px;
      margin: 0 auto;
      text-align: center;
      background: #ffffff;
    }
    .cover-header-ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #475569;
      font-size: 11pt;
      margin-bottom: 20px;
    }
    .ornament-line {
      display: inline-block;
      width: 40px;
      height: 1px;
      background: #cbd5e1;
    }
    .cover-series-pill {
      display: inline-block;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #1e40af;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 3px 14px;
      border-radius: 9999px;
      margin-bottom: 18px;
    }
    .cover-title {
      font-size: 24pt;
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .cover-title-rule {
      width: 60px;
      height: 2.5px;
      background: #2563eb;
      margin: 0 auto 14px auto;
    }
    .cover-subtitle {
      font-size: 12pt;
      font-weight: 500;
      color: #334155;
      line-height: 1.4;
      margin-bottom: 30px;
    }
    .cover-languages-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 35px;
    }
    .cover-lang-label {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .cover-lang-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
    }
    .cover-lang-chip {
      font-size: 9pt;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 3px 10px;
      border-radius: 4px;
    }
    .cover-bottom-meta {
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      margin-bottom: 15px;
      font-size: 8.5pt;
      color: #64748b;
      line-height: 1.6;
    }
    .cover-bottom-meta .font-medium {
      font-weight: 600;
      color: #0f172a;
    }
    .meta-badge {
      display: inline-block;
      margin-top: 8px;
      font-size: 8pt;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 2px 10px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .cover-footer-ornament {
      color: #94a3b8;
      font-size: 13pt;
      margin-top: 8px;
    }

    /* =========================================
       2. TABLE OF CONTENTS
       ========================================= */
    .book-toc {
      padding: 10px 0;
    }
    .toc-title-bar {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .toc-title-bar h2 {
      font-size: 17pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .toc-badge {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
    }
    .toc-summary-deck {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .deck-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .deck-num {
      display: block;
      font-size: 15pt;
      font-weight: 800;
      color: #2563eb;
      line-height: 1.2;
    }
    .deck-lbl {
      font-size: 7.5pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toc-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 18px;
      margin-bottom: 25px;
    }
    .toc-line {
      display: flex;
      align-items: baseline;
      font-size: 9pt;
      padding: 2px 0;
    }
    .toc-char {
      font-weight: 700;
      color: #0f172a;
      min-width: 20px;
      font-size: 10.5pt;
    }
    .toc-leader {
      flex: 1;
      border-bottom: 1px dotted #cbd5e1;
      margin: 0 6px;
    }
    .toc-val {
      font-size: 8pt;
      color: #64748b;
    }
    .toc-instructions {
      padding: 10px 14px;
      background: #eff6ff;
      border-left: 3px solid #2563eb;
      font-size: 8.5pt;
      color: #1e40af;
      border-radius: 0 4px 4px 0;
      line-height: 1.5;
    }

    /* =========================================
       3. GENERAL LETTER MARKERS
       ========================================= */
    .letter-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      break-after: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
      margin: 14px 0 8px 0;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #0f172a;
    }
    .letter-char {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .letter-line {
      flex: 1;
      height: 1px;
      background: #cbd5e1;
    }
    .letter-meta {
      font-size: 7.5pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* =========================================
       4. TWO-COLUMN LEXICON LAYOUT (DEFAULT)
       ========================================= */
    .dictionary-view.two-column-layout {
      column-count: 2;
      column-gap: 18px;
      column-rule: 1px solid #e2e8f0;
    }
    .letter-group-block {
      break-inside: auto;
      margin-bottom: 14px;
    }
    .lexicon-card {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 5px 0 6px 0;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 3px;
    }
    .card-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 3px;
    }
    .headword-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
    }
    .headword-id {
      font-size: 6.5pt;
      font-family: monospace;
      color: #94a3b8;
    }
    .translations-grid {
      display: flex;
      flex-direction: column;
      gap: 2.5px;
    }
    /* Strictly Aligned Columns for all translations */
    .trans-row {
      display: grid;
      grid-template-columns: 56px 1fr;
      column-gap: 8px;
      align-items: baseline;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .trans-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 1px 4px;
      border-radius: 3px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trans-value {
      color: #334155;
      word-break: break-word;
    }

    /* =========================================
       5. COMPACT INLINE LEXICON LAYOUT
       ========================================= */
    .dictionary-view.compact-layout {
      column-count: 2;
      column-gap: 18px;
      column-rule: 1px solid #e2e8f0;
    }
    .compact-letter-block {
      break-inside: auto;
      margin-bottom: 12px;
    }
    .compact-banner {
      margin-bottom: 6px;
    }
    .compact-entry-item {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 3px 0;
      border-bottom: 1px dotted #f1f5f9;
      font-size: 8.5pt;
      line-height: 1.4;
    }
    .compact-bullet {
      color: #2563eb;
      font-size: 6pt;
      vertical-align: middle;
      margin-right: 4px;
    }
    .compact-headword {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      margin-right: 4px;
    }
    .compact-id {
      font-size: 6.5pt;
      font-family: monospace;
      color: #94a3b8;
      margin-right: 4px;
    }
    .compact-definitions {
      color: #334155;
    }
    .compact-lang-lbl {
      font-size: 7.5pt;
      font-style: italic;
      color: #64748b;
      margin-right: 2px;
    }
    .compact-lang-val {
      font-weight: 500;
      color: #1e293b;
    }

    /* =========================================
       6. TABULAR GRID COMPARATIVE LAYOUT
       ========================================= */
    .dictionary-view.grid-layout {
      width: 100%;
    }
    .letter-section-container {
      margin-bottom: 18px;
      break-inside: auto;
    }
    .lexicon-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8.5pt;
    }
    .lexicon-table thead {
      display: table-header-group; /* repeats header on every printed page */
    }
    .lexicon-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lexicon-table td {
      padding: 5.5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      line-height: 1.35;
    }
    .lexicon-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .lexicon-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .td-primary {
      font-weight: 700;
      color: #0f172a;
    }
    .td-lang {
      color: #334155;
    }
    .td-id {
      font-family: monospace;
      font-size: 7pt;
      color: #94a3b8;
    }
    .cell-empty {
      color: #cbd5e1;
    }

    /* Screen and Print Adjustments */
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

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}
