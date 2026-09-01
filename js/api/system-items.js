/** System inventory API. */
import { supabaseClient } from '../core/supabase-client.js';
import { stateManager } from '../core/state.js';
import { notificationManager } from '../ui/notifications.js';
import { createLogger } from '../utils/logger.js';
import { normalizeName } from '../utils/formatting.js';
import { normalizeSystemItems } from '../services/import-service.js';

const logger = createLogger('SystemItemsAPI');

class SystemItemsAPI {
  async fetchSystemItems() {
    try {
      stateManager.setLoading(true);
      const rows = await supabaseClient.getSystemItems();
      const items = rows.map(row => ({
        id: row.id,
        name: row.name,
        normalizedName: row.normalized_name || normalizeName(row.name),
        systemQty: Number(row.system_qty) || 0,
        unitPrice: Number(row.unit_price) || 0,
        barcode: row.barcode || '',
        category: row.category || ''
      }));
      stateManager.setSystemItems(items);
      return items;
    } catch (error) {
      logger.error('Failed to fetch system items', error);
      notificationManager.error(`خطأ في تحميل بيانات السيستم: ${error.message}`);
      throw error;
    } finally { stateManager.setLoading(false); }
  }

  async uploadSystemItems(items) {
    const normalized = normalizeSystemItems(items);
    if (!normalized.length) {
      notificationManager.warning('لم يتم العثور على عناصر صالحة للرفع');
      return false;
    }
    try {
      stateManager.setLoading(true);
      await supabaseClient.replaceSystemItems(normalized);
      await this.fetchSystemItems();
      notificationManager.success(`تم رفع ${normalized.length} صنف من السيستم`);
      return true;
    } catch (error) {
      logger.error('Failed to upload system items', error);
      notificationManager.error(`خطأ في رفع البيانات: ${error.message}`);
      return false;
    } finally { stateManager.setLoading(false); }
  }

  findItem(term) {
    const clean = String(term || '').trim();
    if (!clean) return null;
    const norm = normalizeName(clean);
    const items = stateManager.get('systemItems');
    return items.find(item => String(item.barcode).trim() === clean) || items.find(item => item.normalizedName === norm) || null;
  }

  search(query, limit = 15) {
    const clean = String(query || '').trim().toLowerCase();
    if (!clean) return [];
    const norm = normalizeName(clean);
    return stateManager.get('systemItems').filter(item =>
      item.normalizedName.includes(norm) || item.name.toLowerCase().includes(clean) || String(item.barcode).toLowerCase().includes(clean)
    ).slice(0, limit);
  }

  getCategories() {
    return [...new Set(stateManager.get('systemItems').map(item => item.category).filter(Boolean))].sort();
  }

  async clearSystemItems() {
    const confirmed = await notificationManager.showConfirm('حذف بيانات السيستم', 'هل أنت متأكد من حذف جميع بيانات السيستم؟', '⚠️');
    if (!confirmed) return false;
    try {
      await supabaseClient.deleteAllSystemItems();
      stateManager.setSystemItems([]);
      notificationManager.success('تم حذف بيانات السيستم بنجاح');
      return true;
    } catch (error) {
      logger.error('Failed to clear system items', error);
      notificationManager.error(`خطأ في الحذف: ${error.message}`);
      return false;
    }
  }
}

export const systemItemsAPI = new SystemItemsAPI();
export default SystemItemsAPI;
