import CONFIG from './config.js';
import { createLogger } from './utils/logger.js';
import { stateManager } from './core/state.js';
import { supabaseClient } from './core/supabase-client.js';

const logger = createLogger('App');

function validateRuntimeConfig() {
  if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
    logger.warn('Supabase runtime configuration is missing. Set window.__FEKRA_SUPABASE_URL__ and window.__FEKRA_SUPABASE_ANON_KEY__ before loading the app.');
    return false;
  }
  return true;
}

export async function initializeApp() {
  if (!validateRuntimeConfig()) {
    stateManager.setOnlineStatus(false);
    return false;
  }

  try {
    await supabaseClient.init();
    stateManager.setOnlineStatus(true);
    stateManager.setLastSyncTime(new Date().toISOString());
    logger.info('Application initialized');
    return true;
  } catch (error) {
    stateManager.setOnlineStatus(false);
    logger.error('Application initialization failed', error);
    return false;
  }
}

export { CONFIG, stateManager, supabaseClient };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
