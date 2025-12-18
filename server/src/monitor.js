let seq = 0;
const store = [];

export function startLog({ platform, model, operation, query, prompt, baseURL }) {
  const id = ++seq;
  const entry = {
    id,
    platform,
    baseURL,
    model,
    operation,
    query,
    prompt,
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  store.push(entry);
  if (store.length > 1000) store.shift();
  return id;
}

export function endLog(id, { success, error, response }) {
  const entry = store.find((e) => e.id === id);
  if (!entry) return;
  entry.doneAt = new Date().toISOString();
  entry.success = !!success;
  entry.status = 'done';
  entry.error = error ? String(error) : undefined;
  if (response) {
    const text = String(response);
    entry.response = text.length > 800 ? text.slice(0, 800) + '…' : text;
  }
}

export function getLogs(limit = 100) {
  const list = [...store].sort((a, b) => (a.id < b.id ? 1 : -1));
  return list.slice(0, limit);
}

export function clearLogs() {
  store.length = 0;
  seq = 0;
}
