/* =========================================================
   FOG — tienda: filtros, orden y estado en la URL
   ========================================================= */

(function () {
  "use strict";

  var Catalog = window.FogCatalog;

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function start() {
    var grid = $("[data-shop-grid]");
    if (!grid) return;

    var filtersEl = $("[data-filters]");
    var sortEl = $("[data-sort]");
    var countEl = $("[data-shop-count]");

    var params = new URLSearchParams(location.search);
    var state = {
      category: params.get("categoria") || "todo",
      sort: params.get("orden") || "coleccion"
    };

    var known = Catalog.categories.some(function (c) {
      return c.id === state.category;
    });
    if (!known) state.category = "todo";

    if (filtersEl) {
      filtersEl.innerHTML = Catalog.categories
        .map(function (c) {
          return (
            '<button type="button" class="chip" data-cat="' +
            c.id +
            '" aria-pressed="false">' +
            Catalog.escape(c.label) +
            "</button>"
          );
        })
        .join("");

      filtersEl.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-cat]");
        if (!btn) return;
        state.category = btn.getAttribute("data-cat");
        apply();
      });
    }

    if (sortEl) {
      sortEl.value = state.sort;
      sortEl.addEventListener("change", function () {
        state.sort = sortEl.value;
        apply();
      });
    }

    function visible() {
      var list = Catalog.products.filter(function (p) {
        return state.category === "todo" || p.category === state.category;
      });
      if (state.sort === "precio-asc") {
        list.sort(function (a, b) {
          return a.price - b.price;
        });
      } else if (state.sort === "precio-desc") {
        list.sort(function (a, b) {
          return b.price - a.price;
        });
      } else if (state.sort === "nombre") {
        list.sort(function (a, b) {
          return a.name.localeCompare(b.name, "es");
        });
      }
      return list;
    }

    function syncUrl() {
      var next = new URLSearchParams();
      if (state.category !== "todo") next.set("categoria", state.category);
      if (state.sort !== "coleccion") next.set("orden", state.sort);
      var q = next.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    }

    function apply() {
      var list = visible();

      if (filtersEl) {
        $$("[data-cat]", filtersEl).forEach(function (btn) {
          btn.setAttribute(
            "aria-pressed",
            btn.getAttribute("data-cat") === state.category ? "true" : "false"
          );
        });
      }

      if (countEl) {
        countEl.textContent =
          list.length + (list.length === 1 ? " referencia" : " referencias");
      }

      if (!list.length) {
        grid.innerHTML = '<p class="empty">Sin referencias en esta categoría</p>';
      } else {
        window.Fog.renderGrid(grid, list);
      }

      syncUrl();
    }

    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
