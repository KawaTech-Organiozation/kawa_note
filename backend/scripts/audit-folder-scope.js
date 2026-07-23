/**
 * Auditoria de escopo de pastas (PLAN-20260723-001, Etapa 0).
 *
 * Uma nota `type='password'` (credencial do Cofre) deve viver em pasta
 * `scope='vault'`; qualquer outro tipo deve viver em pasta `scope='note'`.
 * Até a Etapa 1 deste plano, o backend não impunha essa correspondência
 * (`ensureActiveFolder` validava apenas dono/existência), então dados legados
 * podem estar em escopo trocado.
 *
 * Este script é SOMENTE LEITURA. Ele não corrige nada — apenas relata.
 *
 * Uso:
 *   node scripts/audit-folder-scope.js
 *
 * Saída: contagem e amostra dos registros divergentes, por direção do erro.
 */

import { prisma } from '../src/config/database.js';

const SAMPLE_SIZE = 20;

/** Nota de credencial guardada em pasta que não é do Cofre. */
async function findCredentialsOutsideVault() {
  return prisma.note.findMany({
    where: {
      deletedAt: null,
      type: 'password',
      folderId: { not: null },
      folder: { scope: { not: 'vault' }, deletedAt: null }
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      folderId: true,
      folder: { select: { name: true, scope: true } }
    }
  });
}

/** Nota comum guardada em pasta do Cofre. */
async function findNotesInsideVault() {
  return prisma.note.findMany({
    where: {
      deletedAt: null,
      type: { not: 'password' },
      folderId: { not: null },
      folder: { scope: 'vault', deletedAt: null }
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      type: true,
      folderId: true,
      folder: { select: { name: true, scope: true } }
    }
  });
}

function report(label, rows) {
  console.log(`\n=== ${label}: ${rows.length} registro(s) ===`);

  if (rows.length === 0) {
    console.log('OK — nenhuma divergência.');
    return;
  }

  for (const row of rows.slice(0, SAMPLE_SIZE)) {
    console.log(
      `  note=${row.id} tenant=${row.tenantId} user=${row.userId} ` +
      `folder="${row.folder?.name}" scope=${row.folder?.scope}`
    );
  }

  if (rows.length > SAMPLE_SIZE) {
    console.log(`  ... e mais ${rows.length - SAMPLE_SIZE}.`);
  }
}

async function main() {
  const [credentialsOutside, notesInside] = await Promise.all([
    findCredentialsOutsideVault(),
    findNotesInsideVault()
  ]);

  report('Credenciais (type=password) em pasta NÃO-vault', credentialsOutside);
  report('Notas comuns em pasta vault', notesInside);

  const total = credentialsOutside.length + notesInside.length;
  console.log(`\n=== TOTAL DIVERGENTE: ${total} ===`);

  if (total > 0) {
    console.log(
      'Estes registros são anteriores à Etapa 1. Eles continuam editáveis: a\n' +
      'validação de escopo só é aplicada quando a pasta da nota é alterada.\n' +
      'Para normalizá-los, mova cada nota para uma pasta do escopo correto.'
    );
  }

  await prisma.$disconnect();
  process.exit(total > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Falha na auditoria:', error);
  await prisma.$disconnect();
  process.exit(2);
});
