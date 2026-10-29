# Harkas Admin documenten

Route: `/admin/documenten`. Only existing admin users can read or write documents. Enforcement applies in the route, Postgres RLS and Storage policies; customers and ordinary authenticated users have no access.

- Nested folders, customer associations, filename search and customer filtering.
- Multiple uploads or drag and drop, maximum 50 MB per file.
- Private blob downloads for PDF and raster image previews. No third-party Office viewer receives documents.
- TXT, MD, CSV, JSON, XML, YAML and LOG files up to 1 MB can be edited in the browser. Word/Excel files use download and new-version upload; no Office integration is configured.
- Each revision has a unique immutable storage object. Saving uses a transaction, row lock and expected version to reject concurrent edits. Old revisions can be downloaded.
- Deletion only sets `deleted_at`; restore is available. Client roles have no permanent DELETE privileges on metadata and no object overwrite/delete policy.
- Metadata is accessed directly through the existing Supabase Auth client so database RLS applies. These tables intentionally do not use the legacy HA query router.

## Backups

The existing Windows `HarkasBackups/scripts/Backup-Harkas.ps1` discovers all application schemas and all `storage.objects` dynamically. It includes this bucket and the three metadata tables without an allowlist change. Its backup role has `pg_read_all_data` and bypasses RLS. Storage credentials are already configured. Run a fresh backup after deployment and check storage counts and archive verification. The existing Neon database synchronization allowlist is separate; do not claim it replicates this new module until its schema and allowlist have been extended and verified. Laptop backup archives are also uploaded to the existing encrypted Neon archive mechanism.

## Nested folders and directory import

Folders now have `parent_id`. A sibling-name index permits the same name under different parents while preventing duplicate sibling names, and a database trigger rejects hierarchy cycles. The UI provides breadcrumbs, child-folder cards, a parent selector, and full paths in document properties.

`Map uploaden` uses the browser directory picker and `webkitRelativePath`. The selected directory is created below the current folder. Each file is saved with a distinct immutable object and version registration. Existing same-name documents are preserved and reported, not overwritten. Oversized files and per-file failures appear in a persistent import report. Successful items remain visible even after a partial failure; a retry skips existing names and continues with missing ones. Empty directories are not supplied by the browser. The list loads in pages so a migration does not silently stop at 1,000 documents.

The business root folders have been created. OneDrive business migration and credential transfer are separate subsequent steps; this change does not delete or import OneDrive originals.
