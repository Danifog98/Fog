/* =========================================================
   DANI SYSTEM — interfaz
   Render + navegación + notificaciones.
   Aquí no se calcula nada: todo viene de engine.js.
   ========================================================= */

(function (global) {
  "use strict";

  var C = global.DS.config;
  var store = global.DS.store;
  var E = global.DS.engine;

  function $(s, c) {
    return (c || document).querySelector(s);
  }
  function $$(s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function num(n) {
    return Math.round(Number(n) || 0).toLocaleString("es-ES");
  }
  function signed(n) {
    return (n >= 0 ? "+" : "") + num(n);
  }
  function pct1(n) {
    return (Number(n) || 0).toFixed(1).replace(".", ",");
  }

  function statNames(list) {
    return list
      .map(function (n) {
        return n.stat;
      })
      .join(" · ");
  }

  var MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

  function dayLabel(ts) {
    var d = new Date(ts);
    var today = E.startOfDay(Date.now()).getTime();
    var that = E.startOfDay(d).getTime();
    if (that === today) return "HOY";
    if (that === today - E.DAY) return "AYER";
    return d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function timeLabel(ts) {
    var d = new Date(ts);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* =========================================================
     Notificaciones
     ========================================================= */
  var Toast = {
    host: null,
    show: function (kicker, text) {
      if (!Toast.host) Toast.host = $("[data-toasts]");
      var t = el("div", "toast");
      t.appendChild(el("p", "toast__k", kicker || "System"));
      t.appendChild(el("p", "toast__v", text));
      Toast.host.appendChild(t);
      global.setTimeout(function () {
        t.className = "toast toast--out";
        global.setTimeout(function () {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }, 2600);
    }
  };

  var Flash = {
    queue: [],
    busy: false,
    push: function (kicker, value, sub) {
      Flash.queue.push([kicker, value, sub]);
      Flash.next();
    },
    next: function () {
      if (Flash.busy || !Flash.queue.length) return;
      var item = Flash.queue.shift();
      Flash.busy = true;
      var node = $("[data-flash]");
      $("[data-flash-k]").textContent = item[0];
      $("[data-flash-v]").textContent = item[1];
      $("[data-flash-sub]").textContent = item[2] || "";
      node.hidden = false;
      var close = function () {
        node.hidden = true;
        Flash.busy = false;
        node.removeEventListener("click", close);
        global.setTimeout(Flash.next, 120);
      };
      node.addEventListener("click", close);
      global.setTimeout(close, 1900);
    }
  };

  /* Un único punto de escucha de eventos del motor. */
  E.on(function (events) {
    events.forEach(function (ev) {
      if (ev.type === "xp") {
        Toast.show("System", signed(ev.amount) + " XP · " + ev.label);
      } else if (ev.type === "level") {
        Flash.push("Level Up", "LEVEL " + ev.to, "Level " + ev.from + " → " + ev.to);
      } else if (ev.type === "rank") {
        Flash.push("Rank Up", ev.to, "Rank " + ev.from + " → " + ev.to);
      }
    });
  });

  /* =========================================================
     Dashboard
     ========================================================= */
  function renderDashboard() {
    var s = E.snapshot();

    $("[data-name]").textContent = store.get().user.name || "DANI";
    $("[data-level]").textContent = s.level.level;

    var rank = $("[data-rank]");
    rank.textContent = s.rank;
    rank.setAttribute("data-len", String(s.rank.length));

    $("[data-xp-into]").textContent = num(s.level.xpInto);
    $("[data-xp-needed]").textContent = s.level.max ? "MAX" : num(s.level.xpNeeded);
    $("[data-xp-next]").textContent = s.level.max
      ? "NIVEL MÁXIMO"
      : num(s.level.xpToNext) + " XP para el nivel " + (s.level.level + 1);
    $("[data-xp-bar]").style.width = s.level.pct + "%";

    $("[data-power]").textContent = num(s.power);
    $("[data-xp-total]").textContent = num(s.totalXP);
    $("[data-xp-today]").textContent = signed(s.today);
    $("[data-xp-week]").textContent = signed(s.week);
    $("[data-month-xp]").textContent = signed(s.month) + " este mes";

    $("[data-rank-next]").textContent = s.nextRank
      ? "Rank " + s.nextRank.id + " a " + num(s.nextRank.min) + " power"
      : "Rank máximo";

    renderStats(s.stats);
    renderChart();
    renderAnalysis();
  }

  function renderStats(stats) {
    var host = $("[data-stats]");
    host.textContent = "";

    stats.forEach(function (st) {
      var card = el("div", "stat");
      card.style.setProperty("--h", st.hue);

      var top = el("div", "stat__top");
      top.appendChild(el("p", "stat__name", st.stat));
      top.appendChild(el("p", "stat__pct", pct1(st.mastery) + "%"));
      card.appendChild(top);

      var bar = el("div", "stat__bar");
      var fill = el("i", "stat__fill");
      fill.style.width = Math.max(st.mastery, st.mastery > 0 ? 1.5 : 0) + "%";
      bar.appendChild(fill);
      card.appendChild(bar);

      var foot = el("div", "stat__foot");
      foot.appendChild(el("span", null, "LV " + st.level + " · " + num(st.xp) + " XP"));

      var right = el("span", null);
      if (st.neglected && st.xp > 0) {
        var tag = el("i", "tag-idle", st.daysIdle + "D SIN ACTIVIDAD");
        right.appendChild(tag);
      } else {
        var arrow = st.trend === "up" ? "▲" : st.trend === "down" ? "▼" : "—";
        right.className = "delta--" + st.trend;
        right.textContent = arrow + " " + pct1(st.delta) + "% / 7D";
      }
      foot.appendChild(right);
      card.appendChild(foot);

      host.appendChild(card);
    });
  }

  function renderChart() {
    var series = E.xpSeries(14);
    var max = series.reduce(function (m, d) {
      return Math.max(m, d.xp);
    }, 0);
    var host = $("[data-chart]");
    var xs = $("[data-chart-x]");
    host.textContent = "";
    xs.textContent = "";

    series.forEach(function (d, i) {
      var col = el("div", "chart__col");
      var bar = el("i", "chart__bar");
      var h = max > 0 ? Math.max(2, (d.xp / max) * 100) : 2;
      bar.style.height = h + "%";
      if (!d.xp) bar.setAttribute("data-zero", "1");
      bar.title = num(d.xp) + " XP";
      col.appendChild(bar);
      host.appendChild(col);

      var day = new Date(d.ts).getDate();
      xs.appendChild(el("span", null, i % 2 === 0 || i === series.length - 1 ? String(day) : ""));
    });
  }

  function renderAnalysis() {
    var a = E.getAnalytics("month");
    var host = $("[data-analysis]");
    host.textContent = "";

    if (!a.snapshot.entries) {
      host.appendChild(el("p", "empty", "Sin datos todavía · registra tu primera actividad"));
      return;
    }

    var rows = [
      ["Stat más fuerte", a.strongest ? a.strongest.stat + " · " + pct1(a.strongest.mastery) + "%" : "—"],
      ["Stat más débil", a.weakest ? a.weakest.stat + " · " + pct1(a.weakest.mastery) + "%" : "—"],
      [
        "Mayor crecimiento",
        a.fastest && a.fastest.delta > 0
          ? a.fastest.stat + " · +" + pct1(a.fastest.delta) + "% / 7D"
          : "—"
      ],
      ["Problemas resueltos", num(a.problemsSolved) + " este mes"],
      ["Categorías abandonadas", a.idle.length ? statNames(a.idle) : "Ninguna"]
    ];

    if (a.untouched.length) {
      rows.push(["Sin iniciar", statNames(a.untouched)]);
    }

    rows.forEach(function (r, i) {
      var row = el("div", "entry");
      if (i === rows.length - 1) row.style.borderBottom = "0";
      var main = el("div", "entry__main");
      main.appendChild(el("p", "entry__meta", r[0]));
      main.appendChild(el("p", "entry__title entry__title--wrap", r[1]));
      row.appendChild(main);
      host.appendChild(row);
    });
  }

  /* =========================================================
     Registrar actividad
     ========================================================= */
  var draft = { category: null, action: null, minutes: "", amount: "", difficulty: "NORMAL" };

  function renderCats() {
    var host = $("[data-cats]");
    host.textContent = "";
    C.CATEGORIES.forEach(function (c) {
      var b = el("button", "chip", c.stat);
      b.type = "button";
      b.setAttribute("aria-pressed", draft.category === c.id ? "true" : "false");
      b.addEventListener("click", function () {
        draft.category = c.id;
        draft.action = null;
        renderCats();
        renderActs();
        renderExtra();
        renderPreview();
      });
      host.appendChild(b);
    });
  }

  function renderActs() {
    var host = $("[data-acts]");
    host.textContent = "";
    if (!draft.category) {
      host.appendChild(el("p", "empty", "Elige una categoría"));
      return;
    }
    (C.ACTIONS[draft.category] || []).forEach(function (a) {
      var b = el("button", "chip");
      b.type = "button";
      b.appendChild(document.createTextNode(a.label));
      var xp = a.scaled ? "±" : signed(a.xp);
      var s = el("span", "chip__xp", xp);
      b.appendChild(s);
      b.setAttribute("aria-pressed", draft.action === a.id ? "true" : "false");
      b.addEventListener("click", function () {
        draft.action = a.id;
        renderActs();
        renderExtra();
        renderPreview();
      });
      host.appendChild(b);
    });
  }

  function renderExtra() {
    var host = $("[data-extra]");
    host.textContent = "";
    var def = C.action(draft.category, draft.action);
    if (!def) return;

    if (def.input === "min") {
      host.appendChild(
        field("Minutos", "number", "min", draft.minutes, "30", function (v) {
          draft.minutes = v;
          renderPreview();
        })
      );
    }
    if (def.input === "amount") {
      host.appendChild(
        field("Importe (€)", "number", "amount", draft.amount, "200", function (v) {
          draft.amount = v;
          renderPreview();
        })
      );
    }
    if (def.scaled) {
      var wrap = el("label", "field");
      wrap.appendChild(el("span", null, "Dificultad"));
      var sel = el("select");
      C.DIFFICULTIES.forEach(function (d) {
        var o = el("option", null, d + "  ·  " + signed(C.DIFFICULTY_XP[d]) + " XP");
        o.value = d;
        if (draft.difficulty === d) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        draft.difficulty = sel.value;
        renderPreview();
      });
      wrap.appendChild(sel);
      host.appendChild(wrap);
    }
  }

  function field(label, type, key, value, placeholder, onInput) {
    var wrap = el("label", "field");
    wrap.appendChild(el("span", null, label));
    var input = el("input");
    input.type = type;
    input.value = value || "";
    input.placeholder = placeholder || "";
    input.inputMode = type === "number" ? "numeric" : "text";
    input.addEventListener("input", function () {
      onInput(input.value);
    });
    wrap.appendChild(input);
    return wrap;
  }

  function draftXP() {
    if (!draft.category || !draft.action) return 0;
    return C.actionXP(draft.category, draft.action, {
      minutes: draft.minutes,
      difficulty: draft.difficulty
    });
  }

  function renderPreview() {
    var xp = draftXP();
    $("[data-preview]").textContent = signed(xp) + " XP";
    $("[data-submit]").disabled = !(draft.category && draft.action);
  }

  function submitDraft() {
    if (!draft.category || !draft.action) return;
    var notes = $("[data-notes]").value.trim();
    var def = C.action(draft.category, draft.action);

    var meta = null;
    if (def.input === "min" && draft.minutes) meta = { minutes: Number(draft.minutes) };
    if (def.input === "amount" && draft.amount) meta = { amount: Number(draft.amount) };
    if (def.scaled) meta = { difficulty: draft.difficulty };

    var res = E.logActivity({
      category: draft.category,
      action: draft.action,
      notes: notes,
      minutes: draft.minutes,
      difficulty: draft.difficulty,
      meta: meta,
      source: "quick"
    });

    if (!res.ok) {
      Toast.show("System", "No se pudo registrar (" + res.reason + ")");
      return;
    }

    draft.action = null;
    draft.minutes = "";
    draft.amount = "";
    $("[data-notes]").value = "";
    renderActs();
    renderExtra();
    renderPreview();
    go("dashboard");
  }

  /* =========================================================
     Historial
     ========================================================= */
  var historyFilter = "";

  function renderFilter() {
    var sel = $("[data-filter]");
    if (sel.options.length > 1) return;
    C.CATEGORIES.forEach(function (c) {
      var o = el("option", null, c.stat);
      o.value = c.id;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      historyFilter = sel.value;
      renderHistory();
    });
  }

  function renderHistory() {
    var host = $("[data-log]");
    host.textContent = "";
    var days = E.activityLog({ category: historyFilter || null });

    var count = days.reduce(function (n, d) {
      return n + d.items.length;
    }, 0);
    $("[data-history-count]").textContent = count
      ? num(count) + " registros"
      : "";

    if (!days.length) {
      var card = el("div", "card");
      card.appendChild(el("p", "empty", "Sin actividad registrada"));
      host.appendChild(card);
      return;
    }

    days.forEach(function (d) {
      var box = el("div", "day");
      var head = el("div", "day__head");
      head.appendChild(el("p", "day__date", dayLabel(d.ts)));
      head.appendChild(el("p", "day__total mono", signed(d.total) + " XP"));
      box.appendChild(head);

      d.items.forEach(function (t) {
        box.appendChild(entryRow(t));
      });
      host.appendChild(box);
    });
  }

  function entryRow(t) {
    var cat = C.category(t.category);
    var row = el("div", "entry");

    var dot = el("i", "entry__dot");
    dot.style.setProperty("--h", cat ? cat.hue : 200);
    row.appendChild(dot);

    var main = el("div", "entry__main");
    main.appendChild(el("p", "entry__title", t.label || t.action));
    var bits = [C.categoryName(t.category), timeLabel(t.ts)];
    if (t.meta && t.meta.minutes) bits.push(t.meta.minutes + " MIN");
    if (t.meta && t.meta.amount) bits.push(num(t.meta.amount) + " €");
    if (t.meta && t.meta.difficulty) bits.push(t.meta.difficulty);
    if (t.notes) bits.push(t.notes);
    main.appendChild(el("p", "entry__meta", bits.join(" · ")));
    row.appendChild(main);

    var xp = el("p", "entry__xp mono", signed(t.amount) + " XP");
    if (t.amount < 0) xp.setAttribute("data-neg", "1");
    row.appendChild(xp);

    var del = el("button", "entry__del", "✕");
    del.type = "button";
    del.title = "Eliminar";
    del.setAttribute("aria-label", "Eliminar registro");
    del.addEventListener("click", function () {
      if (!global.confirm("¿Eliminar este registro? El XP se recalculará.")) return;
      E.deleteActivity(t.id);
      Toast.show("System", "Registro eliminado · XP recalculado");
    });
    row.appendChild(del);

    return row;
  }

  /* =========================================================
     Navegación
     ========================================================= */
  var current = "dashboard";

  function go(view) {
    current = view;
    $$("[data-view]").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== view;
    });
    $$("[data-go]").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-go") === view ? "true" : "false");
    });
    if (global.location.hash !== "#" + view) {
      global.history.replaceState(null, "", "#" + view);
    }
    render();
    global.scrollTo(0, 0);
  }

  /* Cada vista se dibuja sola: no se renderiza lo que no se ve. */
  function render() {
    if (current === "dashboard") renderDashboard();
    else if (current === "log") {
      renderCats();
      renderActs();
      renderExtra();
      renderPreview();
    } else if (current === "history") renderHistory();
  }

  function init() {
    renderFilter();

    $$("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        go(b.getAttribute("data-go"));
      });
    });
    $("[data-quick]").addEventListener("click", function () {
      go("log");
    });
    $("[data-submit]").addEventListener("click", submitDraft);

    store.subscribe(render);

    var hash = (global.location.hash || "").replace("#", "");
    go($('[data-view="' + hash + '"]') ? hash : "dashboard");
  }

  global.DS.ui = { go: go, render: render, toast: Toast.show, flash: Flash.push };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
