import { isIP, isIPv4 } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicCardAssetUrl } from "@/lib/card-registry";

export const CARD_ASSET_BUCKET = "card-assets";
export const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

const ALLOWED_ARTWORK_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export type ArtworkKind = "reference" | "artwork" | "render" | "thumbnail" | "alternate";

export type ArtworkInput = {
  kind?: ArtworkKind | null;
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  bytes?: Uint8Array | null;
};

export type StoredArtwork = {
  id: string;
  kind: ArtworkKind;
  storagePath: string;
  mimeType: string | null;
  url: string | null;
};

export class ArtworkIngestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ArtworkIngestError";
    this.status = status;
  }
}

function normalizeMime(value: string | null | undefined): string | null {
  if (!value) return null;
  const mime = value.split(";")[0]?.trim().toLowerCase();
  if (!mime) return null;
  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "::1" || host === "0.0.0.0") return true;
  if (!isIP(host)) return false;
  if (isIPv4(host)) return isPrivateIpv4(host);
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("::ffff:")) return isPrivateIpv4(host.slice(7));
  return false;
}

async function readImageResponse(response: Response) {
  if (!response.ok) {
    throw new ArtworkIngestError(`Unable to download artwork (${response.status}).`);
  }
  const mimeType = normalizeMime(response.headers.get("content-type"));
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.byteLength) throw new ArtworkIngestError("Artwork file was empty.");
  if (buffer.byteLength > MAX_ARTWORK_BYTES) {
    throw new ArtworkIngestError("Artwork exceeds the 8MB size limit.");
  }
  return { bytes: new Uint8Array(buffer), mimeType };
}

async function bytesFromUrl(urlString: string): Promise<{ bytes: Uint8Array; mimeType: string | null }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new ArtworkIngestError("Artwork URL is not valid.");
  }
  if (parsed.protocol !== "https:") {
    throw new ArtworkIngestError("Artwork URLs must use HTTPS.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new ArtworkIngestError("Artwork URL host is not allowed.");
  }

  const response = await fetch(parsed.toString(), {
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "image/*,*/*;q=0.8" }
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new ArtworkIngestError("Artwork URL redirected without a location.");
    const redirected = new URL(location, parsed);
    if (redirected.protocol !== "https:" || isBlockedHost(redirected.hostname)) {
      throw new ArtworkIngestError("Artwork URL redirected to a host that is not allowed.");
    }
    const followed = await fetch(redirected.toString(), {
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "image/*,*/*;q=0.8" }
    });
    return readImageResponse(followed);
  }

  return readImageResponse(response);
}

function bytesFromBase64(value: string): Uint8Array {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:([^;,]+);base64,(.+)$/i);
  const payload = (match ? match[2] : trimmed).replace(/\s+/g, "");
  const buffer = Buffer.from(payload, "base64");
  if (!buffer.byteLength) throw new ArtworkIngestError("Artwork base64 payload was empty.");
  if (buffer.byteLength > MAX_ARTWORK_BYTES) {
    throw new ArtworkIngestError("Artwork exceeds the 8MB size limit.");
  }
  return new Uint8Array(buffer);
}

export async function ingestArtwork(input: ArtworkInput): Promise<{ bytes: Uint8Array; mimeType: string }> {
  let bytes: Uint8Array;
  let declared = normalizeMime(input.mimeType);

  if (input.bytes && input.bytes.byteLength) {
    if (input.bytes.byteLength > MAX_ARTWORK_BYTES) {
      throw new ArtworkIngestError("Artwork exceeds the 8MB size limit.");
    }
    bytes = input.bytes;
  } else if (input.base64?.trim()) {
    const dataUrl = input.base64.trim().match(/^data:([^;,]+);base64,/i);
    if (dataUrl) declared = normalizeMime(dataUrl[1]) ?? declared;
    bytes = bytesFromBase64(input.base64);
  } else if (input.url?.trim()) {
    const downloaded = await bytesFromUrl(input.url.trim());
    bytes = downloaded.bytes;
    declared = downloaded.mimeType ?? declared;
  } else {
    throw new ArtworkIngestError("Provide artworkUrl, artworkBase64, or an image file.");
  }

  const sniffed = sniffMime(bytes);
  const mimeType = sniffed ?? declared;
  if (!mimeType || !ALLOWED_ARTWORK_TYPES.has(mimeType)) {
    throw new ArtworkIngestError("Artwork must be a JPEG, PNG, WebP, or GIF image.");
  }
  return { bytes, mimeType };
}

