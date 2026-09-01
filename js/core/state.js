/**
 * Centralized application state with observers and local undo/redo history.
 * Persistence is intentionally handled by API modules, not by this class.
 */

const INITIAL_STATE = Object.freeze({
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
});

const clone = value => JSON.parse(JSON.stringify(value));

class StateManager {
  constructor() {
    this.state = clone(INITIAL_STATE);
    this.observers = new Set();
    this.history = [];
    this.future = [];
    this.maxHistory = 50;
  }

  subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('State observer must be a function');
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  notifyObservers(changes) {
    const snapshot = this.getState();
    this.observers.forEach(observer => observer(changes, snapshot));
  }

  pushHistory() {
    this.history.push(clone(this.state));
    if (this.history.length > this.maxHistory) this.history.shift();
    this.future = [];
  }

  update(updates) {
    if (!updates || typeof updates !== 'object') throw new TypeError('State updates must be an object');
    this.pushHistory();
    this.state = { ...this.state, ...updates };
    this.notifyObservers(updates);
    return this.getState();
  }

  getState() { return clone(this.state); }
  get(key) { return this.state[key]; }

  setProducts(products) { return this.update({ products: clone(products) }); }
  addProduct(product) { return this.update({ products: [...this.state.products, clone(product)] }); }
  updateProduct(id, updates) {
    return this.update({ products: this.state.products.map(p => p.id === id ? { ...p, ...updates } : p) });
  }
  removeProduct(id) { return this.update({ products: this.state.products.filter(p => p.id !== id) }); }

  setSystemItems(items) { return this.update({ systemItems: clone(items) }); }
  setActiveQuantities(quantities) { return this.update({ activeQuantities: clone(quantities) }); }
  addActiveQuantity(qty) { return this.update({ activeQuantities: [...this.state.activeQuantities, qty] }); }
  removeActiveQuantity(index) {
    return this.update({ activeQuantities: this.state.activeQuantities.filter((_, i) => i !== index) });
  }
  clearActiveQuantities() { return this.update({ activeQuantities: [] }); }

  setCurrentStep(step) { return this.update({ currentStep: step }); }
  setComparisonFilter(filter) { return this.update({ comparisonFilter: filter }); }
  setComparisonScope(scope) { return this.update({ comparisonScope: scope }); }
  setEditingIndex(index) { return this.update({ currentEditingIndex: index }); }
  setLoading(isLoading) { return this.update({ isLoading: Boolean(isLoading) }); }
  setOnlineStatus(isOnline) { return this.update({ isOnline: Boolean(isOnline) }); }
  setLastSyncTime(time) { return this.update({ lastSyncTime: time }); }

  undo() {
    if (!this.history.length) return null;
    this.future.push(clone(this.state));
    this.state = this.history.pop();
    this.notifyObservers({ undoTriggered: true });
    return this.getState();
  }

  redo() {
    if (!this.future.length) return null;
    this.history.push(clone(this.state));
    this.state = this.future.pop();
    this.notifyObservers({ redoTriggered: true });
    return this.getState();
  }

  clearHistory() {
    this.history = [];
    this.future = [];
  }

  transaction(updateFn) {
    if (typeof updateFn !== 'function') throw new TypeError('transaction requires a function');
    const updates = updateFn(this.getState());
    return this.update(updates || {});
  }

  reset() {
    this.pushHistory();
    this.state = clone(INITIAL_STATE);
    this.notifyObservers({ reset: true });
    return this.getState();
  }
}

export const stateManager = new StateManager();
export default StateManager;
