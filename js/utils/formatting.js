/**
 * Formatting & Validation Utilities
 * Number, currency, and text formatting with validation
 */

/**
 * Normalize Arabic and English text for comparison
 */
export function normalizeName(text) {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/أ|إ/g, 'ا') // أ|إ -> ا
    .replace(/ى/g, 'ي');  // ى -> ي
}

/**
 * Format number with proper decimal places and Arabic numerals (optional)
 */
export function formatNumber(num, decimals = 2) {
  const rounded = parseFloat(num || 0).toFixed(decimals);
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format currency with symbol
 */
export function formatCurrency(num, currency = 'ج.م') {
  const formatted = formatNumber(num, 2);
  return `${formatted} ${currency}`;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate quantity input
 */
export function validateQuantity(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, error: 'يجب إدخال رقم صحيح' };
  if (num <= 0) return { valid: false, error: 'الكمية يجب أن تكون أكبر من صفر' };
  if (num > 999999.99) return { valid: false, error: 'الكمية تجاوزت الحد الأقصى المسموح' };
  return { valid: true, value: num };
}

/**
 * Validate price input
 */
export function validatePrice(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, error: 'يجب إدخال رقم صحيح' };
  if (num < 0) return { valid: false, error: 'السعر لا يمكن أن يكون سالباً' };
  if (num > 999999.99) return { valid: false, error: 'السعر تجاوز الحد الأقصى المسموح' };
  return { valid: true, value: num };
}

/**
 * Validate product name
 */
export function validateProductName(name) {
  if (!name || !name.trim()) return { valid: false, error: 'اسم الصنف مطلوب' };
  if (name.length > 255) return { valid: false, error: 'اسم الصنف طويل جداً' };
  return { valid: true, value: name.trim() };
}

/**
 * Format date to Arabic locale
 */
export function formatDate(date = new Date()) {
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Round to 2 decimal places (for currency calculations)
 */
export function roundCurrency(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

export default {
  normalizeName,
  formatNumber,
  formatCurrency,
  escapeHtml,
  validateQuantity,
  validatePrice,
  validateProductName,
  formatDate,
  roundCurrency
};
