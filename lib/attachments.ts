import { supabase } from "./supabase";
import { encryptFile, decryptFile, type MessagePayload } from "./crypto";

// Attachments are encrypted client-side with a random per-file AES-GCM key;
// the key travels inside the E2EE message envelope, so the storage bucket
// only ever holds opaque ciphertext under a random path.

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // single-shot AES-GCM in RAM

type FilePayload = Extract<MessagePayload, { kind: "file" }>;

async function imageDims(
  file: File
): Promise<{ w?: number; h?: number }> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const bmp = await createImageBitmap(file);
    const dims = { w: bmp.width, h: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return {};
  }
}

export async function encryptAndUpload(
  file: File,
  conversationId: string
): Promise<FilePayload> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Files up to 25 MB are supported.");
  }
  const [{ cipher, fk, fiv }, dims] = await Promise.all([
    file.arrayBuffer().then(encryptFile),
    imageDims(file),
  ]);

  const path = `${conversationId}/${crypto.randomUUID()}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, cipher, { contentType: "application/octet-stream" });
  if (error) throw new Error(error.message);

  return {
    kind: "file",
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    path,
    fk,
    fiv,
    ...dims,
  };
}

const urlCache = new Map<string, string>();

export async function downloadAndDecrypt(
  payload: FilePayload
): Promise<string> {
  const cached = urlCache.get(payload.path);
  if (cached) return cached;

  const { data, error } = await supabase.storage
    .from("attachments")
    .download(payload.path);
  if (error || !data) throw new Error(error?.message ?? "Download failed");

  const plain = await decryptFile(await data.arrayBuffer(), payload.fk, payload.fiv);
  const url = URL.createObjectURL(new Blob([plain], { type: payload.mime }));
  urlCache.set(payload.path, url);
  return url;
}

/** Drop a cached object URL (e.g. after a view-once is consumed). */
export function revokeAttachmentUrl(path: string): void {
  const url = urlCache.get(path);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(path);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
