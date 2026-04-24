const STORAGE_KEY = "toast:savedNotesPIN";

interface PINData {
  salt: string;
  hash: string;
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(str: string): Uint8Array {
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}

async function derive(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
}

export function isPINEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export async function setPIN(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ salt: toBase64(salt), hash: toBase64(hash) } satisfies PINData),
  );
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true;
  const { salt, hash } = JSON.parse(stored) as PINData;
  const candidate = await derive(pin, fromBase64(salt));
  return toBase64(candidate) === hash;
}

export function clearPIN(): void {
  localStorage.removeItem(STORAGE_KEY);
}
