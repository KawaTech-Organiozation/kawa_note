import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

let metadataSupportPromise;
let hasLoggedMissingColumns = false;

async function detectNoteMetadataSupport() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'notes'
        AND column_name IN ('metadata_status', 'metadata_fetched_at')
    `;

    const columnNames = new Set(columns.map(column => column.column_name));
    const supported = columnNames.has('metadata_status') && columnNames.has('metadata_fetched_at');

    if (!supported && !hasLoggedMissingColumns) {
      hasLoggedMissingColumns = true;
      logger.warn('Note metadata columns are missing; metadata enrichment is temporarily disabled until migrations are applied');
    }

    return supported;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to detect note metadata columns; metadata enrichment will be skipped');
    return false;
  }
}

export async function supportsNoteMetadataColumns() {
  if (!metadataSupportPromise) {
    metadataSupportPromise = detectNoteMetadataSupport();
  }

  return metadataSupportPromise;
}

export function buildNoteScalarSelect(includeMetadata = false) {
  return {
    id: true,
    title: true,
    content: true,
    type: true,
    url: true,
    previewData: true,
    tags: true,
    context: true,
    isEncrypted: true,
    pinned: true,
    folderId: true,
    userId: true,
    tenantId: true,
    deletedAt: true,
    deletedByUserId: true,
    createdAt: true,
    updatedAt: true,
    ...(includeMetadata && {
      metadataStatus: true,
      metadataFetchedAt: true
    })
  };
}