function normalizeKind(kind?: ArtworkKind | null): ArtworkKind {
  if (kind && ["reference", "artwork", "render", "thumbnail", "alternate"].includes(kind)) {
    return kind;
  }
  // Cardsmith / ChatGPT uploads a finished Magic card unless a kind is set.
  return "render";
}

export async function storeCardArtwork(
  supabase: SupabaseClient,
  options: {
    cardId: string;
    versionId: string;
    input: ArtworkInput;
    createdBy?: string | null;
  }
): Promise<StoredArtwork> {
  const kind = normalizeKind(options.input.kind);
  const { bytes, mimeType } = await ingestArtwork(options.input);
  const storagePath = `${options.cardId}/${options.versionId}/${kind}-${crypto.randomUUID()}.${extensionForMime(mimeType)}`;

  const { error: uploadError } = await supabase.storage.from(CARD_ASSET_BUCKET).upload(storagePath, Buffer.from(bytes), {
    contentType: mimeType,
    upsert: false
  });
  if (uploadError) {
    throw new ArtworkIngestError(`Unable to store artwork: ${uploadError.message}`, 500);
  }

  const { data, error } = await supabase
    .from("card_assets")
    .insert({
      card_version_id: options.versionId,
      kind,
      storage_path: storagePath,
      mime_type: mimeType,
      created_by: options.createdBy ?? null
    })
    .select("id, kind, storage_path, mime_type")
    .single();
  if (error) throw new ArtworkIngestError(`Unable to record artwork: ${error.message}`, 500);

  return {
    id: data.id,
    kind: data.kind as ArtworkKind,
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    url: publicCardAssetUrl(data.storage_path)
  };
}

export function collectArtworkInputs(payload: {
  version?: {
    artworkUrl?: string | null;
    artworkBase64?: string | null;
    artworkMimeType?: string | null;
    rendererData?: Record<string, unknown>;
  };
  assets?: ArtworkInput[] | null;
}): ArtworkInput[] {
  const inputs: ArtworkInput[] = [];
  const version = payload.version;
  if (version?.artworkUrl || version?.artworkBase64) {
    inputs.push({
      kind: "render",
      url: version.artworkUrl,
      base64: version.artworkBase64,
      mimeType: version.artworkMimeType
    });
  }

  const rendererArt = version?.rendererData && typeof version.rendererData === "object"
    ? (
      typeof version.rendererData.artworkUrl === "string"
        ? version.rendererData.artworkUrl
        : typeof version.rendererData.imageUrl === "string"
          ? version.rendererData.imageUrl
          : null
    )
    : null;
  if (rendererArt && !inputs.some((item) => item.url === rendererArt)) {
    inputs.push({ kind: "render", url: rendererArt });
  }

  for (const asset of payload.assets ?? []) {
    if (asset?.url || asset?.base64 || asset?.bytes) inputs.push(asset);
  }
  return inputs;
}

export function pickPrimaryAssetUrl(
  assets: Array<{ kind?: string | null; url?: string | null; storage_path?: string | null; created_at?: string | null }>
): string | null {
  const ranked = [...assets].sort((a, b) => {
    const score = (kind?: string | null) => {
      if (kind === "render") return 0;
      if (kind === "artwork") return 1;
      if (kind === "thumbnail") return 2;
      return 3;
    };
    const kindDelta = score(a.kind) - score(b.kind);
    if (kindDelta !== 0) return kindDelta;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });
  const first = ranked[0];
  if (!first) return null;
  return first.url ?? publicCardAssetUrl(first.storage_path) ?? null;
}
