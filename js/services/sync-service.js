/** Offline-first mutation queue. Failed writes are retained in IndexedDB and retried when online. */
import { saveSnapshot, loadSnapshot, removeSnapshot } from './offline-store.js';

const QUEUE_KEY = 'sync-queue';

async function readQueue() { return (await loadSnapshot(QUEUE_KEY)) || []; }
async function writeQueue(queue) { await saveSnapshot(QUEUE_KEY, queue); }

export async function enqueue(operation) {
  const queue = await readQueue();
  queue.push({ ...operation, id: crypto.randomUUID(), createdAt: Date.now() });
  await writeQueue(queue);
  return queue.at(-1);
}

export async function pendingCount() { return (await readQueue()).length; }

export async function flush(executor) {
  if (typeof executor !== 'function') throw new TypeError('flush requires an executor');
  if (!navigator.onLine) return { processed: 0, remaining: await pendingCount() };
  const queue = await readQueue();
  const remaining = [];
  let processed = 0;
  for (const operation of queue) {
    try {
      await executor(operation);
      processed++;
    } catch (_) {
      remaining.push(operation);
    }
  }
  await writeQueue(remaining);
  return { processed, remaining: remaining.length };
}

export function bindOnlineFlush(executor, onResult = () => {}) {
  const handler = async () => onResult(await flush(executor));
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

export async function clearQueue() { await removeSnapshot(QUEUE_KEY); }
