/** Centralized Supabase client. */
import CONFIG from '../config.js';
import { createLogger } from '../utils/logger.js';
import { chunk } from '../services/import-service.js';
const logger = createLogger('SupabaseClient');

class SupabaseClientManager {
  constructor() { this.client = null; this.subscriptions = new Set(); this.initialized = false; }
  async init() {
    if (this.initialized) return this.client;
    if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) throw new Error('Supabase configuration is missing');
    if (!window.supabase?.createClient) throw new Error('Supabase library not loaded');
    this.client = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
    this.initialized = true;
    return this.client;
  }
  async executeWithRetry(queryFn, maxAttempts = CONFIG.RETRY.MAX_ATTEMPTS) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try { return await queryFn(); } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, Math.min(CONFIG.RETRY.INITIAL_DELAY * 2 ** (attempt - 1), CONFIG.RETRY.MAX_DELAY)));
      }
    }
    throw lastError;
  }
  async getInventoryProducts() { return this.executeWithRetry(async () => { const {data,error}=await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).select('*').order('id'); if(error)throw error; return data||[]; }); }
  async getSystemItems() { return this.executeWithRetry(async () => { const {data,error}=await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).select('*').order('id'); if(error)throw error; return data||[]; }); }
  async insertProduct(product) { return this.executeWithRetry(async () => { const {data,error}=await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).insert(product).select().single(); if(error)throw error; return data; }); }
  async updateProduct(id,updates) { return this.executeWithRetry(async () => { const {data,error}=await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).update(updates).eq('id',id).select().single(); if(error)throw error; return data; }); }
  async deleteProduct(id) { return this.executeWithRetry(async () => { const {error}=await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).delete().eq('id',id); if(error)throw error; }); }
  async deleteAllInventoryProducts() { return this.executeWithRetry(async () => { const {error}=await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).delete().not('id','is',null); if(error)throw error; }); }
  async insertSystemItems(items) { const rows=Array.isArray(items)?items:[]; const inserted=[]; for(const part of chunk(rows,500)){ const result=await this.executeWithRetry(async()=>{const {data,error}=await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).insert(part).select();if(error)throw error;return data||[];}); inserted.push(...result); } return inserted; }
  async deleteAllSystemItems() { return this.executeWithRetry(async () => { const {error}=await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).delete().not('id','is',null); if(error)throw error; }); }
  async replaceSystemItems(items) {
    // Best-effort replacement until the PostgreSQL RPC is installed. Existing data is not touched if validation fails.
    await this.deleteAllSystemItems();
    return this.insertSystemItems(items);
  }
  subscribeToChanges(table,callback) { if(!this.client)return null; const channel=this.client.channel(`public:${table}:${Date.now()}`).on('postgres_changes',{event:'*',schema:'public',table},callback).subscribe(); this.subscriptions.add(channel); return channel; }
  unsubscribe(channel) { if(channel&&this.client){this.client.removeChannel(channel);this.subscriptions.delete(channel);} }
  unsubscribeAll() { if(this.client)this.subscriptions.forEach(c=>this.client.removeChannel(c)); this.subscriptions.clear(); }
  async healthCheck() { try { await this.executeWithRetry(async()=>{const {error}=await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).select('id').limit(1);if(error)throw error;},2);return true;}catch(error){logger.warn('Health check failed',error);return false;} }
}
export const supabaseClient=new SupabaseClientManager();
export default SupabaseClientManager;
