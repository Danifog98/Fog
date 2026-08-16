/* =========================================================
   DANI SYSTEM — configuración central
   ÚNICO sitio donde se tocan pesos, XP, niveles y ranks.
   Nada de esto debe repetirse en otros archivos.
   ========================================================= */

(function (global) {
  "use strict";

  /* ---------- Categorías y pesos (suman 1.00) ---------- */
  var CATEGORIES = [
    { id: "physical",   stat: "FÍSICO",             weight: 0.15, hue: 8   },
    { id: "combat",     stat: "COMBATE",            weight: 0.10, hue: 350 },
    { id: "tech",       stat: "TECNOLOGÍA",         weight: 0.15, hue: 190 },
    { id: "knowledge",  stat: "CONOCIMIENTO",       weight: 0.10, hue: 215 },
    { id: "wealth",     stat: "DINERO",             weight: 0.15, hue: 145 },
    { id: "trading",    stat: "TRADING",            weight: 0.10, hue: 165 },
    { id: "business",   stat: "NEGOCIOS",           weight: 0.15, hue: 45  },
    { id: "discipline", stat: "DISCIPLINA",         weight: 0.05, hue: 265 },
    { id: "problems",   stat: "PROBLEMAS RESUELTOS", weight: 0.05, hue: 30 }
  ];

  /* ---------- Acciones y XP ----------
     Cada acción: id, etiqueta, xp. `xp` negativo penaliza.
     `input` pide un dato extra (min = minutos, amount = importe).
     `scaled` usa la tabla DIFFICULTY_XP en vez de un valor fijo.        */
  var ACTIONS = {
    physical: [
      { id: "workout",     label: "Entrenamiento",        xp: 100 },
      { id: "pr",          label: "PR / récord personal", xp: 200 },
      { id: "cardio",      label: "Cardio",               xp: 50  },
      { id: "week_streak", label: "Semana completa",      xp: 500 }
    ],
    combat: [
      { id: "training",  label: "Entrenamiento",  xp: 100 },
      { id: "technique", label: "Técnica nueva",  xp: 150 },
      { id: "sparring",  label: "Sparring",       xp: 200 }
    ],
    tech: [
      { id: "study",        label: "Estudio 30 min",     xp: 50,   input: "min" },
      { id: "lesson",       label: "Lección completada", xp: 100 },
      { id: "problem",      label: "Problema resuelto",  xp: 200 },
      { id: "project_new",  label: "Proyecto funcional", xp: 500 },
      { id: "project_done", label: "Proyecto terminado", xp: 1000 }
    ],
    knowledge: [
      { id: "study",   label: "Estudio 30 min",   xp: 50, input: "min" },
      { id: "chapter", label: "Capítulo",         xp: 100 },
      { id: "book",    label: "Libro terminado",  xp: 500 },
      { id: "course",  label: "Curso terminado",  xp: 1000 },
      { id: "applied", label: "Aplicado en real", xp: 300 }
    ],
    wealth: [
      { id: "saved",       label: "Ahorro registrado",   xp: 100, input: "amount" },
      { id: "income",      label: "Ingreso registrado",  xp: 100, input: "amount" },
      { id: "expense_cut", label: "Gasto recortado",     xp: 100 },
      { id: "invested",    label: "Inversión periódica", xp: 150, input: "amount" },
      { id: "milestone",   label: "Milestone financiero", xp: 1000 }
    ],
    trading: [
      { id: "study",         label: "Estudio",              xp: 50, input: "min" },
      { id: "backtest",      label: "Backtesting",          xp: 100 },
      { id: "journal",       label: "Journal de operación", xp: 50 },
      { id: "rules_ok",      label: "Reglas respetadas",    xp: 150 },
      { id: "review",        label: "Revisión de errores",  xp: 100 },
      { id: "rules_broken",  label: "Reglas incumplidas",   xp: -150 }
    ],
    business: [
      { id: "idea",          label: "Idea desarrollada",   xp: 50   },
      { id: "design",        label: "Diseño terminado",    xp: 100  },
      { id: "content",       label: "Contenido publicado", xp: 100  },
      { id: "product",       label: "Producto terminado",  xp: 500  },
      { id: "website",       label: "Web funcional",       xp: 500  },
      { id: "first_client",  label: "Primer cliente",      xp: 1000 },
      { id: "rev_1k",        label: "1.000 € en ventas",   xp: 2000 },
      { id: "rev_10k",       label: "10.000 € en ventas",  xp: 5000 },
      { id: "drop_soldout",  label: "Drop agotado",        xp: 5000 }
    ],
    discipline: [
      { id: "daily",   label: "Misión diaria",     xp: 100 },
      { id: "weekly",  label: "Misión semanal",    xp: 500 },
      { id: "avoided", label: "Tarea que evitaba", xp: 200 }
    ],
    problems: [
      { id: "solved", label: "Problema resuelto", scaled: true }
    ]
  };

  /* ---------- Dificultad ---------- */
  var DIFFICULTIES = ["EASY", "NORMAL", "HARD", "EPIC", "LEGENDARY"];

  var DIFFICULTY_XP = {
    EASY: 100,
    NORMAL: 200,
    HARD: 400,
    EPIC: 800,
    LEGENDARY: 1500
  };

  /* Multiplicador de XP de un Boss según dificultad (fase 3). */
  var BOSS_MULTIPLIER = { EASY: 3, NORMAL: 5, HARD: 8, EPIC: 12, LEGENDARY: 20 };

  /* ---------- Niveles ----------
     Umbrales manuales hasta 10; después, fórmula escalable:
     el salto crece un GROWTH% por nivel.                            */
  var LEVELS = [0, 1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000];

  var LEVEL_FORMULA = {
    lastStep: 10000, // salto entre nivel 9 y 10
    growth: 1.15,
    max: 200
  };

  /* ---------- Ranks (sobre TOTAL POWER) ---------- */
  var RANKS = [
    { id: "F",         min: 0    },
    { id: "E",         min: 400  },
    { id: "D",         min: 900  },
    { id: "C",         min: 1600 },
    { id: "B",         min: 2600 },
    { id: "A",         min: 4000 },
    { id: "S",         min: 5800 },
    { id: "SS",        min: 7200 },
    { id: "SSS",       min: 8600 },
    { id: "LEGENDARY", min: 9500 }
  ];

  /* ---------- Stats ----------
     mastery% de un stat = XP de su categoría / MASTERY_XP.
     STAT_CURVE define el nivel del stat.                            */
  var STATS = {
    masteryXP: 50000,   // XP de una categoría que equivale al 100 %
    curveBase: 500,     // XP del nivel 2 del stat
    curveGrowth: 1.35,
    inactiveDays: 5     // días sin actividad = categoría abandonada
  };

  /* ---------- Total Power ---------- */
  var POWER = {
    masteryScale: 100, // Σ(peso · mastery%) · 100  → 0..10000
    perLevel: 25       // bonus por nivel
  };

  var LIMITS = {
    dailyQuests: 5,
    recommendations: 3
  };

  /* ---------- Quests ---------- */
  var QUESTS = {
    weeklyMultiplier: 2.5, // XP por defecto de una weekly = dificultad · esto
    /* Bonus de DISCIPLINA al cumplir una misión (spec: diaria 100 / semanal 500).
       No se suma si la propia quest ya es de disciplina. */
    disciplineBonus: { daily: 100, weekly: 500 }
  };

  /* ---------- Streaks ----------
     grace: días que se pueden fallar sin romper la racha.
     La racha motiva; no castiga un día de descanso.                   */
  var STREAKS = {
    grace: 1,
    tracked: [
      { id: "daily",     label: "RACHA DIARIA", categories: null },
      { id: "physical",  label: "GYM",          categories: ["physical", "combat"] },
      { id: "tech",      label: "TECNOLOGÍA",   categories: ["tech"] },
      { id: "knowledge", label: "ESTUDIO",      categories: ["knowledge"] },
      { id: "business",  label: "NEGOCIOS",     categories: ["business"] }
    ]
  };

  /* ---------- Helpers de configuración ---------- */
  function category(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function categoryName(id) {
    var c = category(id);
    return c ? c.stat : String(id || "").toUpperCase();
  }

  function action(categoryId, actionId) {
    var list = ACTIONS[categoryId] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === actionId) return list[i];
    }
    return null;
  }

  /* XP de una acción, ya resuelta con su dificultad o su input. */
  function actionXP(categoryId, actionId, opts) {
    var def = action(categoryId, actionId);
    if (!def) return 0;
    opts = opts || {};

    if (def.scaled) {
      return DIFFICULTY_XP[opts.difficulty || "NORMAL"] || DIFFICULTY_XP.NORMAL;
    }
    /* Las acciones por minutos escalan en bloques de 30. */
    if (def.input === "min" && opts.minutes) {
      var blocks = Math.max(1, Math.round(Number(opts.minutes) / 30));
      return def.xp * blocks;
    }
    return def.xp;
  }

  global.DS = global.DS || {};
  global.DS.config = {
    CATEGORIES: CATEGORIES,
    ACTIONS: ACTIONS,
    DIFFICULTIES: DIFFICULTIES,
    DIFFICULTY_XP: DIFFICULTY_XP,
    BOSS_MULTIPLIER: BOSS_MULTIPLIER,
    LEVELS: LEVELS,
    LEVEL_FORMULA: LEVEL_FORMULA,
    RANKS: RANKS,
    STATS: STATS,
    POWER: POWER,
    LIMITS: LIMITS,
    QUESTS: QUESTS,
    STREAKS: STREAKS,
    category: category,
    categoryName: categoryName,
    action: action,
    actionXP: actionXP
  };
})(window);
