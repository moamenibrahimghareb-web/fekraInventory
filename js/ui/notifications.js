/**
 * Notifications Module
 * Centralized toast and modal management
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Notifications');

class NotificationManager {
  constructor() {
    this.toastBox = document.getElementById('toast-box');
    this.toastInner = document.getElementById('toast-inner');
    this.toastMessage = document.getElementById('toast-message');
    this.toastIcon = document.getElementById('toast-icon');
    this.toastTimeout = null;

    this.modalContainer = document.getElementById('modal-container');
    this.modalTitle = document.getElementById('modal-title');
    this.modalDesc = document.getElementById('modal-desc');
    this.modalIcon = document.getElementById('modal-icon');
    this.modalConfirmBtn = document.getElementById('modal-confirm-btn');
    this.modalCancelBtn = document.getElementById('modal-cancel-btn');

    this.currentModalResolver = null;
  }

  /**
   * Show toast notification
   */
  showToast(message, icon = 'ℹ️', duration = 3000) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastIcon.textContent = icon;
    this.toastMessage.textContent = message;

    this.toastBox.style.transform = 'translateY(0)';
    this.toastBox.style.opacity = '1';
    this.toastBox.style.pointerEvents = 'auto';

    logger.debug(`Toast shown: ${message}`, { icon });

    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, duration);
  }

  /**
   * Hide toast notification
   */
  hideToast() {
    this.toastBox.style.transform = 'translateY(32px)';
    this.toastBox.style.opacity = '0';
    this.toastBox.style.pointerEvents = 'none';
  }

  /**
   * Show confirmation modal (returns Promise)
   */
  showConfirm(title, description, icon = '⚠️') {
    return new Promise((resolve) => {
      this.modalTitle.textContent = title;
      this.modalDesc.textContent = description;
      this.modalIcon.textContent = icon;

      this.modalContainer.classList.remove('hidden');
      this.currentModalResolver = resolve;

      this.modalConfirmBtn.onclick = () => {
        this.closeModal();
        resolve(true);
      };

      logger.debug('Confirmation modal shown', { title });
    });
  }

  /**
   * Show alert modal
   */
  async showAlert(title, message, icon = 'ℹ️') {
    this.modalTitle.textContent = title;
    this.modalDesc.textContent = message;
    this.modalIcon.textContent = icon;

    this.modalConfirmBtn.textContent = 'حسناً';
    this.modalConfirmBtn.classList.add('hidden');
    this.modalCancelBtn.textContent = 'إغلاق';
    this.modalCancelBtn.classList.remove('hidden');

    this.modalContainer.classList.remove('hidden');

    return new Promise((resolve) => {
      this.modalCancelBtn.onclick = () => {
        this.closeModal();
        resolve();
      };
    });
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modalContainer.classList.add('hidden');
    this.modalConfirmBtn.textContent = 'نعم، تأكيد';
    this.modalConfirmBtn.classList.remove('hidden');
    this.modalCancelBtn.classList.remove('hidden');
    this.currentModalResolver = null;
  }

  /**
   * Show success notification
   */
  success(message, duration = 3000) {
    this.showToast(message, '✅', duration);
  }

  /**
   * Show error notification
   */
  error(message, duration = 4000) {
    this.showToast(message, '❌', duration);
    logger.warn(`Error notification: ${message}`);
  }

  /**
   * Show warning notification
   */
  warning(message, duration = 3000) {
    this.showToast(message, '⚠️', duration);
  }

  /**
   * Show info notification
   */
  info(message, duration = 3000) {
    this.showToast(message, 'ℹ️', duration);
  }

  /**
   * Show loading notification with spinner
   */
  loading(message) {
    this.showToast(message, '⏳', 10000); // Long duration
  }
}

export const notificationManager = new NotificationManager();

export default NotificationManager;
