/* =========================================================
   FOG — comportamiento común
   Motor de scroll (parallax, revelados, secuencia sticky),
   carrito, ficha rápida, navegación y formularios.
   ========================================================= */

(function () {
  "use strict";

  var Catalog = window.FogCatalog;
  var CART_KEY = "fog:cart";

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  /* =========================================================
     Motor de scroll
     Un único bucle rAF que reparte el trabajo entre efectos.
     ========================================================= */
  var Motion = {
    parallax: [],
    drifts: [],
    hero: null,
    sequences: [],
    vh: window.innerHeight,
    ticking: false,

    init: function () {
      Motion.collect();
      Motion.bindReveal();

      if (reduced) {
        Motion.frame();
        return;
      }

      window.addEventListener("scroll", Motion.request, { passive: true });
      window.addEventListener(
        "resize",
        function () {
          Motion.vh = window.innerHeight;
          Motion.collect();
          Motion.request();
        },
        { passive: true }
      );
      Motion.frame();
    },

    collect: function () {
      Motion.parallax = $$("[data-parallax]").map(function (el) {
        return { el: el, f: parseFloat(el.getAttribute("data-parallax")) || 0.1 };
      });
      Motion.drifts = $$("[data-drift]").map(function (el) {
        return {
          el: el,
          host: el.closest("[data-drift-host]") || el.parentElement,
          f: parseFloat(el.getAttribute("data-drift")) || 1
        };
      });
      Motion.hero = $("[data-hero-media]");
      Motion.sequences = $$("[data-sequence]").map(function (el) {
        return {
          el: el,
          shots: $$("[data-shot]", el),
          bars: $$("[data-bar] i", el),
          bg: $("[data-seq-bg]", el),
          word: $("[data-seq-word]", el),
          index: $("[data-seq-index]", el),
          name: $("[data-seq-name]", el),
          hex: $("[data-seq-hex]", el),
          swatch: $("[data-seq-swatch]", el),
          current: -1
        };
      });
    },

    request: function () {
      if (Motion.ticking) return;
      Motion.ticking = true;
      requestAnimationFrame(Motion.frame);
    },

    frame: function () {
      Motion.ticking = false;
      var vh = Motion.vh;
      var y = window.scrollY || window.pageYOffset;

      if (!reduced) {
        // Parallax vertical de imágenes dentro de su contenedor.
        Motion.parallax.forEach(function (item) {
          var r = item.el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var center = r.top + r.height / 2 - vh / 2;
          item.el.style.transform =
            "translate3d(0," + (-center * item.f).toFixed(2) + "px,0)";
        });

        // Desplazamiento horizontal de las tiras.
        Motion.drifts.forEach(function (item) {
          var host = item.host;
          if (!host) return;
          var r = host.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
          var travel = Math.max(0, item.el.scrollWidth - host.clientWidth);
          item.el.style.transform =
            "translate3d(" + (-p * travel * item.f).toFixed(2) + "px,0,0)";
        });

        // Hero: la imagen se aleja y el contenido se desvanece.
        if (Motion.hero) {
          var hp = clamp(y / vh, 0, 1.4);
          Motion.hero.style.transform =
            "translate3d(0," + (y * 0.28).toFixed(2) + "px,0) scale(" +
            (1 + hp * 0.12).toFixed(4) +
            ")";
          var inner = $("[data-hero-inner]");
          if (inner) {
            inner.style.opacity = String(clamp(1 - hp * 1.5, 0, 1));
            inner.style.transform =
              "translate3d(0," + (hp * -60).toFixed(1) + "px,0)";
          }
        }
      }

      // Secuencia de colorways anclada.
      Motion.sequences.forEach(Motion.updateSequence);
    },

    updateSequence: function (seq) {
      var n = seq.shots.length;
      if (!n) return;
      var r = seq.el.getBoundingClientRect();
      var total = seq.el.offsetHeight - Motion.vh;
      if (total <= 0) return;
      var p = clamp(-r.top / total, 0, 0.9999);
      var idx = Math.floor(p * n);
      if (idx === seq.current) return;
      seq.current = idx;

      seq.shots.forEach(function (shot, i) {
        shot.classList.toggle("is-active", i === idx);
      });
      seq.bars.forEach(function (bar, i) {
        bar.classList.toggle("is-on", i === idx);
      });

      var shot = seq.shots[idx];
      var name = shot.getAttribute("data-name");
      var hex = shot.getAttribute("data-hex");
      var word = shot.getAttribute("data-word") || name;

      if (seq.bg) {
        seq.bg.style.background =
          "radial-gradient(70% 60% at 50% 45%, " +
          hexToRgba(hex, 0.32) +
          ", rgba(8,8,10,0.98) 72%)";
      }
      if (seq.word) seq.word.textContent = word;
      if (seq.name) seq.name.textContent = name;
      if (seq.hex) seq.hex.textContent = hex;
      if (seq.index) seq.index.textContent = "0" + (idx + 1);
      if (seq.swatch) seq.swatch.style.background = hex;
    },

    bindReveal: function () {
      var items = $$("[data-reveal]");
      if (!("IntersectionObserver" in window) || reduced) {
        items.forEach(function (el) {
          el.classList.add("is-in");
        });
        return;
      }
      Motion.io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            Motion.io.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.06 }
      );
      items.forEach(function (el) {
        Motion.io.observe(el);
      });
    },

    observe: function (root) {
      if (!Motion.io) {
        $$("[data-reveal]", root).forEach(function (el) {
          el.classList.add("is-in");
        });
        return;
      }
      $$("[data-reveal]", root).forEach(function (el) {
        if (!el.classList.contains("is-in")) Motion.io.observe(el);
      });
    }
  };

  function hexToRgba(hex, alpha) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var num = parseInt(h, 16);
    if (isNaN(num)) return "rgba(120,120,120," + alpha + ")";
    return (
      "rgba(" +
      ((num >> 16) & 255) +
      "," +
      ((num >> 8) & 255) +
      "," +
      (num & 255) +
      "," +
      alpha +
      ")"
    );
  }

  /* =========================================================
     Avisos flotantes
     ========================================================= */
  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    void toastEl.offsetWidth;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2800);
  }

  /* ---------- Bloqueo de scroll compartido ---------- */
  var lockCount = 0;
  function lockScroll() {
    lockCount++;
    document.body.classList.add("is-locked");
  }
  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (!lockCount) document.body.classList.remove("is-locked");
  }

  /* =========================================================
     Carrito
     ========================================================= */
  var Cart = {
    items: [],

    load: function () {
      try {
        var parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        Cart.items = Array.isArray(parsed)
          ? parsed.filter(function (l) {
              return l && Catalog.byId(l.id) && l.qty > 0;
            })
          : [];
      } catch (err) {
        Cart.items = [];
      }
    },

    save: function () {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(Cart.items));
      } catch (err) {
        /* navegación privada: el carrito vive solo en memoria */
      }
    },

    add: function (id, size, qty) {
      var product = Catalog.byId(id);
      if (!product) return;
      size = size || product.sizes[0];
      qty = qty || 1;
      var line = null;
      for (var i = 0; i < Cart.items.length; i++) {
        if (Cart.items[i].id === id && Cart.items[i].size === size) {
          line = Cart.items[i];
        }
      }
      if (line) line.qty = Math.min(99, line.qty + qty);
      else Cart.items.push({ id: id, size: size, qty: qty });
      Cart.save();
      Cart.render();
    },

    setQty: function (i, qty) {
      if (!Cart.items[i]) return;
      if (qty <= 0) Cart.items.splice(i, 1);
      else Cart.items[i].qty = Math.min(99, qty);
      Cart.save();
      Cart.render();
    },

    remove: function (i) {
      Cart.items.splice(i, 1);
      Cart.save();
      Cart.render();
    },

    count: function () {
      return Cart.items.reduce(function (s, l) {
        return s + l.qty;
      }, 0);
    },

    subtotal: function () {
      return Cart.items.reduce(function (s, l) {
        var p = Catalog.byId(l.id);
        return s + (p ? p.price * l.qty : 0);
      }, 0);
    },

    render: function () {
      var count = Cart.count();
      $$("[data-cart-count]").forEach(function (el) {
        el.textContent = count;
        el.classList.toggle("is-visible", count > 0);
      });

      var body = $("[data-cart-body]");
      var foot = $("[data-cart-foot]");
      if (!body) return;

      if (!Cart.items.length) {
        body.innerHTML =
          '<p class="dim" style="letter-spacing:.18em;text-transform:uppercase;font-size:var(--step--1)">Carrito vacío</p>' +
          '<a class="arrow-link" href="tienda.html">Ver la colección</a>';
        if (foot) foot.hidden = true;
        return;
      }
      if (foot) foot.hidden = false;

      body.innerHTML = Cart.items
        .map(function (line, i) {
          var p = Catalog.byId(line.id);
          return (
            '<article class="cart-line">' +
            '<div class="cart-line__media"><img src="' +
            p.image +
            '" alt="" loading="lazy"></div>' +
            "<div>" +
            '<div class="cart-line__row">' +
            "<div>" +
            '<p class="cart-line__name">' +
            Catalog.escape(p.name) +
            "</p>" +
            '<p class="cart-line__meta">' +
            Catalog.escape(p.colorway) +
            " · Talla " +
            Catalog.escape(line.size) +
            "</p>" +
            "</div>" +
            '<p class="cart-line__price">' +
            Catalog.formatPrice(p.price * line.qty) +
            "</p>" +
            "</div>" +
            '<div class="cart-line__row">' +
            '<div class="qty">' +
            '<button type="button" data-cart-dec="' +
            i +
            '" aria-label="Quitar una unidad">−</button><span>' +
            line.qty +
            '</span><button type="button" data-cart-inc="' +
            i +
            '" aria-label="Añadir una unidad">+</button>' +
            "</div>" +
            '<button type="button" class="link-remove" data-cart-remove="' +
            i +
            '">Eliminar</button>' +
            "</div></div></article>"
          );
        })
        .join("");

      var total = $("[data-cart-total]");
      if (total) total.textContent = Catalog.formatPrice(Cart.subtotal());
    }
  };

  /* =========================================================
     Cajón del carrito
     ========================================================= */
  var Drawer = {
    el: null,
    overlay: null,
    last: null,

    init: function () {
      Drawer.el = $("[data-drawer]");
      Drawer.overlay = $("[data-overlay]");
      if (!Drawer.el) return;

      $$("[data-cart-open]").forEach(function (b) {
        b.addEventListener("click", Drawer.open);
      });
      $$("[data-cart-close]").forEach(function (b) {
        b.addEventListener("click", Drawer.close);
      });
      if (Drawer.overlay) Drawer.overlay.addEventListener("click", Drawer.close);

      Drawer.el.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var inc = btn.getAttribute("data-cart-inc");
        var dec = btn.getAttribute("data-cart-dec");
        var del = btn.getAttribute("data-cart-remove");
        if (inc !== null) Cart.setQty(+inc, Cart.items[+inc].qty + 1);
        else if (dec !== null) Cart.setQty(+dec, Cart.items[+dec].qty - 1);
        else if (del !== null) Cart.remove(+del);
      });

      var checkout = $("[data-checkout]");
      if (checkout) {
        checkout.addEventListener("click", function () {
          toast("Pasarela de pago pendiente de conectar");
        });
      }
    },

    open: function () {
      if (!Drawer.el) return;
      Drawer.last = document.activeElement;
      Drawer.el.classList.add("is-open");
      Drawer.el.setAttribute("aria-hidden", "false");
      if (Drawer.overlay) Drawer.overlay.classList.add("is-open");
      lockScroll();
      var c = $("[data-cart-close]", Drawer.el);
      if (c) c.focus();
    },

    close: function () {
      if (!Drawer.el || !Drawer.el.classList.contains("is-open")) return;
      Drawer.el.classList.remove("is-open");
      Drawer.el.setAttribute("aria-hidden", "true");
      if (Drawer.overlay) Drawer.overlay.classList.remove("is-open");
      unlockScroll();
      if (Drawer.last && Drawer.last.focus) Drawer.last.focus();
    }
  };

  /* =========================================================
     Ficha rápida
     ========================================================= */
  var Modal = {
    el: null,
    current: null,
    size: null,
    last: null,

    init: function () {
      Modal.el = $("[data-modal]");
      if (!Modal.el) return;

      Modal.el.addEventListener("click", function (e) {
        if (e.target === Modal.el || e.target.closest("[data-modal-close]")) {
          Modal.close();
          return;
        }
        var sizeBtn = e.target.closest("[data-size]");
        if (sizeBtn) {
          Modal.size = sizeBtn.getAttribute("data-size");
          $$("[data-size]", Modal.el).forEach(function (b) {
            b.setAttribute("aria-pressed", b === sizeBtn ? "true" : "false");
          });
        }
        if (e.target.closest("[data-modal-add]") && Modal.current) {
          Cart.add(Modal.current.id, Modal.size, 1);
          toast(Modal.current.name + " · " + Modal.size + " añadido");
          Modal.close();
          Drawer.open();
        }
      });

      document.addEventListener("click", function (e) {
        var t = e.target.closest("[data-quick]");
        if (!t) return;
        e.preventDefault();
        Modal.open(t.getAttribute("data-quick"));
      });
    },

    open: function (id) {
      var p = Catalog.byId(id);
      if (!p || !Modal.el) return;
      Modal.current = p;
      Modal.size = p.sizes[0];
      Modal.last = document.activeElement;

      $("[data-modal-media]", Modal.el).innerHTML =
        '<img src="' + p.image + '" alt="' + Catalog.escape(p.name) + '">';
      $("[data-modal-code]", Modal.el).textContent =
        p.code + " · " + Catalog.labelFor(p.category);
      $("[data-modal-name]", Modal.el).textContent = p.name;
      $("[data-modal-color]", Modal.el).textContent = p.colorway;
      $("[data-modal-swatch]", Modal.el).style.background = p.hex;
      $("[data-modal-price]", Modal.el).textContent = Catalog.formatPrice(p.price);
      $("[data-modal-desc]", Modal.el).textContent = p.description;
      $("[data-modal-specs]", Modal.el).innerHTML = p.specs
        .map(function (s) {
          return "<li>" + Catalog.escape(s) + "</li>";
        })
        .join("");
      $("[data-modal-sizes]", Modal.el).innerHTML = p.sizes
        .map(function (s, i) {
          return (
            '<button type="button" class="size" data-size="' +
            Catalog.escape(s) +
            '" aria-pressed="' +
            (i === 0 ? "true" : "false") +
            '">' +
            Catalog.escape(s) +
            "</button>"
          );
        })
        .join("");

      Modal.el.classList.add("is-open");
      Modal.el.setAttribute("aria-hidden", "false");
      lockScroll();
      var c = $("[data-modal-close]", Modal.el);
      if (c) c.focus();
    },

    close: function () {
      if (!Modal.el || !Modal.el.classList.contains("is-open")) return;
      Modal.el.classList.remove("is-open");
      Modal.el.setAttribute("aria-hidden", "true");
      unlockScroll();
      if (Modal.last && Modal.last.focus) Modal.last.focus();
    }
  };

  /* =========================================================
     Tarjetas de producto
     ========================================================= */
  function cardHTML(p, i) {
    return (
      '<article class="card" data-reveal style="--i:' +
      (i % 4) +
      '">' +
      '<div class="card__media">' +
      '<img src="' +
      p.image +
      '" alt="' +
      Catalog.escape(p.name + " — " + p.colorway) +
      '" loading="lazy">' +
      (p.hover
        ? '<img src="' + p.hover + '" alt="" aria-hidden="true" loading="lazy">'
        : "") +
      (p.tag ? '<span class="card__tag">' + Catalog.escape(p.tag) + "</span>" : "") +
      '<div class="card__quick"><button type="button" class="btn btn--block" data-quick="' +
      p.id +
      '"><span>Ficha rápida</span></button></div>' +
      "</div>" +
      '<div class="card__info"><div>' +
      '<p class="card__code">' +
      Catalog.escape(p.code) +
      "</p>" +
      '<h3 class="card__name">' +
      Catalog.escape(p.name) +
      "</h3>" +
      '<p class="card__color"><i class="sequence__swatch" style="background:' +
      p.hex +
      '"></i>' +
      Catalog.escape(p.colorway) +
      "</p></div>" +
      '<p class="card__price">' +
      Catalog.formatPrice(p.price) +
      "</p></div></article>"
    );
  }

  function renderGrid(container, list) {
    if (!container) return;
    container.innerHTML = list.map(cardHTML).join("");
    Motion.observe(container);
  }

  /* =========================================================
     Navegación
     ========================================================= */
  var Nav = {
    init: function () {
      var header = $("[data-header]");
      var mobile = $("[data-mobile-nav]");

      if (header) {
        var lastY = 0;
        window.addEventListener(
          "scroll",
          function () {
            var y = window.scrollY;
            header.classList.toggle("is-stuck", y > 8);
            // La cabecera se retira al bajar y vuelve al subir.
            header.classList.toggle(
              "is-hidden",
              y > 400 && y > lastY && !document.body.classList.contains("is-locked")
            );
            lastY = y;
          },
          { passive: true }
        );
      }

      if (mobile) {
        var close = function () {
          if (!mobile.classList.contains("is-open")) return;
          mobile.classList.remove("is-open");
          mobile.setAttribute("aria-hidden", "true");
          unlockScroll();
        };
        $$("[data-nav-open]").forEach(function (b) {
          b.addEventListener("click", function () {
            mobile.classList.add("is-open");
            mobile.setAttribute("aria-hidden", "false");
            lockScroll();
            var c = $("[data-nav-close]", mobile);
            if (c) c.focus();
          });
        });
        $$("[data-nav-close]").forEach(function (b) {
          b.addEventListener("click", close);
        });
        $$("a", mobile).forEach(function (a) {
          a.addEventListener("click", close);
        });
        Nav.close = close;
      }

      var here = location.pathname.split("/").pop() || "index.html";
      $$(".nav a[href], .mobile-nav a[href]").forEach(function (a) {
        if (a.getAttribute("href") === here) {
          a.setAttribute("aria-current", "page");
        }
      });
    }
  };

  /* =========================================================
     Formularios (validación en cliente; sin backend conectado)
     ========================================================= */
  var Forms = {
    init: function () {
      $$("[data-form]").forEach(function (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var status = $("[data-form-status]", form);
          var invalid = Forms.validate(form);
          if (invalid) {
            if (status) {
              status.textContent = "Revisa los campos marcados.";
              status.setAttribute("data-state", "error");
            }
            invalid.focus();
            return;
          }
          if (status) {
            status.removeAttribute("data-state");
            status.textContent =
              form.getAttribute("data-success") || "Recibido. Gracias.";
          }
          toast(form.getAttribute("data-toast") || "Enviado");
          form.reset();
        });
      });
    },

    validate: function (form) {
      var first = null;
      $$("input, textarea, select", form).forEach(function (field) {
        var err = $("[data-error-for='" + field.name + "']", form);
        var ok = field.checkValidity();
        if (err) err.textContent = ok ? "" : Forms.message(field);
        if (!ok && !first) first = field;
      });
      return first;
    },

    message: function (f) {
      if (f.validity.valueMissing) return "Campo obligatorio.";
      if (f.validity.typeMismatch) return "Formato no válido.";
      if (f.validity.tooShort) return "Escribe un poco más.";
      return "Revisa este campo.";
    }
  };

  /* =========================================================
     Contenido generado de la portada
     ========================================================= */
  function buildSequence() {
    var host = $("[data-sequence]");
    if (!host) return;
    var stage = $("[data-seq-stage]", host);
    var bar = $("[data-bar]", host);
    if (!stage) return;

    stage.innerHTML = Catalog.colorways
      .map(function (c, i) {
        return (
          '<div class="sequence__shot' +
          (i === 0 ? " is-active" : "") +
          '" data-shot data-name="' +
          Catalog.escape(c.name) +
          '" data-hex="' +
          c.hex +
          '" data-word="' +
          Catalog.escape(c.name.split(" / ")[0]) +
          '">' +
          '<img class="img-fade" src="assets/img/men-' +
          c.id +
          '.jpg" alt="Combo FOG en colorway ' +
          Catalog.escape(c.name) +
          '" loading="lazy">' +
          "</div>"
        );
      })
      .join("");

    if (bar) {
      bar.innerHTML = Catalog.colorways
        .map(function (_, i) {
          return '<i class="' + (i === 0 ? "is-on" : "") + '"></i>';
        })
        .join("");
    }

    // La altura marca cuánto scroll dura la secuencia: 70svh por colorway.
    host.style.minHeight = Catalog.colorways.length * 70 + 30 + "svh";
  }

  function renderHome() {
    var featured = $("[data-featured]");
    if (featured) {
      var n = parseInt(featured.getAttribute("data-featured"), 10) || 4;
      renderGrid(
        featured,
        Catalog.products
          .filter(function (p) {
            return p.category === "combos";
          })
          .slice(0, n)
      );
    }

    var women = $("[data-women-grid]");
    if (women) {
      renderGrid(
        women,
        Catalog.products
          .filter(function (p) {
            return p.category === "mujer";
          })
          .slice(0, 6)
      );
    }
  }

  /* =========================================================
     Arranque
     ========================================================= */
  function init() {
    buildSequence();
    Nav.init();
    Cart.load();
    Drawer.init();
    Modal.init();
    Forms.init();
    renderHome();
    Cart.render();
    Motion.init();

    document.documentElement.classList.add("is-ready");
    document.body.classList.add("is-ready");

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      Modal.close();
      Drawer.close();
      if (Nav.close) Nav.close();
    });

    var year = $("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Fog = {
    cart: Cart,
    drawer: Drawer,
    modal: Modal,
    motion: Motion,
    toast: toast,
    renderGrid: renderGrid
  };
})();
