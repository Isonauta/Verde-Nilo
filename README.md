# Verde Nilo

Sitio de Verde Nilo (Talcahuano, Chile) — productos hechos con telas reutilizadas (bolsos,
delantales, individuales, banderines y más).

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
- [x] **Fase 4 — Mercado Pago** (`api/`): botón "Comprar" por producto que crea una
  preferencia de pago (Checkout Pro) y redirige a Mercado Pago; un webhook confirma el
  pago y lo deja visible en la nueva sección "Pedidos" del panel (ella marca el producto
  como vendido manualmente, como ya hacía antes).
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

Para producción (hasta la Fase 3): este mismo sitio (`index.html`, `admin/`, `assets/`)
se podía publicar tal cual en Netlify o Vercel arrastrando la carpeta — no requería build
ni configuración especial. **Desde la Fase 4 esto cambió:** el botón de compra necesita
las funciones serverless de `api/`, así que hay que conectar el repositorio de GitHub a
Vercel (no sirve arrastrar la carpeta) — ver la sección de la Fase 4 más abajo.

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

## Fase 4 — Mercado Pago (`api/`)

Cada tarjeta del catálogo tiene dos botones: "Reservar" (WhatsApp, como antes) y
**"Comprar"**, que paga directo con Mercado Pago (tarjetas, transferencia, etc.) sin
salir del flujo de compra.

Cómo funciona (Checkout Pro, la modalidad más simple de Mercado Pago: el pago se hace
en una página de Mercado Pago, no hay que tocar datos de tarjetas en este sitio):

1. El botón "Comprar" llama a `api/create-preference.js`, que crea un pedido
   (`pendiente`) en la tabla `orders` y una "preferencia de pago" en Mercado Pago, y
   redirige al comprador a esa página de pago.
2. Cuando el comprador paga, Mercado Pago le muestra el resultado y lo devuelve al
   sitio (`?pago=exito|pendiente|error`, con un aviso en pantalla) y **además** llama a
   `api/mercadopago-webhook.js` por su cuenta (esto pasa aunque el comprador cierre la
   pestaña sin volver al sitio).
3. El webhook le vuelve a preguntar a Mercado Pago (con el Access Token privado) cuál es
   el estado real del pago — nunca confía en los datos que vienen en la notificación — y
   actualiza el pedido en `orders` (`pendiente` / `aprobado` / `rechazado`).
4. El pedido aprobado aparece en la sección **"Pedidos"** del panel admin. Isabel revisa
   ahí los pagos confirmados y marca el producto como **vendido manualmente** en la lista
   de productos (con el botón que ya existía) — así se evita vender el mismo producto dos
   veces si dos personas pagan casi al mismo tiempo.

### Cómo activarlo

1. **Base de datos:** ejecutar `supabase/migrations/0003_orders.sql` en el SQL Editor de
   Supabase (crea la tabla `orders`).
2. **Cuenta de Mercado Pago:** crear una cuenta de vendedor en
   [mercadopago.cl](https://www.mercadopago.cl) y, en
   [tus integraciones](https://www.mercadopago.cl/developers/panel/app), obtener:
   - **Credenciales de prueba** para probar todo el flujo con tarjetas de test antes de
     cobrar de verdad.
   - **Credenciales de producción** para cuando quede listo para cobrar en serio.
   En ambos casos, lo que se necesita acá es el **Access Token** (empieza con `TEST-` en
   modo prueba, o `APP_USR-` en producción). Nunca se sube al repositorio.
3. **Service role key de Supabase:** en Supabase, Project Settings → API → copiar la
   **`service_role` key** (distinta de la `anon` key que ya usan el panel y la tienda).
   Esta clave puede saltarse todas las políticas de RLS, así que solo se usa en las
   funciones serverless — jamás en código que corra en el navegador.
4. **Publicar en Vercel:** conectar este repositorio de GitHub como proyecto en
   [vercel.com](https://vercel.com) (no requiere configuración de build: Vercel detecta
   solo los archivos estáticos y las funciones de `api/`). En **Project Settings →
   Environment Variables** agregar:
   - `MP_ACCESS_TOKEN`: el Access Token de Mercado Pago (paso 2).
   - `SUPABASE_SERVICE_ROLE_KEY`: la service role key (paso 3).
5. Probar una compra completa con una
   [tarjeta de prueba](https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
   antes de cambiar a las credenciales de producción.

**Pendiente para Fase 5:** las fotos siguen incrustadas en base64 dentro de
`index.html`, lo que hace la página pesada — falta moverlas a Supabase Storage.
