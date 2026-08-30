/**
 * Inventory API Module
 * Handles all inventory product operations
 */

import { supabaseClient } from '../core/supabase-client.js';
import { stateManager } from '../core/state.js';
import { notificationManager } from '../ui/notifications.js';
import { createLogger } from '../utils/logger.js';
import { validateProductName, validateQuantity, roundCurrency, normalizeName } from '../utils/formatting.js';

const logger = createLogger('InventoryAPI');

class InventoryAPI {
  constructor() {
    this.syncInProgress = false;
  }

  /**
   * Fetch all inventory products from Supabase
   */
  async fetchProducts() {
    try {
      stateManager.setLoading(true);
      const products = await supabaseClient.getInventoryProducts();
      
      const mapped = products.map(row => ({
        id: row.id,
        name: row.name,
        quantities: Array.isArray(row.quantities) ? row.quantities : [],
        totalQuantity: parseFloat(row.total_quantity) || 0,
        unitPrice: parseFloat(row.unit_price) || 0,
        barcode: row.barcode || ''
      }));

      stateManager.setProducts(mapped);
      stateManager.setLastSyncTime(new Date());
      logger.info(`Fetched ${mapped.length} products`);
      return mapped;
    } catch (error) {
      logger.error('Failed to fetch products', error);
      notificationManager.error(`خطأ في تحميل الأصناف: ${error.message}`);
      throw error;
    } finally {
      stateManager.setLoading(false);
    }
  }

  /**
   * Save new product or add quantities to existing
   */
  async saveProduct(name, quantities, systemItem = null) {
    // Validate inputs
    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) {
      notificationManager.warning(nameValidation.error);
      throw new Error(nameValidation.error);
    }

    if (!quantities || quantities.length === 0) {
      notificationManager.warning('يجب إدخال كمية واحدة على الأقل');
      throw new Error('No quantities provided');
    }

    const totalQty = quantities.reduce((sum, q) => sum + q, 0);
    const unitPrice = systemItem?.unitPrice || 0;
    const barcode = systemItem?.barcode || '';

    try {
      stateManager.setLoading(true);
      const norm = normalizeName(name);
      const existingProduct = stateManager.get('products').find(p => normalizeName(p.name) === norm);

      if (existingProduct) {
        // Add quantities to existing product
        const newQuantities = [...existingProduct.quantities, ...quantities];
        const newTotal = newQuantities.reduce((sum, q) => sum + q, 0);

        await supabaseClient.updateProduct(existingProduct.id, {
          quantities: newQuantities,
          total_quantity: newTotal,
          unit_price: existingProduct.unitPrice || unitPrice,
          updated_at: new Date().toISOString()
        });

        stateManager.updateProduct(existingProduct.id, {
          quantities: newQuantities,
          totalQuantity: newTotal
        });

        notificationManager.success(`تمت إضافة الكميات للصنف "${name}"`);
      } else {
        // Insert new product
        const newProduct = await supabaseClient.insertProduct({
          name,
          quantities,
          total_quantity: totalQty,
          unit_price: unitPrice,
          barcode
        });

        stateManager.addProduct({
          id: newProduct.id,
          name,
          quantities,
          totalQuantity: totalQty,
          unitPrice: unitPrice,
          barcode
        });

        notificationManager.success(`تم حفظ "${name}" بإجمالي ${totalQty} قطعة`);
      }

      logger.info(`Product saved: ${name} (qty: ${totalQty})`);
    } catch (error) {
      logger.error('Failed to save product', error);
      notificationManager.error(`خطأ في الحفظ: ${error.message}`);
      throw error;
    } finally {
      stateManager.setLoading(false);
    }
  }

  /**
   * Update product price
   */
  async updateProductPrice(productId, unitPrice) {
    const validation = validateQuantity(unitPrice);
    if (!validation.valid) {
      notificationManager.warning(validation.error);
      return false;
    }

    try {
      await supabaseClient.updateProduct(productId, {
        unit_price: roundCurrency(validation.value),
        updated_at: new Date().toISOString()
      });

      stateManager.updateProduct(productId, { unitPrice: roundCurrency(validation.value) });
      logger.info(`Product ${productId} price updated to ${validation.value}`);
      return true;
    } catch (error) {
      logger.error('Failed to update product price', error);
      notificationManager.error(`خطأ في تحديث السعر: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    try {
      await supabaseClient.deleteProduct(productId);
      stateManager.removeProduct(productId);
      notificationManager.success('تم حذف الصنف بنجاح');
      logger.info(`Product ${productId} deleted`);
      return true;
    } catch (error) {
      logger.error('Failed to delete product', error);
      notificationManager.error(`خطأ في الحذف: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all products
   */
  async clearAllProducts() {
    const confirmed = await notificationManager.showConfirm(
      'تصفير الجرد',
      'هل أنت متأكد من حذف جميع الأصناف المجرودة؟ لا يمكن التراجع عن هذا الإجراء.',
      '🗑️'
    );

    if (!confirmed) return false;

    try {
      const products = stateManager.get('products');
      for (const product of products) {
        await supabaseClient.deleteProduct(product.id);
      }
      stateManager.setProducts([]);
      stateManager.clearActiveQuantities();
      notificationManager.success('تم تصفير الجرد بنجاح');
      logger.info('All products cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear products', error);
      notificationManager.error(`خطأ في التصفير: ${error.message}`);
      return false;
    }
  }

  /**
   * Get total inventory value
   */
  getInventoryValue() {
    const products = stateManager.get('products');
    return products.reduce((total, p) => total + (p.totalQuantity * p.unitPrice), 0);
  }

  /**
   * Get total units counted
   */
  getTotalUnits() {
    const products = stateManager.get('products');
    return products.reduce((total, p) => total + p.totalQuantity, 0);
  }
}

export const inventoryAPI = new InventoryAPI();

export default InventoryAPI;
