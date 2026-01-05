export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    get() {
      return { ...state };
    },
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach(fn => fn(this.get()));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
