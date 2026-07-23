import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { supportsNoteMetadataColumns } from './notes.compat.js';

const FETCH_TIMEOUT_MS = 5000;
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const USER_AGENT = 'KawaNoteMetadataBot/1.0 (+https://kawanote.local)';

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Metadata fetch timeout')), timeoutMs);
    })
  ]);
}

function isPrivateHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  );
}

function sanitizeUrl(input) {
  if (!input) return null;

  try {
    const parsed = new URL(input);

    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    if (isPrivateHost(parsed.hostname)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function getMetaContent(html, attr, key) {
  const regex = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["'][^>]*>`,
    'i'
  );
  const match = html.match(regex);
  return decodeHtml(match?.[1] || match?.[2] || '');
}

function getTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return decodeHtml(titleMatch?.[1] || '');
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchPreviewData(url) {
  const response = await withTimeout(
    fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    }),
    FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Metadata fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const finalUrl = response.url || url;
  const parsed = new URL(finalUrl);

  const title = getMetaContent(html, 'property', 'og:title') || getMetaContent(html, 'name', 'twitter:title') || getTitle(html);
  const description =
    getMetaContent(html, 'property', 'og:description') ||
    getMetaContent(html, 'name', 'description') ||
    getMetaContent(html, 'name', 'twitter:description');
  const image =
    absoluteUrl(getMetaContent(html, 'property', 'og:image') || getMetaContent(html, 'name', 'twitter:image'), finalUrl);
  const siteName = getMetaContent(html, 'property', 'og:site_name');
  const type = getMetaContent(html, 'property', 'og:type');
  const canonical =
    absoluteUrl(getMetaContent(html, 'property', 'og:url'), finalUrl) ||
    absoluteUrl((html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || ''), finalUrl) ||
    finalUrl;

  return {
    title,
    description,
    image,
    ogSiteName: siteName,
    ogType: type,
    canonicalUrl: canonical,
    domain: parsed.hostname,
    fetchedAt: new Date().toISOString()
  };
}

export function queueMetadataEnrichment({ noteId, userId, tenantId, url }) {
  const parsedUrl = sanitizeUrl(url);
  if (!parsedUrl) {
    return;
  }

  setTimeout(async () => {
    try {
      const metadataSupported = await supportsNoteMetadataColumns();
      if (!metadataSupported) {
        return;
      }

      await prisma.note.updateMany({
        where: {
          id: noteId,
          userId,
          tenantId
        },
        data: {
          metadataStatus: 'processing'
        }
      });

      const previewData = await fetchPreviewData(parsedUrl.toString());

      await prisma.note.updateMany({
        where: {
          id: noteId,
          userId,
          tenantId
        },
        data: {
          previewData: JSON.stringify(previewData),
          metadataStatus: 'ready',
          metadataFetchedAt: new Date()
        }
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          noteId,
          tenantId
        },
        'Metadata enrichment failed'
      );

      await prisma.note.updateMany({
        where: {
          id: noteId,
          userId,
          tenantId
        },
        data: {
          metadataStatus: 'failed'
        }
      });
    }
  }, 0);
}
