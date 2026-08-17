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
  var Q = global.DS.quests;
  var B = global.DS.bosses;
  var P = global.DS.progress;

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
      } else if (ev.type === "quest") {
        Toast.show("System", (ev.questType === "weekly" ? "Weekly" : "Daily") + " completada · " + ev.title);
      } else if (ev.type === "rank") {
        Flash.push("Rank Up", ev.to, "Rank " + ev.from + " → " + ev.to);
      } else if (ev.type === "boss") {
        Flash.push("Boss Defeated", ev.name, signed(ev.xp) + " XP");
      } else if (ev.type === "achievement") {
        Toast.show("Logro desbloqueado", ev.name + " · " + ev.desc);
      } else if (ev.type === "skill") {
        Toast.show("Skill desbloqueada", ev.name + " · " + ev.desc);
      }
    });
  });

  /* Estado vacío con acción: nunca datos de relleno. */
  function emptyState(host, text, ctaText, onClick) {
    var card = el("div", "card empty-card");
    card.appendChild(el("p", "empty", text));
    if (ctaText) {
      var b = el("button", "btn btn--ghost empty-card__cta", ctaText);
      b.type = "button";
      b.addEventListener("click", onClick);
      card.appendChild(b);
    }
    host.appendChild(card);
  }

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
    renderStreaks();
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
      top.appendChild(el("p", "stat__lv mono", "LV " + String(st.level).padStart(2, "0")));
      card.appendChild(top);

      card.appendChild(
        el(
          "p",
          "stat__xp mono",
          st.levelNeeded
            ? num(st.levelInto) + " / " + num(st.levelNeeded) + " XP"
            : num(st.xp) + " XP"
        )
      );

      var bar = el("div", "stat__bar");
      var fill = el("i", "stat__fill");
      fill.style.width = (st.xp > 0 ? Math.max(2, st.levelPct) : 0) + "%";
      bar.appendChild(fill);
      card.appendChild(bar);

      var foot = el("div", "stat__foot");
      foot.appendChild(el("span", null, num(st.xp) + " XP · " + pct1(st.mastery) + "% dominio"));

      var right = el("span", null);
      if (st.xp === 0) {
        right.className = "delta--flat";
        right.textContent = "SIN INICIAR";
      } else if (st.neglected) {
        var tag = el("i", "tag-idle", st.daysIdle + "D SIN ACTIVIDAD");
        right.appendChild(tag);
      } else {
        var arrow = st.growth > 0 ? "▲" : "—";
        right.className = st.growth > 0 ? "delta--up" : "delta--flat";
        right.textContent = arrow + " " + pct1(st.growth) + "% / 7D";
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
      host.textContent = "";
      var p = el("p", "empty", "Sin datos · registra tu primera acción");
      host.appendChild(p);
      return;
    }

    var rows = [
      ["Más fuerte", a.strongest ? a.strongest.stat + " · LV " + a.strongest.level : "—"],
      ["Más débil", a.weakest ? a.weakest.stat + " · LV " + a.weakest.level : "—"],
      [
        "Mayor crecimiento",
        a.fastest && a.fastest.growth > 0
          ? a.fastest.stat + " · +" + pct1(a.fastest.growth) + "% / 7D"
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

  function renderStreaks() {
    var host = $("[data-streaks]");
    host.textContent = "";
    E.getStreaks().forEach(function (s) {
      var box = el("div", "streak" + (s.current > 0 ? " streak--on" : ""));
      box.appendChild(el("p", "streak__k", s.label));
      var v = el("p", "streak__v mono");
      v.appendChild(document.createTextNode(String(s.current)));
      v.appendChild(el("small", null, "D · MAX " + s.best));
      box.appendChild(v);
      host.appendChild(box);
    });

    var qs = Q.questStats();
    var todayTotal = qs.completedToday + qs.activeToday;
    $("[data-quest-slots]").textContent = todayTotal
      ? qs.completedToday + "/" + todayTotal + " misiones hoy"
      : "sin misiones hoy";
  }

  /* =========================================================
     Quests
     ========================================================= */
  function questCard(q) {
    var cat = C.category(q.category);
    var done = q.status === Q.STATUS.COMPLETED;
    var dead = q.status === Q.STATUS.FAILED || q.status === Q.STATUS.SKIPPED;
    var card = el("div", "quest" + (done ? " quest--done" : dead ? " quest--dead" : ""));
    card.style.setProperty("--h", cat ? cat.hue : 200);

    var top = el("div", "quest__top");
    var left = el("div");
    left.appendChild(el("p", "quest__title", q.title));
    var bits = [C.categoryName(q.category), q.difficulty];
    if (q.recurring) bits.push("RECURRENTE");
    if (done && q.completedAt) bits.push("HECHA " + timeLabel(q.completedAt));
    if (dead) bits.push(q.status);
    left.appendChild(el("p", "quest__meta", bits.join(" · ")));
    top.appendChild(left);
    top.appendChild(el("p", "quest__xp mono", signed(q.xp) + " XP"));
    card.appendChild(top);

    if (q.description) card.appendChild(el("p", "quest__desc", q.description));

    if (q.target > 1) {
      var wrap = el("div", "quest__progress");
      var bar = el("div", "bar bar--thin");
      var fill = el("i", "bar__fill");
      fill.style.width = Math.min(100, (q.progress / q.target) * 100) + "%";
      bar.appendChild(fill);
      wrap.appendChild(bar);
      wrap.appendChild(el("span", "quest__count mono", q.progress + "/" + q.target));
      card.appendChild(wrap);
    }

    if (!done && !dead) {
      var actions = el("div", "quest__actions");

      if (q.target > 1) {
        var plus = el("button", "btn btn--ghost", "+1");
        plus.type = "button";
        plus.addEventListener("click", function () {
          Q.addProgress(q.id, 1);
        });
        actions.appendChild(plus);
      }

      var comp = el("button", "btn", "Completar");
      comp.type = "button";
      comp.addEventListener("click", function () {
        Q.completeQuest(q.id);
      });
      actions.appendChild(comp);

      var skip = el("button", "btn btn--ghost", "Saltar");
      skip.type = "button";
      skip.addEventListener("click", function () {
        Q.skipQuest(q.id);
        Toast.show("System", "Quest saltada");
      });
      actions.appendChild(skip);

      card.appendChild(actions);
    }

    var del = el("button", "icon-x", "✕");
    del.type = "button";
    del.setAttribute("aria-label", "Eliminar quest");
    del.addEventListener("click", function () {
      if (!global.confirm("¿Eliminar la quest y su XP asociado?")) return;
      Q.deleteQuest(q.id);
      Toast.show("System", "Quest eliminada");
    });
    if (card.querySelector(".quest__actions")) card.querySelector(".quest__actions").appendChild(del);
    else {
      var only = el("div", "quest__actions");
      only.appendChild(del);
      card.appendChild(only);
    }

    return card;
  }

  function renderQuestList(host, list, emptyText) {
    host.textContent = "";
    if (!list.length) {
      emptyState(host, emptyText, "Crear quest", function () {
        var f = $("[data-new-form]");
        f.hidden = false;
        $("[data-q-title]").focus();
      });
      return;
    }
    var order = { ACTIVE: 0, COMPLETED: 1, SKIPPED: 2, FAILED: 3 };
    list
      .slice()
      .sort(function (a, b) {
        return (order[a.status] || 0) - (order[b.status] || 0);
      })
      .forEach(function (q) {
        host.appendChild(questCard(q));
      });
  }

  function renderQuests() {
    var d = Q.daily();
    var w = Q.weekly();
    renderQuestList($("[data-daily]"), d, "Sin daily quests · crea la primera");
    renderQuestList($("[data-weekly]"), w, "Sin weekly quests");

    var activeD = d.filter(function (q) {
      return q.status === Q.STATUS.ACTIVE;
    }).length;
    $("[data-daily-count]").textContent = activeD + "/" + C.LIMITS.dailyQuests + " activas";
    $("[data-weekly-count]").textContent = w.length
      ? w.filter(function (q) {
          return q.status === Q.STATUS.COMPLETED;
        }).length +
        "/" +
        w.length +
        " completadas"
      : "";
  }

  /* ---------- Formulario de nueva quest ---------- */
  var qDraft = { type: "daily" };

  function initQuestForm() {
    var cat = $("[data-q-cat]");
    C.CATEGORIES.forEach(function (c) {
      var o = el("option", null, c.stat);
      o.value = c.id;
      cat.appendChild(o);
    });

    var diff = $("[data-q-diff]");
    C.DIFFICULTIES.forEach(function (d) {
      var o = el("option", null, d);
      o.value = d;
      if (d === "NORMAL") o.selected = true;
      diff.appendChild(o);
    });

    function syncXP() {
      $("[data-q-xp]").value = Q.defaultXP(qDraft.type, diff.value);
    }
    syncXP();
    diff.addEventListener("change", syncXP);

    $$("[data-qtype]").forEach(function (b) {
      b.addEventListener("click", function () {
        qDraft.type = b.getAttribute("data-qtype");
        $$("[data-qtype]").forEach(function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        syncXP();
      });
    });

    $("[data-new-toggle]").addEventListener("click", function () {
      var form = $("[data-new-form]");
      form.hidden = !form.hidden;
      if (!form.hidden) $("[data-q-title]").focus();
    });

    $("[data-q-save]").addEventListener("click", function () {
      var res = Q.createQuest({
        type: qDraft.type,
        title: $("[data-q-title]").value,
        description: $("[data-q-desc]").value,
        category: cat.value,
        difficulty: diff.value,
        xp: $("[data-q-xp]").value,
        target: $("[data-q-target]").value,
        recurring: $("[data-q-recurring]").checked
      });

      if (!res.ok) {
        var msg =
          res.reason === "limit"
            ? "Máximo " + C.LIMITS.dailyQuests + " daily quests activas"
            : res.reason === "title"
            ? "Falta el título"
            : "No se pudo crear la quest";
        Toast.show("System", msg);
        return;
      }

      $("[data-q-title]").value = "";
      $("[data-q-desc]").value = "";
      $("[data-q-target]").value = "1";
      $("[data-q-recurring]").checked = false;
      $("[data-new-form]").hidden = true;
      Toast.show("System", "Quest creada · " + res.quest.title);
    });
  }

  /* =========================================================
     Bosses
     ========================================================= */
  function bossCard(b) {
    var cat = C.category(b.category);
    var pct = B.progress(b);
    var done = b.status === B.STATUS.DEFEATED;

    var card = el("div", "boss" + (done ? " boss--done" : ""));
    card.style.setProperty("--h", cat ? cat.hue : 200);

    var head = el("div", "boss__head");
    var left = el("div");
    left.appendChild(el("p", "boss__kicker", done ? "Boss derrotado" : "Boss"));
    left.appendChild(el("p", "boss__name", b.name));
    head.appendChild(left);
    var threat = el("div", "boss__threat");
    threat.appendChild(el("p", "boss__threat-k", "Amenaza"));
    threat.appendChild(el("p", "boss__threat-v", b.difficulty));
    head.appendChild(threat);
    card.appendChild(head);

    if (b.description) card.appendChild(el("p", "boss__desc", b.description));

    var hp = el("div", "boss__hp");
    var hpTop = el("div", "boss__hp-top");
    hpTop.appendChild(el("span", "label", done ? "Derrotado" : "HP restante"));
    hpTop.appendChild(el("span", "boss__hp-v mono", Math.round(done ? 0 : 100 - pct) + "%"));
    hp.appendChild(hpTop);
    var bar = el("div", "bar");
    var fill = el("i", "bar__fill bar__fill--hp");
    fill.style.width = (done ? 0 : 100 - pct) + "%";
    bar.appendChild(fill);
    hp.appendChild(bar);
    card.appendChild(hp);

    if (b.tasks.length) {
      var list = el("div", "tasks");
      b.tasks.forEach(function (t) {
        var row = el("label", "task" + (t.done ? " task--done" : ""));
        var cb = el("input");
        cb.type = "checkbox";
        cb.checked = t.done;
        cb.disabled = done;
        cb.addEventListener("change", function () {
          B.completeBossTask(b.id, t.id, cb.checked);
        });
        row.appendChild(cb);
        row.appendChild(el("span", "task__title", t.title));
        if (!done) {
          var x = el("button", "task__del", "✕");
          x.type = "button";
          x.setAttribute("aria-label", "Quitar tarea");
          x.addEventListener("click", function (ev) {
            ev.preventDefault();
            B.removeTask(b.id, t.id);
          });
          row.appendChild(x);
        }
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    var foot = el("div", "boss__foot");
    foot.appendChild(el("span", "boss__reward mono", signed(b.xp) + " XP"));

    var actions = el("div", "boss__actions");
    if (!done) {
      var add = el("button", "btn btn--ghost", "+ Tarea");
      add.type = "button";
      add.addEventListener("click", function () {
        var title = global.prompt("Nueva tarea");
        if (title) B.addTask(b.id, title);
      });
      actions.appendChild(add);

      var kill = el("button", "btn", "Derrotar");
      kill.type = "button";
      kill.addEventListener("click", function () {
        B.defeatBoss(b.id);
      });
      actions.appendChild(kill);
    }
    var del = el("button", "icon-x", "✕");
    del.type = "button";
    del.setAttribute("aria-label", "Eliminar boss");
    del.addEventListener("click", function () {
      if (!global.confirm("¿Eliminar el boss y su XP asociado?")) return;
      B.deleteBoss(b.id);
      Toast.show("System", "Boss eliminado");
    });
    actions.appendChild(del);
    foot.appendChild(actions);
    card.appendChild(foot);

    return card;
  }

  function renderBosses() {
    var host = $("[data-boss-list]");
    host.textContent = "";
    var list = B.all();

    if (!list.length) {
      emptyState(host, "Sin bosses activos", "Crear el primero", function () {
        $("[data-boss-form]").hidden = false;
        $("[data-b-name]").focus();
      });
      return;
    }

    var active = list.filter(function (b) {
      return b.status !== B.STATUS.DEFEATED;
    });
    var dead = list.filter(function (b) {
      return b.status === B.STATUS.DEFEATED;
    });

    if (active.length) {
      active.forEach(function (b) {
        host.appendChild(bossCard(b));
      });
    } else {
      emptyState(host, "Sin bosses activos", "Crear boss", function () {
        $("[data-boss-form]").hidden = false;
        $("[data-b-name]").focus();
      });
    }

    if (dead.length) {
      var head = el("div", "section-head");
      head.appendChild(el("p", "label", "Derrotados"));
      head.appendChild(el("p", "label", dead.length + " en total"));
      host.appendChild(head);
      dead.forEach(function (b) {
        host.appendChild(bossCard(b));
      });
    }
  }

  function initBossForm() {
    var cat = $("[data-b-cat]");
    C.CATEGORIES.forEach(function (c) {
      var o = el("option", null, c.stat);
      o.value = c.id;
      cat.appendChild(o);
    });

    var diff = $("[data-b-diff]");
    C.DIFFICULTIES.forEach(function (d) {
      var o = el("option", null, d);
      o.value = d;
      if (d === "NORMAL") o.selected = true;
      diff.appendChild(o);
    });

    function syncXP() {
      $("[data-b-xp]").value = B.defaultXP(diff.value);
    }
    syncXP();
    diff.addEventListener("change", syncXP);

    $("[data-boss-toggle]").addEventListener("click", function () {
      var f = $("[data-boss-form]");
      f.hidden = !f.hidden;
      if (!f.hidden) $("[data-b-name]").focus();
    });

    $("[data-b-save]").addEventListener("click", function () {
      var tasks = $("[data-b-tasks]").value.split("\n");
      var res = B.createBoss({
        name: $("[data-b-name]").value,
        description: $("[data-b-desc]").value,
        category: cat.value,
        difficulty: diff.value,
        xp: $("[data-b-xp]").value,
        tasks: tasks
      });
      if (!res.ok) {
        Toast.show("System", res.reason === "name" ? "Falta el nombre" : "No se pudo crear el boss");
        return;
      }
      $("[data-b-name]").value = "";
      $("[data-b-desc]").value = "";
      $("[data-b-tasks]").value = "";
      $("[data-boss-form]").hidden = true;
      Toast.show("System", "Boss creado · " + res.boss.name);
    });
  }

  /* =========================================================
     Skills y logros
     ========================================================= */
  function unlockCard(u) {
    var card = el("div", "unlock" + (u.unlocked ? " unlock--on" : ""));
    var top = el("div", "unlock__top");
    top.appendChild(el("p", "unlock__name", u.name));
    top.appendChild(el("p", "unlock__state", u.unlocked ? "DESBLOQUEADA" : "BLOQUEADA"));
    card.appendChild(top);
    card.appendChild(el("p", "unlock__desc", u.desc));

    if (u.unlocked) {
      card.appendChild(
        el(
          "p",
          "unlock__meta",
          (u.unlockedAt ? dayLabel(u.unlockedAt) + " · " : "") + (u.xp ? signed(u.xp) + " XP" : "")
        )
      );
    } else {
      var bar = el("div", "bar bar--thin");
      var fill = el("i", "bar__fill");
      fill.style.width = Math.round(u.progress * 100) + "%";
      bar.appendChild(fill);
      card.appendChild(bar);
      card.appendChild(el("p", "unlock__meta", Math.round(u.progress * 100) + "% del requisito"));
    }
    return card;
  }

  function renderUnlocks() {
    var c = P.counts();
    var skills = $("[data-skills]");
    var achs = $("[data-achievements]");
    skills.textContent = "";
    achs.textContent = "";

    P.list("skill").forEach(function (u) {
      skills.appendChild(unlockCard(u));
    });
    P.list("achievement").forEach(function (u) {
      achs.appendChild(unlockCard(u));
    });

    $("[data-skills-count]").textContent = c.skills.unlocked + "/" + c.skills.total;
    $("[data-ach-count]").textContent = c.achievements.unlocked + "/" + c.achievements.total;
  }

  /* =========================================================
     Menú de secciones
     ========================================================= */
  var SECTIONS = [
    { view: "bosses", name: "Bosses", desc: "Problemas grandes divididos en tareas" },
    { view: "unlocks", name: "Skills y logros", desc: "Desbloqueos por progresión" },
    { view: "history", name: "Historial", desc: "Todas las acciones registradas" }
  ];

  function renderMenu() {
    var host = $("[data-menu]");
    host.textContent = "";
    SECTIONS.forEach(function (sec) {
      var b = el("button", "menu__item");
      b.type = "button";
      var left = el("div");
      left.appendChild(el("p", "menu__name", sec.name));
      left.appendChild(el("p", "menu__desc", sec.desc));
      b.appendChild(left);
      b.appendChild(el("span", "menu__go", "→"));
      b.addEventListener("click", function () {
        go(sec.view);
      });
      host.appendChild(b);
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
      emptyState(host, "Sin actividad registrada", "+ Registrar acción", function () {
        go("log");
      });
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
    else if (current === "quests") renderQuests();
    else if (current === "bosses") renderBosses();
    else if (current === "unlocks") renderUnlocks();
    else if (current === "more") renderMenu();
    else if (current === "log") {
      renderCats();
      renderActs();
      renderExtra();
      renderPreview();
    } else if (current === "history") renderHistory();
  }

  function init() {
    Q.rollover();
    renderFilter();
    initQuestForm();
    initBossForm();
    P.check();

    $$("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        go(b.getAttribute("data-go"));
      });
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
