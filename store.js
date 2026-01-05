// FILE: store.js
// Compatibility shim: prevents fatal startup if some older file still imports "./store.js" or "/store.js".

const store = {
  _state: { ready: false },
  _subs: new Set(),

  getState() { return this._state; },
  setState(patch) {
    this._state = { ...this._state, ...(patch || {}) };
    for (const fn of this._subs) { try { fn(this._state); } catch (e) {} }
  },
  subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }
};

export function getState() { return store.getState(); }
export function setState(patch) { return store.setState(patch); }
export function subscribe(fn) { return store.subscribe(fn); }
export default store;
