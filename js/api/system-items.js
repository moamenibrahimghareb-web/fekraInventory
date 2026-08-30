/**
 * System Items API Module
 * Handles system inventory (from uploaded files)
 */

import { supabaseClient } from '../core/supabase-client.js';
import { stateManager } from '../core/state.js';
import { notificationManager } from '../ui/notifications.js';
import { createLogger } from '../utils/logger.js';
import { normalizeName } from '../utils/formatting.js';

const logger = createLogger('SystemItemsAPI');

class SystemItemsAPI {
  constructor() {}

  /**
   * Fetch all system items from Supabase
   */
  async fetchSystemItems() {
    try {
      stateManager.setLoading(true);
      const items = await supabaseClient.getSystemItems();
      
      const mapped = items.map(row => ({
        id: row.id,
        name: row.name,
        normalizedName: row.normalized_name,
        systemQty: parseFloat(row.system_qty) || 0,
        unitPrice: parseFloat(row.unit_price) || 0,
        barcode: row.barcode || '',
        category: row.category || ''
      }));

      stateManager.setSystemItems(mapped);
      logger.info(`Fetched ${mapped.length} system items`);
      return mapped;
    } catch (error) {
      logger.error('Failed to fetch system items', error);
      notificationManager.error(`خطأ في تحميل بيانات السيستم: ${error.message}`);
      throw error;
    } finally {
      stateManager.setLoading(false);
    }
  }

  /**
   * Upload system items from Excel/CSV
   */
  async uploadSystemItems(items) {
    if (!items || items.length === 0) {
      notificationManager.warning('لا توجد عناصر للرفع');
      return false;
    }

    try {
      stateManager.setLoading(true);
      
      // Normalize items
      const normalized = items.map(item => ({
        name: item.name || '',
        normalized_name: normalizeName(item.name || ''),
        system_qty: parseFloat(item.systemQty || 0),
        unit_price: parseFloat(item.unitPrice || 0),
        barcode: item.barcode || '',
        category: item.category || ''
      })).filter(item => item.name); // Filter out empty names

      if (normalized.length === 0) {
        notificationManager.warning('لم يتم العثور على عناصر صالحة للرفع');
        return false;
      }

      // Clear old items first
      await supabaseClient.deleteAllSystemItems();

      // Insert new items
      await supabaseClient.insertSystemItems(normalized);
      
      stateManager.setSystemItems(
        normalized.map((item, idx) => ({ id: idx, ...item, systemQty: item.system_qty, unitPrice: item.unit_price }))
      );

      notificationManager.success(`تم رفع ${normalized.length} صنف من السيستم`);
      logger.info(`Uploaded ${normalized.length} system items`);
      return true;
    } catch (error) {
      logger.error('Failed to upload system items', error);
      notificationManager.error(`خطأ في رفع البيانات: ${error.message}`);
      return false;
    } finally {
      stateManager.setLoading(false);
    }
  }

  /**
   * Find system item by name or barcode
   */
  findItem(term) {
    const systemItems = stateManager.get('systemItems');
    if (!term) return null;

    const clean = term.trim();
    const norm = normalizeName(clean);

    // Try barcode first
    const byBarcode = systemItems.find(s => s.barcode && String(s.barcode).trim() === clean);
    if (byBarcode) return byBarcode;

    // Then by normalized name
    const byName = systemItems.find(s => s.normalizedName === norm);
    return byName || null;
  }

  /**
   * Search system items
   */
  search(query, limit = 15) {
    const systemItems = stateManager.get('systemItems');
    if (!query) return [];

    const cleanQ = query.toLowerCase().trim();
    const normQ = normalizeName(cleanQ);

    return systemItems.filter(item => {
      const nameMatch = item.normalizedName.includes(normQ) || item.name.toLowerCase().includes(cleanQ);
      const barcodeMatch = item.barcode && String(item.barcode).toLowerCase().includes(cleanQ);
      return nameMatch || barcodeMatch;
    }).slice(0, limit);
  }

  /**
   * Get all categories
   */
  getCategories() {
    const systemItems = stateManager.get('systemItems');
    const categories = new Set(systemItems.map(item => item.category).filter(Boolean));
    return Array.from(categories).sort();
  }

  /**
   * Clear system items
   */
  async clearSystemItems() {
    const confirmed = await notificationManager.showConfirm(
      'حذف بيانات السيستم',
      'هل أنت متأكد من حذف جميع بيانات السيستم؟',
      '⚠️'
    );

    if (!confirmed) return false;

    try {
      await supabaseClient.deleteAllSystemItems();
      stateManager.setSystemItems([]);
      notificationManager.success('تم حذف بيانات السيستم بنجاح');
      logger.info('System items cleared');
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
