import { portalSupabase as db } from '@/integrations/supabase/client';
import { MAX_FILE_SIZE, pdfFilename, uid } from './model';

export type StoredVersion = { version: number; storage_path: string; size_bytes: number; mime_type: string };
export type StoredPdf = { id: string; name: string; folder_id: string | null; customer_id: string | null; document_versions: StoredVersion[] };
export type PdfFolder = { id: string; name: string; parent_id: string | null };
export const latestVersion = (doc: StoredPdf) => [...doc.document_versions].sort((a, b) => b.version - a.version)[0];
const bucket = db.storage.from('admin-documents');
function check<T extends { error?: { message: string } | null }>(result: T): T {
  if (result.error) throw new Error(result.error.message);
  return result;
}
export async function listPdfDocuments(): Promise<StoredPdf[]> {
  const rows: StoredPdf[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data } = check(await db.from('documents').select('id,name,folder_id,customer_id,document_versions(version,storage_path,size_bytes,mime_type)').is('deleted_at', null).order('updated_at', { ascending: false }).order('id').range(offset, offset + 499));
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows.filter(d => /\.pdf$/i.test(d.name) || latestVersion(d)?.mime_type === 'application/pdf');
}
export async function getPdfDocument(id: string): Promise<StoredPdf> {
  return check(await db.from('documents').select('id,name,folder_id,customer_id,document_versions(version,storage_path,size_bytes,mime_type)').eq('id', id).is('deleted_at', null).single()).data;
}
export async function downloadStoredPdf(doc: StoredPdf): Promise<File> {
  const version = latestVersion(doc);
  if (!version) throw new Error('Dit document heeft geen opgeslagen versie.');
  const { data } = check(await bucket.download(version.storage_path));
  return new File([data], doc.name, { type: 'application/pdf' });
}
export async function listPdfFolders(): Promise<PdfFolder[]> {
  const rows: PdfFolder[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data } = check(await db.from('document_folders').select('id,name,parent_id').order('name').order('id').range(offset, offset + 499));
    rows.push(...data); if (data.length < 500) return rows;
  }
}
export function folderPath(folder: PdfFolder, folders: PdfFolder[]) {
  const path = [folder.name], seen = new Set([folder.id]); let parent = folder.parent_id;
  while (parent && !seen.has(parent)) {
    seen.add(parent); const found = folders.find(f => f.id === parent); if (!found) break;
    path.unshift(found.name); parent = found.parent_id;
  }
  return path.join(' / ');
}
export async function saveStoredPdf(bytes: Uint8Array, name: string, folderId: string | null, existing: StoredPdf | null): Promise<StoredPdf> {
  if (bytes.length > MAX_FILE_SIZE) throw new Error('Het resultaat is groter dan 50 MB. Download de PDF of verwijder enkele pagina’s.');
  const file = new File([new Uint8Array(bytes)], pdfFilename(name), { type: 'application/pdf' });
  const path = `${uid()}/${uid()}`;
  check(await bucket.upload(path, file, { contentType: 'application/pdf', upsert: false }));
  const version = existing ? latestVersion(existing).version : 0;
  const { data: id } = check(await db.rpc('save_document_version', {
    p_document_id: existing?.id || null, p_name: file.name,
    p_folder_id: existing?.folder_id ?? folderId, p_customer_id: existing?.customer_id || null,
    p_storage_path: path, p_mime_type: 'application/pdf', p_size_bytes: file.size, p_expected_version: version,
  }));
  // No follow-up fetch needed: a successful RPC is the authoritative saved revision.
  return { id, name: existing?.name || file.name, folder_id: existing?.folder_id ?? folderId,
    customer_id: existing?.customer_id || null,
    document_versions: [{ version: version + 1, storage_path: path, size_bytes: file.size, mime_type: 'application/pdf' }] };
}
