// Tiny in-memory cache so navigating between pages does not refetch the
// catalogue every time. Lives for the browser session (module scope).
const store = new Map();

export function cached(key, loader, ttlMs = 60_000) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = loader().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: Date.now(), promise });
  return promise;
}

export function invalidate(prefix = "") {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
