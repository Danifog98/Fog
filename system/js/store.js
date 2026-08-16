/* =========================================================
   DANI SYSTEM — almacenamiento
   localStorage + esquema + suscripciones.
   El XP vive SOLO como transacciones (state.xp): cualquier
   total se recalcula en engine.js. No se guardan derivados.
   ========================================================= */

(function (global) {
  "use strict";

  var KEY = "dani:system";
  var VERSION = 1;

  function emptyState() {
    return {
      version: VERSION,
      user: { name: "DANI", created: new Date().toISOString() },
      xp: [],            // transacciones de XP = registro de actividad
      quests: [],        // fase 2
      weekly: [],        // fase 2
      bosses: [],        // fase 3
      skills: [],        // fase 3
      achievements: [],  // fase 3
      finance: [],       // fase 4
      trades: [],        // fase 4
      settings: {}
    };
  }

  var state = null;
  var listeners = [];
  var saveTimer = null;

  function load() {
    var raw = null;
    try {
      raw = global.localStorage.getItem(KEY);
    } catch (e) {
      raw = null; // modo privado / almacenamiento bloqueado
    }
    if (!raw) return emptyState();

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return emptyState();
    }
    return migrate(parsed);
  }

  /* Completa las claves que falten: permite añadir módulos sin romper
     los datos ya guardados. */
  function migrate(data) {
    var base = emptyState();
    if (!data || typeof data !== "object") return base;

    Object.keys(base).forEach(function (k) {
      if (data[k] === undefined || data[k] === null) data[k] = base[k];
      else if (Array.isArray(base[k]) && !Array.isArray(data[k])) data[k] = base[k];
    });
    data.version = VERSION;
    return data;
  }

  function persist() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function schedule() {
    if (saveTimer) global.clearTimeout(saveTimer);
    saveTimer = global.setTimeout(function () {
      saveTimer = null;
      persist();
    }, 120);
  }

  function get() {
    if (!state) state = load();
    return state;
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) listeners[i](get());
  }

  /* Única puerta de escritura: muta, guarda y avisa a la UI. */
  function commit(mutator) {
    var s = get();
    var result = mutator ? mutator(s) : undefined;
    schedule();
    notify();
    return result;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (f) {
        return f !== fn;
      });
    };
  }

  function reset() {
    state = emptyState();
    persist();
    notify();
  }

  function replace(data) {
    state = migrate(data);
    persist();
    notify();
  }

  /* id corto, único y ordenable por tiempo. */
  function id(prefix) {
    return (
      (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7)
    );
  }

  global.DS = global.DS || {};
  global.DS.store = {
    KEY: KEY,
    get: get,
    commit: commit,
    subscribe: subscribe,
    reset: reset,
    replace: replace,
    persist: persist,
    id: id
  };
})(window);
