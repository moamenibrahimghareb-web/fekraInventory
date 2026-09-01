/** Centralized Supabase client. Initialization is explicit and idempotent. */
import CONFIG from '../config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SupabaseClient');

class SupabaseClientManager {
  constructor() {
    this.client = null;
    this.subscriptions = new Set();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this.client;
    if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
      throw new Error('Supabase configuration is missing');
    }
    if (!window.supabase?.createClient) throw new Error('Supabase library not loaded');
    this.client = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
    this.initialized = true;
    logger.info('Supabase client initialized');
    return this.client;
  }

  async executeWithRetry(queryFn, maxAttempts = CONFIG.RETRY.MAX_ATTEMPTS) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try { return await queryFn(); }
      catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = Math.min(CONFIG.RETRY.INITIAL_DELAY * 2 ** (attempt - 1), CONFIG.RETRY.MAX_DELAY);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async getInventoryProducts() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).select('*').order('id');
      if (error) throw error;
      return data || [];
    });
  }

  async getSystemItems() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).select('*').order('id');
      if (error) throw error;
      return data || [];
    });
  }

  async insertProduct(product) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).insert(product).select().single();
      if (error) throw error;
      return data;
    });
  }

  async updateProduct(id, updates) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteProduct(id) {
    return this.executeWithRetry(async () => {
      const { error } = await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).delete().eq('id', id);
      if (error) throw error;
    });
  }

  async deleteAllInventoryProducts() {
    return this.executeWithRetry(async () => {
      const { error } = await this.client.from(CONFIG.TABLES.INVENTORY_PRODUCTS).delete().not('id', 'is', null);
      if (error) throw error;
    });
  }

  async insertSystemItems(items) {
    if (!Array.isArray(items) || !items.length) return [];
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).insert(items).select();
      if (error) throw error;
      return data || [];
    });
  }

  async deleteAllSystemItems() {
    return this.executeWithRetry(async () => {
      const { error } = await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).delete().not('id', 'is', null);
      if (error) throw error;
    });
  }

  subscribeToChanges(table, callback) {
    if (!this.client) return null;
    const channel = this.client.channel(`public:${table}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
    this.subscriptions.add(channel);
    return channel;
  }

  unsubscribe(channel) {
    if (!channel || !this.client) return;
    this.client.removeChannel(channel);
    this.subscriptions.delete(channel);
  }

  unsubscribeAll() {
    if (!this.client) return;
    this.subscriptions.forEach(channel => this.client.removeChannel(channel));
    this.subscriptions.clear();
  }

  async healthCheck() {
    try {
      await this.executeWithRetry(async () => {
        const { error } = await this.client.from(CONFIG.TABLES.SYSTEM_ITEMS).select('id').limit(1);
        if (error) throw error;
      }, 2);
      return true;
    } catch { return false; }
  }
}

export const supabaseClient = new SupabaseClientManager();
export default SupabaseClientManager;
