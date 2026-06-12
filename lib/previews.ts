import { idb } from "./idb";

// E2EE leaves conversations.last_message_text permanently null, so list
// previews come from this device-local map of decrypted snippets.

export type Preview = { text: string; at: string };
type PreviewMap = Record<string, Preview>;

let cache: PreviewMap | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<PreviewMap> {
  if (!cache) cache = (await idb.kvGet<PreviewMap>("previews")) ?? {};
  return cache;
}

export async function getPreviews(): Promise<PreviewMap> {
  return { ...(await load()) };
}

export async function setPreview(
  conversationId: string,
  preview: Preview
): Promise<void> {
  const map = await load();
  const existing = map[conversationId];
  if (existing && existing.at > preview.at) return; // never go backwards
  map[conversationId] = preview;
  await idb.kvSet("previews", map);
  listeners.forEach((l) => l());
}

export async function removePreview(conversationId: string): Promise<void> {
  const map = await load();
  delete map[conversationId];
  await idb.kvSet("previews", map);
  listeners.forEach((l) => l());
}

export function onPreviewsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
