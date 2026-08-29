# Verde Nilo

Sitio de Verde Nilo (Talcahuano, Chile) — bolsos TouBag hechos con telas reutilizadas.

## Roadmap: de landing a tienda con admin

Estado actual: `index.html` es una landing estática (sin catálogo, sin carrito) que deriva
toda venta a WhatsApp. El plan es convertirla en una tienda real que Isabel pueda
administrar sola, con pagos por Mercado Pago.

- [x] **Fase 1 — Base de datos** (`supabase/migrations/`): catálogo de productos con fotos,
  precio, stock/estado y etiquetas de menú (`temporada`, `ofertas`, `nuevos_ingresos`),
  más el bucket de almacenamiento para las fotos.
- [ ] **Fase 2 — Panel admin**: login de Isabel + formulario para crear/editar/borrar
  productos, subir fotos y marcar "vendido".
- [ ] **Fase 3 — Tienda dinámica**: la página pública deja de tener productos fijos y los
  lee desde la base de datos, con filtros por menú.
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

Con esto, la base de datos queda lista: solo falta construir el panel admin (Fase 2) y
conectar la tienda pública (Fase 3) para que Isabel empiece a cargar productos.
