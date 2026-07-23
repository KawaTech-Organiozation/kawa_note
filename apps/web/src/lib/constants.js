// Sentinel for "Sem Pasta" virtual folder
export const NO_FOLDER_SENTINEL = {
  id: '__no_folder__',
  name: 'Sem Pasta',
  virtual: true,
};

// Safe URL transform for Markdown rendering
const SAFE_PROTOCOLS = ['http', 'https', 'mailto'];

export const safeUrlTransform = (url) => {
  try {
    const { protocol } = new URL(url);
    return SAFE_PROTOCOLS.some((p) => protocol === p + ':') ? url : '#';
  } catch {
    // Relative URLs pass through
    return url;
  }
};
