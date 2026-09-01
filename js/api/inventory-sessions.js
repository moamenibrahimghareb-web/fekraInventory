/** Inventory session repository. Keeps historical inventories immutable after completion. */
import { supabaseClient } from '../core/supabase-client.js';

const table = 'inventory_sessions';
const countsTable = 'inventory_counts';

export async function listSessions({ includeArchived = false } = {}) {
  await supabaseClient.init();
  let query = supabaseClient.client.from(table).select('*').order('created_at', { ascending: false });
  if (!includeArchived) query = query.neq('status', 'archived');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSession({ name = 'جرد جديد', comparisonScope = 'partial' } = {}) {
  await supabaseClient.init();
  const { data, error } = await supabaseClient.client
    .from(table)
    .insert({ name: String(name).trim() || 'جرد جديد', comparison_scope: comparisonScope })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSession(id) {
  await supabaseClient.init();
  const { data, error } = await supabaseClient.client.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getSessionCounts(sessionId) {
  await supabaseClient.init();
  const { data, error } = await supabaseClient.client
    .from(countsTable).select('*').eq('session_id', sessionId).order('id');
  if (error) throw error;
  return data || [];
}

export async function upsertCount(sessionId, item) {
  await supabaseClient.init();
  const normalizedName = String(item.normalizedName || item.name || '').trim();
  if (!normalizedName) throw new Error('اسم الصنف مطلوب');
  const row = {
    session_id: sessionId,
    product_name: String(item.name || '').trim(),
    normalized_name: normalizedName,
    barcode: String(item.barcode || '').trim(),
    quantities: Array.isArray(item.quantities) ? item.quantities : [],
    total_quantity: Number(item.totalQuantity) || 0,
    unit_price: Number(item.unitPrice) || 0
  };
  const { data, error } = await supabaseClient.client
    .from(countsTable).upsert(row, { onConflict: 'session_id,normalized_name' }).select().single();
  if (error) throw error;
  return data;
}

export async function completeSession(id) {
  await supabaseClient.init();
  const { data, error } = await supabaseClient.client
    .from(table).update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'draft').select().single();
  if (error) throw error;
  return data;
}

export async function archiveSession(id) {
  await supabaseClient.init();
  const { data, error } = await supabaseClient.client
    .from(table).update({ status: 'archived' }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
