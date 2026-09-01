/** Central application configuration. */

const CONFIG = Object.freeze({
  SUPABASE: Object.freeze({
    URL: window.__FEKRA_SUPABASE_URL__ || '',
    ANON_KEY: window.__FEKRA_SUPABASE_ANON_KEY__ || ''
  }),
  TABLES: Object.freeze({
    INVENTORY_PRODUCTS: 'inventory_products',
    SYSTEM_ITEMS: 'system_items',
    CUSTOMER_ACCOUNTS: 'customer_accounts'
  }),
  RETRY: Object.freeze({ MAX_ATTEMPTS: 3, INITIAL_DELAY: 500, MAX_DELAY: 4000 })
});

export default CONFIG;
