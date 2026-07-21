/**
 * Import parsers — turn a CSV or XML file into a uniform shape:
 *   { columns: string[], rows: Array<Record<string,string>>, sourceFormat, hasFolderPath }
 *
 * Folder hierarchy is always exposed as a normal column named `__folderPath`
 * (a "/"-separated path), so CSV folder columns and KeePass nested groups are
 * handled the same way downstream (see resolveFolderPath in useCredentialImport).
 *
 * All parsing happens in the browser — required by the app's E2E encryption
 * (the server never sees credential plaintext).
 */

import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';

export const FOLDER_PATH_COLUMN = '__folderPath';
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB

/** @param {any} value @returns {any[]} */
function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse CSV text via papaparse.
 * @param {string} text
 * @returns {{ columns: string[], rows: Array<Record<string,string>>, sourceFormat: string, hasFolderPath: boolean }}
 */
export function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  const columns = (result.meta?.fields || []).filter(Boolean);
  const rows = (result.data || []).map((row) => {
    const clean = {};
    for (const col of columns) {
      const v = row[col];
      clean[col] = v == null ? '' : String(v);
    }
    return clean;
  });

  return { columns, rows, sourceFormat: 'csv', hasFolderPath: false };
}

/**
 * Extract the Key/Value String map of a KeePass <Entry>.
 * @param {any} entry
 * @returns {Record<string,string>}
 */
function extractKeePassStrings(entry) {
  const map = {};
  for (const s of toArray(entry.String)) {
    if (!s || s.Key == null) continue;
    const key = String(s.Key).trim();
    let value = s.Value;
    if (value && typeof value === 'object') {
      value = value['#text'] ?? '';
    }
    map[key] = value == null ? '' : String(value);
  }
  return map;
}

/**
 * Recursively walk KeePass groups, accumulating entries with their folder path.
 * @param {any} group
 * @param {string[]} path
 * @param {Array<Record<string,string>>} rows
 */
function walkKeePassGroup(group, path, rows) {
  for (const entry of toArray(group.Entry)) {
    rows.push({ ...extractKeePassStrings(entry), [FOLDER_PATH_COLUMN]: path.join('/') });
  }
  for (const sub of toArray(group.Group)) {
    const name = String(sub.Name ?? '').trim();
    walkKeePassGroup(sub, name ? [...path, name] : path, rows);
  }
}

/**
 * Parse XML text. Detects KeePass (nested Group/Entry/String) and falls back to
 * a generic "repeated element" strategy for flat XML exports.
 * @param {string} text
 * @returns {{ columns: string[], rows: Array<Record<string,string>>, sourceFormat: string, hasFolderPath: boolean }}
 */
export function parseXML(text) {
  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    parseTagValue: false
  });
  const parsed = parser.parse(text);

  // KeePass 2.x export
  const root = parsed?.KeePassFile?.Root;
  if (root) {
    const rows = [];
    // Top group(s): their direct entries are treated as "no folder"; subgroups become folders.
    for (const topGroup of toArray(root.Group)) {
      walkKeePassGroup(topGroup, [], rows);
    }
    const keys = new Set();
    rows.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    keys.add(FOLDER_PATH_COLUMN);
    return { columns: [...keys], rows, sourceFormat: 'keepass', hasFolderPath: true };
  }

  // Generic flat XML: find the most common repeated element and treat each as a row.
  const rows = genericXmlRows(parsed);
  const keys = new Set();
  rows.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
  return { columns: [...keys], rows, sourceFormat: 'xml', hasFolderPath: false };
}

/**
 * Best-effort extraction of row-like records from an arbitrary parsed XML tree:
 * pick the deepest array of objects (the repeated record set).
 * @param {any} node
 * @returns {Array<Record<string,string>>}
 */
function genericXmlRows(node) {
  let best = [];

  const visit = (value) => {
    if (Array.isArray(value)) {
      const objects = value.filter((v) => v && typeof v === 'object' && !Array.isArray(v));
      if (objects.length > best.length) {
        best = objects;
      }
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };

  visit(node);

  return best.map((obj) => {
    const flat = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) {
        flat[k] = '';
      } else if (typeof v === 'object') {
        flat[k] = v['#text'] != null ? String(v['#text']) : '';
      } else {
        flat[k] = String(v);
      }
    }
    return flat;
  });
}

/**
 * Read a File and parse it by extension/content.
 * @param {File} file
 * @returns {Promise<{ columns: string[], rows: Array<Record<string,string>>, sourceFormat: string, hasFolderPath: boolean }>}
 */
export async function parseImportFile(file) {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('Arquivo muito grande. Máximo permitido: 10 MB.');
  }

  const text = await file.text();
  const name = (file.name || '').toLowerCase();
  const looksXml = name.endsWith('.xml') || /^\s*<\?xml|^\s*<KeePassFile/i.test(text);

  const parsed = looksXml ? parseXML(text) : parseCSV(text);

  if (!parsed.rows.length) {
    throw new Error('Nenhuma linha encontrada no arquivo. Verifique o formato.');
  }

  return parsed;
}
