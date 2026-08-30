/**
 * Supabase Client Module
 * Centralized Supabase client with retry logic and error handling
 */

import CONFIG from '../config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SupabaseClient');

class SupabaseClientManager {
  constructor() {
    this.client = null;
    this.subscriptions = [];
    this.initialized = false;
  }

  /**
   * Initialize Supabase client
   */
  async init() {
    if (this.initialized) return this.client;

    try {
      if (!window.supabase) {
        throw new Error('Supabase library not loaded');
      }

      this.client = window.supabase.createClient(
        CONFIG.SUPABASE.URL,
        CONFIG.SUPABASE.ANON_KEY
      );

      this.initialized = true;
      logger.info('Supabase client initialized successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Supabase client', error);
      throw error;
    }
  }

  /**
   * Execute query with retry logic
   */
  async executeWithRetry(queryFn, maxAttempts = CONFIG.RETRY.MAX_ATTEMPTS) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`Attempt ${attempt}/${maxAttempts}`);
        return await queryFn();
      } catch (error) {
        lastError = error;
        logger.warn(`Attempt ${attempt} failed`, error);

        if (attempt < maxAttempts) {
          const delay = Math.min(
            CONFIG.RETRY.INITIAL_DELAY * Math.pow(2, attempt - 1),
            CONFIG.RETRY.MAX_DELAY
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`All ${maxAttempts} attempts failed`, lastError);
    throw lastError;
  }

  /**
   * Fetch inventory products
   */
  async getInventoryProducts() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(CONFIG.TABLES.INVENTORY_PRODUCTS)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Fetch system items
   */
  async getSystemItems() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(CONFIG.TABLES.SYSTEM_ITEMS)
        .select('*');

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Insert inventory product
   */
  async insertProduct(product) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(CONFIG.TABLES.INVENTORY_PRODUCTS)
        .insert([product])
        .select();

      if (error) throw error;
      return data?.[0];
    });
  }

  /**
   * Update inventory product
   */
  async updateProduct(id, updates) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(CONFIG.TABLES.INVENTORY_PRODUCTS)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0];
    });
  }

  /**
   * Delete inventory product
   */
  async deleteProduct(id) {
    return this.executeWithRetry(async () => {
      const { error } = await this.client
        .from(CONFIG.TABLES.INVENTORY_PRODUCTS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    });
  }

  /**
   * Insert system items (bulk)
   */
  async insertSystemItems(items) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(CONFIG.TABLES.SYSTEM_ITEMS)
        .insert(items)
        .select();

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Clear system items
   */
  async deleteAllSystemItems() {
    return this.executeWithRetry(async () => {
      const { error } = await this.client
        .from(CONFIG.TABLES.SYSTEM_ITEMS)
        .delete()
        .neq('id', -1); // Delete all rows

      if (error) throw error;
    });
  }

  /**
   * Subscribe to realtime changes
   */
  subscribeToChanges(table, callback) {
    if (!this.client) {
      logger.warn('Supabase client not initialized');
      return null;
    }

    const subscription = this.client
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();

    this.subscriptions.push(subscription);
    logger.info(`Subscribed to ${table} changes`);
    return subscription;
  }

  /**
   * Unsubscribe from realtime changes
   */
  unsubscribe(subscription) {
    if (!subscription) return;

    this.client.removeChannel(subscription);
    this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    logger.info('Unsubscribed from realtime changes');
  }

  /**
   * Cleanup all subscriptions
   */
  unsubscribeAll() {
    this.subscriptions.forEach(sub => {
      this.client.removeChannel(sub);
    });
    this.subscriptions = [];
    logger.info('Unsubscribed from all realtime changes');
  }

  /**
   * Check connection status
   */
  async healthCheck() {
    try {
      await this.executeWithRetry(async () => {
        const { data, error } = await this.client
          .from(CONFIG.TABLES.SYSTEM_ITEMS)
          .select('id')
          .limit(1);

        if (error) throw error;
      }, 2);
      return true;
    } catch (error) {
      logger.warn('Health check failed', error);
      return false;
    }
  }
}

export const supabaseClient = new SupabaseClientManager();

// Initialize on module load
supabaseClient.init().catch(error => {
  logger.error('Failed to initialize Supabase', error);
});

export default SupabaseClientManager;
