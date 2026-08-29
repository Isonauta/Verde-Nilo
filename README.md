# Verde Nilo

Sitio de Verde Nilo (Talcahuano, Chile) — bolsos TouBag hechos con telas reutilizadas.

## Roadmap: de landing a tienda con admin

Estado actual: `index.html` es una landing estática (sin catálogo, sin carrito) que deriva
toda venta a WhatsApp. El plan es convertirla en una tienda real que Isabel pueda
administrar sola, con pagos por Mercado Pago.

- [x] **Fase 1 — Base de datos** (`supabase/migrations/`): catálogo de productos con fotos,
  precio, stock/estado y etiquetas de menú (`temporada`, `ofertas`, `nuevos_ingresos`),
  más el bucket de almacenamiento para las fotos.
- [x] **Fase 2 — Panel admin** (`admin/`): login de Isabel + formulario para crear,
  editar y borrar productos, subir/quitar fotos, tildar menús y marcar "vendido".
- [x] **Fase 3 — Tienda dinámica** (`assets/store.js`): la página pública (`index.html`)
  ya no tiene productos fijos: lee el catálogo desde Supabase (solo productos
  `disponible`, por RLS), con filtros por menú (Temporada / Ofertas / Nuevos ingresos)
  y botón "Reservar" que arma el mensaje de WhatsApp con el nombre y precio del producto.
- [ ] **Fase 4 — Mercado Pago**: botón de compra por producto, función serverless que
  genera la preferencia de pago y webhook que avisa a Isabel cuando se confirma un pago
  (ella marca el producto como vendido manualmente en el panel).
- [ ] **Fase 5 — Pulido**: reemplazar las fotos base64 incrustadas en `index.html` por
  imágenes servidas desde Supabase Storage, responsive y pruebas.

## Fase 1 — Cómo activar la base de datos (Supabase)

1. Crear una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com) (plan
   gratuito es suficiente para este volumen).
2. En el proyecto, ir a **SQL Editor → New query**, pegar y ejecutar el contenido de
   `supabase/migrations/0001_products.sql`.
3. Ejecutar igual `supabase/migrations/0002_storage.sql` (crea el bucket
   `product-images` para las fotos).
4. En **Authentication → Users**, crear manualmente el usuario de Isabel (email +
   contraseña). No se necesita ni se debe habilitar registro público — solo este panel
   crea usuarios administradores.
5. En **Authentication → Settings**, desactivar "Allow new users to sign up" para que
   nadie más pueda crearse una cuenta de administrador.
6. Guardar el **Project URL** y la **anon public key** (Project Settings → API): se van a
   usar en la Fase 2/3 para conectar el panel admin y la tienda pública a esta base de
   datos.

Con esto, la base de datos queda lista para conectar el panel admin.

## Fase 2 — Panel admin (`admin/`)

Es una página aparte (`admin/index.html`), sin login público: solo entra quien tenga
usuario y contraseña creados a mano en Supabase (paso 4 de arriba). Desde ahí Isabel
puede crear productos, subir varias fotos a la vez, ponerles precio, tildar en qué menú
aparecen (Temporada / Ofertas / Nuevos ingresos), marcarlos como vendidos y eliminarlos.

Para conectarlo a tu proyecto:

1. Abrir `assets/supabase-config.js` y reemplazar `url` y `anonKey` por los de tu
   proyecto (Project Settings → API).
2. Servir el sitio con un servidor local (no funciona bien abriendo el archivo
   directo con doble clic, porque el navegador bloquea el login bajo el protocolo
   `file://`). Por ejemplo, desde la carpeta del proyecto:
   ```
   npx serve .
   ```
   y abrir `http://localhost:3000/admin/` en el navegador.
3. Iniciar sesión con el correo y contraseña que le creaste a Isabel en Supabase.

Para producción, este mismo sitio (`index.html`, `admin/`, `assets/`) se puede
publicar tal cual en Netlify o Vercel arrastrando la carpeta o conectando este
repositorio de GitHub — no requiere build ni configuración especial.

## Fase 3 — Tienda dinámica (`assets/store.js`)

La sección `#productos` de `index.html` ahora carga el catálogo directamente desde
Supabase (misma conexión que el panel, vía `assets/supabase-config.js`):

- Solo se muestran productos con estado `disponible` — lo filtra la política de RLS
  `public_read_available_products`, no hay que hacer nada extra en el frontend.
- Los botones de filtro (Todos / Temporada / Ofertas / Nuevos ingresos) filtran en el
  navegador por el arreglo `tags` de cada producto.
- El botón "Reservar" de cada tarjeta abre WhatsApp con el nombre y precio del
  producto ya escritos en el mensaje.

No requiere configuración adicional: en cuanto un producto se marca `disponible` en el
panel admin, aparece en la tienda pública (recargando la página).

**Pendiente para Fase 4:** el botón "Reservar" sigue derivando a WhatsApp — falta el
botón de pago con Mercado Pago.
