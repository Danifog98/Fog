# FOG — web

Web estática de la marca, publicada en **fogactivewear.com**: HTML, CSS y JavaScript sin dependencias, sin build y
sin conexiones externas. Se abre haciendo doble clic en `index.html` o se sube
tal cual a cualquier hosting (GitHub Pages, Netlify, Vercel, un FTP…).

## Páginas

| Archivo         | Contenido                                                              |
| --------------- | ---------------------------------------------------------------------- |
| `index.html`    | Portada: hero, secuencia de los 6 colorways, combos, mujer, detalles    |
| `tienda.html`   | Catálogo completo con filtros, orden y enlaces por categoría            |
| `marca.html`    | Historia, construcción, colorways                                       |
| `contacto.html` | Formulario, vías directas y preguntas frecuentes                        |

## Estructura

```
assets/
  css/styles.css     Todos los estilos (tema oscuro, tokens en :root)
  js/products.js     Catálogo: productos, precios, colorways y textos
  js/site.js         Motor de scroll, carrito, ficha rápida, menú, formularios
  js/shop.js         Filtros y orden de la tienda
  img/               Fotos y logos recortados de las fichas técnicas
  fonts/             Anton e Inter en woff2 (autoalojadas, 67 KB)
```

## Cómo editar lo habitual

**Precios, nombres, tallas y descripciones** → `assets/js/products.js`. Todo el
catálogo vive ahí y se propaga solo a la portada, la tienda, la ficha rápida y
el carrito.

> Los precios actuales (129 € el combo, 79 € la compresión, 119 € el conjunto de
> mujer…) son **provisionales**: se pusieron para que la tienda funcione. Cámbialos
> antes de publicar.

**Colores y tipografías** → bloque `:root` al principio de `assets/css/styles.css`.
Los titulares usan Anton y el resto Inter; ambas están en `assets/fonts/` y se
cargan desde el propio dominio, sin llamadas a Google Fonts.

**Fotos** → `assets/img/`. Sustituye un archivo por otro con el mismo nombre y
la web lo coge sin tocar código. Nomenclatura:

- `men-<color>.jpg` — pareja de modelos por colorway
- `flat-<color>.jpg` / `short-<color>.jpg` — prenda sola
- `tex-<color>.jpg` — macro de tejido y logo
- `women-<color>.jpg` / `bra-<color>.jpg` — línea de mujer
- `logo-wordmark.png`, `logo-icon.png` — logotipo y símbolo FG, con fondo transparente

**Cabecera, pie, carrito y ficha rápida** están repetidos en los cuatro HTML: si
cambias un enlace del menú, cámbialo en los cuatro archivos.

## Dominio y publicación

El archivo `CNAME` de la raíz fija el dominio (`fogactivewear.com`) y el flujo
`.github/workflows/pages.yml` publica el repositorio en GitHub Pages con cada
cambio en `main`. En el proveedor del dominio tienen que existir estos registros:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | danifog98.github.io |

Si algún día cambia el dominio, hay que tocar tres sitios: `CNAME`, la constante
`SITE` de las URL canónicas en las cuatro páginas y el correo de contacto.

## Lo que falta para vender de verdad

1. **Pasarela de pago.** El carrito guarda el pedido en el navegador
   (`localStorage`) y calcula el subtotal, pero el botón «Finalizar compra» solo
   avisa de que no hay pasarela conectada. Hay que enchufar Stripe, Shopify o
   similar en `data-checkout` (`assets/js/site.js`).
2. **Formularios.** Los de contacto y boletín validan en el navegador y muestran
   confirmación, pero no envían nada. Necesitan un endpoint (Formspree, Resend,
   un backend propio…) en el `submit` de `Forms` (`assets/js/site.js`).
3. **Datos reales**: correo, teléfono, dirección, redes y textos legales (aviso
   legal, privacidad, cookies) están como marcador de posición.

## Origen del contenido

Los textos de producto y los colorways salen de la ficha técnica de la colección
(Combo 01–04, códigos FG-CT-01/02/03, FG-SH-01, seis colorways con sus hex).
Como esa ficha es un documento confidencial de proveedor, en la web solo se
publica información de cara al cliente: nada de composiciones, gramajes,
Pantones ni notas de fábrica.

## Accesibilidad y rendimiento

- Navegación por teclado, foco visible y `Esc` para cerrar carrito, menú y ficha.
- Se respeta `prefers-reduced-motion`: con esa preferencia activada se desactivan
  parallax, secuencia animada y revelados.
- Sin fuentes ni scripts externos; imágenes en carga diferida. Todos los recursos
  pesan unos 2 MB en total.
