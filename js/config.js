/**
 * Application configuration.
 * Keep public Supabase client settings here; never place service-role secrets in frontend code.
 */

const CONFIG = Object.freeze({
  SUPABASE: Object.freeze({
    URL: 'https://YOUR_PROJECT.supabase.co',
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
  }),
  TABLES: Object.freeze({
    INVENTORY_PRODUCTS: 'inventory_products',
    SYSTEM_ITEMS: 'system_items',
    CUSTOMER_ACCOUNTS: 'customer_accounts'
  }),
  RETRY: Object.freeze({
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 500,
    MAX_DELAY: 4000
  })
});

export default CONFIG;
