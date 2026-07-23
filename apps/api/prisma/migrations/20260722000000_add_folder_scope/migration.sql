-- Separate Cofre (credential) folders from Notes folders.
ALTER TABLE "folders" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'note';

CREATE INDEX "idx_folders_scope_lookup"
  ON "folders"("tenant_id", "user_id", "scope", "deleted_at");

-- Backfill: a folder becomes 'vault' only when its ENTIRE subtree holds at least
-- one credential and no ordinary note (so no note ever disappears from Notes).
-- `roll` pushes each node's direct flags up to every ancestor; bool_or per id
-- aggregates over the subtree.
WITH RECURSIVE flags AS (
  SELECT f.id, f.parent_folder_id,
    EXISTS(SELECT 1 FROM notes n WHERE n.folder_id = f.id AND n.type = 'password'  AND n.deleted_at IS NULL) AS has_cred,
    EXISTS(SELECT 1 FROM notes n WHERE n.folder_id = f.id AND n.type <> 'password' AND n.deleted_at IS NULL) AS has_note
  FROM folders f
  WHERE f.deleted_at IS NULL
),
roll AS (
  SELECT id, parent_folder_id, has_cred, has_note FROM flags
  UNION ALL
  SELECT parent.id, parent.parent_folder_id, roll.has_cred, roll.has_note
  FROM roll
  JOIN folders parent ON parent.id = roll.parent_folder_id AND parent.deleted_at IS NULL
),
agg AS (
  SELECT id, bool_or(has_cred) AS cred, bool_or(has_note) AS note
  FROM roll
  GROUP BY id
)
UPDATE folders SET scope = 'vault'
FROM agg
WHERE folders.id = agg.id AND agg.cred AND NOT agg.note;
