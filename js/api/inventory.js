/**
 * Inventory API Module
 * Business operations for counted inventory products.
 */

import { supabaseClient } from '../core/supabase-client.js';
import { stateManager } from '../core/state.js';
import { notificationManager } from '../ui/notifications.js';
import { createLogger } from '../utils/logger.js';
import { validateProductName, validateQuantity, validatePrice, roundCurrency, normalizeName } from '../utils/formatting.js';

const logger = createLogger('InventoryAPI');

const toNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

class InventoryAPI {
  async fetchProducts() {
    try {
      stateManager.setLoading(true);
      const rows = await supabaseClient.getInventoryProducts();
      const products = rows.map(row => {
        const quantities = Array.isArray(row.quantities) ? row.quantities.map(toNumber) : [];
        return {
          id: row.id,
          name: row.name,
          quantities,
          totalQuantity: toNumber(row.total_quantity),
          unitPrice: toNumber(row.unit_price),
          barcode: row.barcode || ''
        };
      });
      stateManager.transaction(() => ({ products, lastSyncTime: new Date().toISOString() }));
      logger.info(`Fetched ${products.length} products`);
      return products;
    } catch (error) {
      logger.error('Failed to fetch products', error);
      notificationManager.error(`خطأ في تحميل الأصناف: ${error.message}`);
      throw error;
    } finally {
      stateManager.setLoading(false);
    }
  }

  async saveProduct(name, quantities, systemItem = null) {
    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) throw new Error(nameValidation.error);
    if (!Array.isArray(quantities) || quantities.length === 0) throw new Error('يجب إدخال كمية واحدة على الأقل');

    const normalizedQuantities = quantities.map(toNumber);
    const invalidQuantity = normalizedQuantities.some(q => q <= 0);
    if (invalidQuantity) throw new Error('كل الكميات يجب أن تكون أكبر من صفر');

    const totalQty = normalizedQuantities.reduce((sum, q) => sum + q, 0);
    const unitPrice = toNumber(systemItem?.unitPrice);
    const barcode = systemItem?.barcode || '';

    try {
      stateManager.setLoading(true);
      const existingProduct = stateManager.get('products').find(p => normalizeName(p.name) === normalizeName(nameValidation.value));

      if (existingProduct) {
        const newQuantities = [...existingProduct.quantities.map(toNumber), ...normalizedQuantities];
        const newTotal = newQuantities.reduce((sum, q) => sum + q, 0);
        await supabaseClient.updateProduct(existingProduct.id, {
          quantities: newQuantities,
          total_quantity: newTotal,
          unit_price: existingProduct.unitPrice || unitPrice,
          updated_at: new Date().toISOString()
        });
        stateManager.updateProduct(existingProduct.id, { quantities: newQuantities, totalQuantity: newTotal });
        notificationManager.success(`تمت إضافة الكميات للصنف "${nameValidation.value}"`);
        return existingProduct.id;
      }

      const newProduct = await supabaseClient.insertProduct({
        name: nameValidation.value,
        quantities: normalizedQuantities,
        total_quantity: totalQty,
        unit_price: unitPrice,
        barcode
      });

      if (!newProduct?.id) throw new Error('لم يتم إرجاع معرف الصنف من قاعدة البيانات');
      stateManager.addProduct({ id: newProduct.id, name: nameValidation.value, quantities: normalizedQuantities, totalQuantity: totalQty, unitPrice, barcode });
      notificationManager.success(`تم حفظ "${nameValidation.value}" بإجمالي ${totalQty} قطعة`);
      logger.info(`Product saved: ${nameValidation.value}`);
      return newProduct.id;
    } catch (error) {
      logger.error('Failed to save product', error);
      notificationManager.error(`خطأ في الحفظ: ${error.message}`);
      throw error;
    } finally {
      stateManager.setLoading(false);
    }
  }

  async updateProductPrice(productId, unitPrice) {
    const validation = validatePrice(unitPrice);
    if (!validation.valid) {
      notificationManager.warning(validation.error);
      return false;
    }
    try {
      const price = roundCurrency(validation.value);
      await supabaseClient.updateProduct(productId, { unit_price: price, updated_at: new Date().toISOString() });
      stateManager.updateProduct(productId, { unitPrice: price });
      return true;
    } catch (error) {
      logger.error('Failed to update product price', error);
      notificationManager.error(`خطأ في تحديث السعر: ${error.message}`);
      return false;
    }
  }

  async deleteProduct(productId) {
    try {
      await supabaseClient.deleteProduct(productId);
      stateManager.removeProduct(productId);
      notificationManager.success('تم حذف الصنف بنجاح');
      return true;
    } catch (error) {
      logger.error('Failed to delete product', error);
      notificationManager.error(`خطأ في الحذف: ${error.message}`);
      return false;
    }
  }

  async clearAllProducts() {
    const confirmed = await notificationManager.showConfirm('تصفير الجرد', 'هل أنت متأكد من حذف جميع الأصناف المجرودة؟ لا يمكن التراجع عن هذا الإجراء.', '🗑️');
    if (!confirmed) return false;

    try {
      await supabaseClient.deleteAllInventoryProducts();
      stateManager.setProducts([]);
      stateManager.clearActiveQuantities();
      notificationManager.success('تم تصفير الجرد بنجاح');
      return true;
    } catch (error) {
      logger.error('Failed to clear products', error);
      notificationManager.error(`خطأ في التصفير: ${error.message}`);
      return false;
    }
  }

  getInventoryValue() {
    return stateManager.get('products').reduce((total, p) => total + toNumber(p.totalQuantity) * toNumber(p.unitPrice), 0);
  }

  getTotalUnits() {
    return stateManager.get('products').reduce((total, p) => total + toNumber(p.totalQuantity), 0);
  }
}

export const inventoryAPI = new InventoryAPI();
export default InventoryAPI;
