export interface LocalTestEnvelope<T> {
  version: number;
  data: T;
}

export function persistLocalDatabaseSnapshot<T>(key: string, version: number, data: T) {
  if (typeof window === "undefined") return;
  void fetch("/api/local-data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, version, data }),
    keepalive: true,
  }).catch(() => {
    // The browser cache remains available; the next database bridge pass retries migration.
  });
}

export function readLocalTestData<T>(key: string, version: number, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LocalTestEnvelope<T>>;
    return parsed.version === version && parsed.data !== undefined ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalTestData<T>(key: string, version: number, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ version, data } satisfies LocalTestEnvelope<T>));
    persistLocalDatabaseSnapshot(key, version, data);
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

export function removeLocalTestData(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore restricted browser storage contexts.
  }
}
