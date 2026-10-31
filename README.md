# Corner Building — recorrido con scroll

Landing page de un edificio de usos mixtos. Arranca como una planta impresa (tinta sobre papel); al hacer scroll las paredes suben desde el dibujo, la cámara baja a la calle y recorre los espacios a la altura de los ojos. Cada ambiente sigue siendo dibujo hasta que la cámara llega, y ahí aparecen los materiales.

La planta no es una imagen: es el mismo modelo 3D cortado a +1.20 m y visto desde arriba con un lente muy largo.

**Stack:** Next.js 16 (App Router) · three.js · GSAP ScrollTrigger · Lenis.

```bash
npm install
npm run dev                   # http://localhost:3000
npm run build && npm start    # producción
```

## Recorrido

1. Planta baja como lámina → suben las paredes → bajada a North Street → **01 Lobby**
2. Esquina y terraza del café → **02 Cafetería** → **03 Tienda de ropa**
3. Vuelta al dibujo: planta del piso 1 → **04 Studio 1.02** (33 m²)
4. Escalera al piso 2 → **05 Residencia 2.01** (97 m², los tres monoambientes oeste unidos)
5. Salida por la ventana-balcón y subida por la fachada → **06 Terraza** (jacuzzi, living con brasero, cocina exterior)

## Estructura

| Archivo | Contenido |
|---|---|
| `app/` | layout, página y estilos |
| `components/Walkthrough.jsx` | componente cliente: canvas + capa HTML (rótulos, textos, barra de progreso) |
| `lib/scene/experience.js` | renderer, luces, cámara y timeline del scroll |
| `lib/scene/building.js` | envolvente, losas, fachadas, lobby, sitio |
| `lib/scene/shops.js` | cafetería, tienda de ropa, local 03, terraza del café |
| `lib/scene/studio.js` | piso 1: studio 1.02, palier, escalera |
| `lib/scene/residence.js` | piso 2: residencia |
| `lib/scene/roof.js` | terraza del techo |
| `lib/scene/props.js` | muebles y objetos procedurales |
| `lib/scene/materials.js` | materiales PBR y el shader de barrido dibujo → material |
| `lib/scene/textures.js` | texturas procedurales (placeholders de mapas CC0) |
| `lib/scene/annotations.js` | capa de dibujo técnico (rótulos, cotas, norte) |
| `lib/scene/scale.js` | escala de planta (`S = 1.3`) |

Medidas en metros, aproximadas, tomadas de los renders. `/?record` desactiva el scroll y expone `window.__setU(u)` para grabar cuadro por cuadro.

HDRI: *Venice Sunset* de Poly Haven (CC0).
