/**
 * Safe bootstrap layer for the existing UI.
 * This does not replace legacy handlers; it initializes the modular core and
 * exposes a small status bridge so the current UI can migrate incrementally.
 */
import { initializeApp } from './app.js';
import { stateManager } from './core/state.js';

const statusText = () => document.getElementById('cloud-status-text');
const statusDot = () => document.getElementById('cloud-status-dot');

function renderConnectionStatus(online) {
  const text = statusText();
  const dot = statusDot();
  if (text) text.textContent = online ? 'متصل سحابياً' : 'غير متصل';
  if (dot) {
    dot.classList.toggle('bg-emerald-400', online);
    dot.classList.toggle('bg-rose-400', !online);
  }
}

export async function bootstrap() {
  const ok = await initializeApp();
  renderConnectionStatus(ok);
  stateManager.subscribe((changes, state) => {
    if ('isOnline' in changes) renderConnectionStatus(state.isOnline);
  });
  return ok;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
