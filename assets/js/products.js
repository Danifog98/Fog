/* =========================================================
   FOG SOCIETY WEAR — catálogo
   Códigos, siluetas y colorways tomados de la ficha técnica.
   PRECIOS: provisionales, pendientes de fijar. Se editan aquí
   y se propagan a toda la web.
   ========================================================= */

(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "todo", label: "Todo" },
    { id: "combos", label: "Combos" },
    { id: "compresion", label: "Compresión" },
    { id: "shorts", label: "Shorts" },
    { id: "mujer", label: "Mujer" },
    { id: "lifestyle", label: "Lifestyle" }
  ];

  var SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

  /* Colorways oficiales de la colección. */
  var COLORWAYS = [
    { id: "olive", name: "Olive / Black", hex: "#4b4f36", accent: "#1a1a1a" },
    { id: "black", name: "Black Tonal", hex: "#141414", accent: "#4d4d4d" },
    { id: "maroon", name: "Maroon / Black", hex: "#5c1f24", accent: "#141414" },
    { id: "navy", name: "Navy / Black", hex: "#1b2a4a", accent: "#26262c" },
    { id: "beige", name: "Beige / Cream", hex: "#d9d0bd", accent: "#c7bda6" },
    { id: "white", name: "White", hex: "#f2f0ec", accent: "#dedad2" }
  ];

  var WOMEN_COLORWAYS = [
    { id: "bone", name: "Bone", hex: "#e4dccc" },
    { id: "olive", name: "Olive", hex: "#4b4f36" },
    { id: "navy", name: "Navy", hex: "#1b2a4a" },
    { id: "burgundy", name: "Burgundy", hex: "#5c1f24" },
    { id: "white", name: "White", hex: "#f2f0ec" },
    { id: "charcoal", name: "Charcoal", hex: "#26262c" }
  ];

  var COMPRESSION_SPECS = [
    "Fit second skin, manga ranglán y cuello redondo",
    "Paneles de mesh transpirable en axila y costado",
    "Elasticidad en cuatro direcciones",
    "Logo FG rubberizado en pecho y gráfico tonal en espalda"
  ];

  var SHORT_SPECS = [
    "Fit performance con cintura elástica y cordón",
    "Punto doble técnico cepillado",
    "Bolsillo trasero con cremallera",
    "Marca FG tonal en el costado"
  ];

  var WOMEN_SPECS = [
    "Sujetador de sujeción media con espalda en Y",
    "Leggings de talle alto y corte flare",
    "Costuras ergonómicas y logo FG en relieve",
    "Tejido opaco en sentadilla"
  ];

  var PRODUCTS = [];

  /* --- Combos de performance (compresión + short) --- */
  COLORWAYS.forEach(function (c, i) {
    PRODUCTS.push({
      id: "combo-" + c.id,
      code: c.id === "black" ? "FG-CB-04" : "FG-CB-02",
      name: c.id === "black" ? "Combo 04 Tonal" : "Combo 02 Performance",
      category: "combos",
      price: 129,
      colorway: c.name,
      hex: c.hex,
      image: "assets/img/men-" + c.id + ".jpg",
      hover: "assets/img/flat-" + c.id + ".jpg",
      sizes: SIZES,
      tag: i === 0 ? "Destacado" : c.id === "black" ? "Nuevo" : "",
      description:
        "Conjunto completo: parte superior de compresión de manga larga y short de entrenamiento, construidos sobre la misma plataforma técnica.",
      specs: COMPRESSION_SPECS.concat(["Incluye short a juego FG-SH-01"])
    });
  });

  /* --- Compresión suelta --- */
  ["olive", "navy", "maroon", "black"].forEach(function (id) {
    var c = find(COLORWAYS, id);
    PRODUCTS.push({
      id: "ct-" + id,
      code: id === "black" ? "FG-CT-03" : id === "olive" ? "FG-CT-01" : "FG-CT-02",
      name: "Compresión Manga Larga",
      category: "compresion",
      price: 79,
      colorway: c.name,
      hex: c.hex,
      image: "assets/img/flat-" + id + ".jpg",
      hover: "assets/img/men-" + id + ".jpg",
      sizes: SIZES,
      description:
        "Segunda piel técnica. Sostiene el músculo sin restar movilidad y evacua la humedad en entrenamientos largos.",
      specs: COMPRESSION_SPECS
    });
  });

  /* --- Shorts --- */
  ["olive", "black", "navy"].forEach(function (id) {
    var c = find(COLORWAYS, id);
    PRODUCTS.push({
      id: "sh-" + id,
      code: "FG-SH-01",
      name: "Short Performance",
      category: "shorts",
      price: 59,
      colorway: c.name,
      hex: c.hex,
      image: "assets/img/short-" + id + ".jpg",
      hover: "assets/img/men-" + id + ".jpg",
      sizes: SIZES,
      description:
        "Short de entrenamiento de fit relajado, pensado para pierna pesada y movimiento libre.",
      specs: SHORT_SPECS
    });
  });

  /* --- Mujer: conjunto completo --- */
  WOMEN_COLORWAYS.forEach(function (c, i) {
    PRODUCTS.push({
      id: "set-" + c.id,
      code: "FG-WS-01",
      name: "Conjunto Flare",
      category: "mujer",
      price: 119,
      colorway: c.name,
      hex: c.hex,
      image: "assets/img/women-" + c.id + ".jpg",
      hover: "assets/img/bra-" + c.id + ".jpg",
      sizes: ["XS", "S", "M", "L", "XL"],
      tag: i === 0 ? "Icono" : "",
      description:
        "Sujetador deportivo y leggings flare de talle alto. Silueta larga, tejido opaco y acabados en relieve tono sobre tono.",
      specs: WOMEN_SPECS
    });
  });

  /* --- Mujer: piezas sueltas --- */
  PRODUCTS.push({
    id: "bra-bone",
    code: "FG-WB-01",
    name: "Sujetador Deportivo",
    category: "mujer",
    price: 49,
    colorway: "Bone",
    hex: "#e4dccc",
    image: "assets/img/bra-bone.jpg",
    hover: "assets/img/flat-bra.jpg",
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "Sujeción media con espalda en Y y cierre metálico. Sin costuras que marquen bajo la ropa.",
    specs: [
      "Sujeción media, ideal para fuerza y movilidad",
      "Espalda en Y con ajuste metálico",
      "Logo FG en relieve tono sobre tono",
      "Copa extraíble"
    ]
  });

  /* --- Lifestyle (Combo 01) --- */
  PRODUCTS.push(
    {
      id: "hoodie-black",
      code: "FG-HD-01",
      name: "Hoodie Zip-Up",
      category: "lifestyle",
      price: 139,
      colorway: "Washed Black",
      hex: "#141414",
      image: "assets/img/flat-hoodie.jpg",
      hover: "assets/img/combo01-men.jpg",
      sizes: SIZES,
      tag: "Combo 01",
      description:
        "Sudadera con cremallera en algodón pesado con lavado enzimático y gráfico FG rasgado en la espalda.",
      specs: [
        "Algodón pesado con lavado enzimático",
        "Cremallera completa con tirador grabado",
        "Gráfico FG rasgado tono sobre tono",
        "Corte oversize"
      ]
    },
    {
      id: "pant-black",
      code: "FG-PT-01",
      name: "Pantalón Wide Fit",
      category: "lifestyle",
      price: 109,
      colorway: "Washed Black",
      hex: "#141414",
      image: "assets/img/flat-pant.jpg",
      hover: "assets/img/combo01-men.jpg",
      sizes: SIZES,
      description:
        "Pantalón de felpa de pierna ancha, a juego con el hoodie. Cintura con cordón y caída recta.",
      specs: [
        "Felpa pesada a juego con el hoodie",
        "Pierna ancha con caída recta",
        "Cintura elástica con cordón",
        "Gráfico FG en el lateral"
      ]
    }
  );

  function find(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function labelFor(categoryId) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === categoryId) return CATEGORIES[i].label;
    }
    return categoryId;
  }

  function formatPrice(value) {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (err) {
      return value + " €";
    }
  }

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  global.FogCatalog = {
    categories: CATEGORIES,
    colorways: COLORWAYS,
    womenColorways: WOMEN_COLORWAYS,
    products: PRODUCTS,
    byId: byId,
    labelFor: labelFor,
    formatPrice: formatPrice,
    escape: esc
  };
})(window);
