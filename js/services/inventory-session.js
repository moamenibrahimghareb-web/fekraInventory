import { supabaseClient } from '../core/supabase-client.js';
import { normalizeName } from '../utils/formatting.js';
import { saveSnapshot, loadSnapshot } from './offline-store.js';

const CACHE_KEY = 'inventory-session';

class InventorySessionService {
  constructor() { this.session = null; }

  async create(name = 'جرد جديد', comparisonScope = 'partial') {
    const { data, error } = await supabaseClient.client
      .from('inventory_sessions')
      .insert({ name, comparison_scope: comparisonScope, status: 'draft' })
      .select()
      .single();
    if (error) throw error;
    this.session = data;
    await this.persist();
    return data;
  }

  async loadLatest() {
    try {
      const { data, error } = await supabaseClient.client
        .from('inventory_sessions')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      this.session = data;
      await this.persist();
      return data;
    } catch (error) {
      this.session = await loadSnapshot(CACHE_KEY);
      return this.session;
    }
  }

  async saveCounts(products) {
    if (!this.session?.id) await this.create();
    const rows = products.map(product => ({
      session_id: this.session.id,
      product_name: String(product.name || '').trim(),
      normalized_name: normalizeName(product.name),
      barcode: String(product.barcode || ''),
      quantities: Array.isArray(product.quantities) ? product.quantities : [],
      total_quantity: Number(product.totalQuantity) || 0,
      unit_price: Number(product.unitPrice) || 0
    }));
    const { error } = await supabaseClient.client
      .from('inventory_counts')
      .upsert(rows, { onConflict: 'session_id,normalized_name' });
    if (error) throw error;
    await this.persist();
  }

  async complete() {
    if (!this.session?.id) return;
    const { data, error } = await supabaseClient.client
      .from('inventory_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', this.session.id)
      .select()
      .single();
    if (error) throw error;
    this.session = data;
    await this.persist();
  }

  async persist() { if (this.session) await saveSnapshot(CACHE_KEY, this.session); }
  get id() { return this.session?.id || null; }
  get current() { return this.session; }
}

export const inventorySessionService = new InventorySessionService();
export default InventorySessionService;
