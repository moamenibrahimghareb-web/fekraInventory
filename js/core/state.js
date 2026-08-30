/**
 * State Management Module
 * Centralized, immutable state with change observers
 */

class StateManager {
  constructor() {
    this.state = {
      products: [],
      systemItems: [],
      activeQuantities: [],
      currentEditingIndex: null,
      currentStep: 1,
      comparisonFilter: 'all',
      comparisonScope: 'partial',
      isLoading: false,
      isOnline: true,
      lastSyncTime: null
    };

    this.observers = [];
    this.history = []; // For undo/redo
    this.maxHistory = 50;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  /**
   * Notify all observers of state change
   */
  private notifyObservers(changes) {
    this.observers.forEach(observer => observer(changes, this.state));
  }

  /**
   * Update state immutably
   */
  update(updates) {
    const oldState = JSON.parse(JSON.stringify(this.state));
    this.state = { ...this.state, ...updates };
    
    // Add to history for undo/redo
    this.history.push(oldState);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.notifyObservers(updates);
    return this.state;
  }

  /**
   * Get current state (returns copy to prevent external mutations)
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get single state property
   */
  get(key) {
    return this.state[key];
  }

  // ===== Products =====
  setProducts(products) {
    return this.update({ products });
  }

  addProduct(product) {
    const updated = [...this.state.products, product];
    return this.update({ products: updated });
  }

  updateProduct(id, updates) {
    const updated = this.state.products.map(p => p.id === id ? { ...p, ...updates } : p);
    return this.update({ products: updated });
  }

  removeProduct(id) {
    const updated = this.state.products.filter(p => p.id !== id);
    return this.update({ products: updated });
  }

  // ===== System Items =====
  setSystemItems(items) {
    return this.update({ systemItems: items });
  }

  // ===== Active Quantities (for current product) =====
  setActiveQuantities(quantities) {
    return this.update({ activeQuantities: quantities });
  }

  addActiveQuantity(qty) {
    const updated = [...this.state.activeQuantities, qty];
    return this.update({ activeQuantities: updated });
  }

  removeActiveQuantity(index) {
    const updated = this.state.activeQuantities.filter((_, i) => i !== index);
    return this.update({ activeQuantities: updated });
  }

  clearActiveQuantities() {
    return this.update({ activeQuantities: [] });
  }

  // ===== UI State =====
  setCurrentStep(step) {
    return this.update({ currentStep: step });
  }

  setComparisonFilter(filter) {
    return this.update({ comparisonFilter: filter });
  }

  setComparisonScope(scope) {
    return this.update({ comparisonScope: scope });
  }

  setEditingIndex(index) {
    return this.update({ currentEditingIndex: index });
  }

  setLoading(isLoading) {
    return this.update({ isLoading });
  }

  setOnlineStatus(isOnline) {
    return this.update({ isOnline });
  }

  setLastSyncTime(time) {
    return this.update({ lastSyncTime: time });
  }

  // ===== Undo/Redo =====
  undo() {
    if (this.history.length === 0) return null;
    this.state = this.history.pop();
    this.notifyObservers({ undoTriggered: true });
    return this.state;
  }

  clearHistory() {
    this.history = [];
  }

  // ===== Batch Updates =====
  transaction(updateFn) {
    const oldState = JSON.parse(JSON.stringify(this.state));
    const updates = updateFn(this.state);
    this.state = { ...this.state, ...updates };
    this.history.push(oldState);
    this.notifyObservers(updates);
    return this.state;
  }

  reset() {
    this.state = {
      products: [],
      systemItems: [],
      activeQuantities: [],
      currentEditingIndex: null,
      currentStep: 1,
      comparisonFilter: 'all',
      comparisonScope: 'partial',
      isLoading: false,
      isOnline: true,
      lastSyncTime: null
    };
    this.history = [];
    this.notifyObservers({ reset: true });
  }
}

export const stateManager = new StateManager();

export default StateManager;
