/**
 * Import column presets & auto-mapping.
 *
 * Target credential fields the import maps into. Each source file column is
 * assigned (by preset or by the user) to one of these targets. `title` and
 * `password` are required.
 */

import { FOLDER_PATH_COLUMN } from './importParsers';

export const TARGET_FIELDS = [
  { key: 'title', label: 'Título', required: true },
  { key: 'username', label: 'Usuário', required: false },
  { key: 'password', label: 'Senha', required: true },
  { key: 'url', label: 'URL', required: false },
  { key: 'tags', label: 'Tags', required: false },
  { key: 'notes', label: 'Notas', required: false },
  { key: 'folder', label: 'Pasta', required: false }
];

export const REQUIRED_TARGETS = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);

/**
 * Known exporters, detected by their column signatures.
 * mapping: target -> source column name.
 */
const PRESETS = [
  {
    name: 'KeePass (XML)',
    detect: (cols) => cols.includes('Title') && cols.includes('Password') && cols.includes(FOLDER_PATH_COLUMN),
    mapping: {
      title: 'Title',
      username: 'UserName',
      password: 'Password',
      url: 'URL',
      notes: 'Notes',
      folder: FOLDER_PATH_COLUMN
    }
  },
  {
    name: 'Bitwarden (CSV)',
    detect: (cols) => cols.includes('login_password') || cols.includes('login_username'),
    mapping: {
      title: 'name',
      username: 'login_username',
      password: 'login_password',
      url: 'login_uri',
      notes: 'notes',
      folder: 'folder'
    }
  },
  {
    name: 'LastPass (CSV)',
    detect: (cols) => cols.includes('grouping') && cols.includes('password') && cols.includes('name'),
    mapping: {
      title: 'name',
      username: 'username',
      password: 'password',
      url: 'url',
      notes: 'extra',
      folder: 'grouping'
    }
  },
  {
    name: 'Chrome / Edge (CSV)',
    detect: (cols) => cols.includes('name') && cols.includes('password') && cols.includes('url') && (cols.includes('note') || cols.includes('username')),
    mapping: {
      title: 'name',
      username: 'username',
      password: 'password',
      url: 'url',
      notes: 'note'
    }
  }
];

// Fuzzy aliases for generic auto-mapping (lowercased source header -> target).
const ALIASES = {
  title: ['title', 'name', 'account', 'nome', 'titulo', 'título'],
  username: ['username', 'user', 'login', 'login_username', 'email', 'e-mail', 'usuario', 'usuário', 'user_name'],
  password: ['password', 'pass', 'pwd', 'senha', 'login_password'],
  url: ['url', 'uri', 'login_uri', 'website', 'site', 'link', 'address'],
  tags: ['tags', 'tag', 'labels', 'label'],
  notes: ['notes', 'note', 'extra', 'comments', 'comment', 'notas', 'observacao', 'observação', 'description'],
  folder: ['folder', 'group', 'grouping', 'collection', 'category', 'pasta', 'grupo', FOLDER_PATH_COLUMN.toLowerCase()]
};

/**
 * Fuzzy auto-map columns to targets by header name.
 * @param {string[]} columns
 * @returns {Record<string,string>} target -> source column (only assigned ones)
 */
export function autoMap(columns) {
  const mapping = {};
  const used = new Set();

  for (const { key } of TARGET_FIELDS) {
    const aliases = ALIASES[key] || [];
    const match = columns.find(
      (col) => !used.has(col) && aliases.includes(col.trim().toLowerCase())
    );
    if (match) {
      mapping[key] = match;
      used.add(match);
    }
  }

  return mapping;
}

/**
 * Detect a preset (or fall back to fuzzy auto-map). Only keeps mappings whose
 * source column actually exists in the file.
 * @param {string[]} columns
 * @returns {{ presetName: string, mapping: Record<string,string> }}
 */
export function detectMapping(columns) {
  const colSet = new Set(columns);

  for (const preset of PRESETS) {
    if (preset.detect(columns)) {
      const mapping = {};
      for (const [target, source] of Object.entries(preset.mapping)) {
        if (colSet.has(source)) mapping[target] = source;
      }
      return { presetName: preset.name, mapping };
    }
  }

  return { presetName: 'Detecção automática', mapping: autoMap(columns) };
}
