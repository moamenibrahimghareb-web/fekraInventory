/**
 * Bridge between the existing HTML UI and the new inventory-session architecture.
 * Keeps the legacy UI functions small while making sessions the source of truth.
 */
import { inventorySessionService } from '../services/inventory-session-service.js';
import { stateManager } from '../core/state.js';

export async function ensureActiveSession(name = 'جرد جديد') {
  const current = stateManager.get('activeSession');
  if (current?.id) return current;

  const session = await inventorySessionService.createSession({
    name,
    comparisonScope: stateManager.get('comparisonScope') || 'partial'
  });

  stateManager.update({ activeSession: session });
  return session;
}

export async function loadActiveSession(sessionId) {
  const session = await inventorySessionService.getSession(sessionId);
  if (!session) return null;

  const counts = await inventorySessionService.getSessionCounts(session.id);
  stateManager.update({
    activeSession: session,
    products: counts
  });
  return { session, counts };
}

export async function saveCount(product) {
  const session = await ensureActiveSession();
  const count = await inventorySessionService.upsertCount(session.id, product);
  const products = stateManager.get('products');
  const index = products.findIndex(p => p.normalized_name === count.normalized_name);
  const next = [...products];
  if (index >= 0) next[index] = count;
  else next.push(count);
  stateManager.setProducts(next);
  return count;
}

export async function completeActiveSession() {
  const session = stateManager.get('activeSession');
  if (!session?.id) return null;
  const completed = await inventorySessionService.completeSession(session.id);
  stateManager.update({ activeSession: completed });
  return completed;
}
