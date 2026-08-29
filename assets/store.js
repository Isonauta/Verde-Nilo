// Fase 3: catálogo dinámico de la tienda pública.
// Lee los productos disponibles desde Supabase (mismo proyecto que el panel admin)
// y los renderiza en #productos-grid, con filtro por menú (tags).
//
// Fase 4: botón "Comprar" que crea una preferencia de Mercado Pago
// (api/create-preference.js) y redirige al checkout.

(() => {
  const { createClient } = window.supabase;
  const client = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

  const grid = document.getElementById('productos-grid');
  const filtros = document.getElementById('prod-filtros');

  const WHATSAPP_NUMBER = '56984790825';

  let products = [];
  let activeTag = 'todos';

  function formatPrice(value) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  }

  function reservarUrl(product) {
    const texto = `Hola Verde Nilo, quiero reservar el producto "${product.name}" (${formatPrice(product.price)})`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }

  function renderGrid() {
    const visibles = activeTag === 'todos'
      ? products
      : products.filter((p) => (p.tags || []).includes(activeTag));

    if (visibles.length === 0) {
      grid.innerHTML = '<div class="prod-estado">Todavía no hay productos en esta categoría. Vuelve pronto 🌿</div>';
      return;
    }

    grid.innerHTML = visibles.map((product) => {
      const img = product.images && product.images[0]
        ? `<img src="${product.images[0]}" alt="${product.name}" loading="lazy">`
        : '';
      const tag = (product.tags || [])[0];
      const tagLabel = tag ? tag.replace('_', ' ') : (product.featured ? 'destacado' : '');
      const ribbon = tagLabel ? `<span class="prod-tag">${tagLabel}</span>` : '';
      const code = product.product_type ? `<div class="prod-code">${product.product_type}</div>` : '';
      const desc = product.description ? `<p class="prod-desc">${product.description}</p>` : '';

      return `
        <div class="prod-card">
          <div class="prod-img-wrap">${img}${ribbon}</div>
          <div class="prod-body">
            ${code}
            <h3 class="prod-name">${product.name}</h3>
            ${desc}
            <div class="prod-footer">
              <div class="prod-price">${formatPrice(product.price)}</div>
              <div class="prod-actions">
                <a class="btn-reservar" href="${reservarUrl(product)}" target="_blank">💬 Reservar</a>
                <button type="button" class="btn-mp" data-id="${product.id}">Comprar</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  filtros.addEventListener('click', (e) => {
    const btn = e.target.closest('.filtro-btn');
    if (!btn) return;
    filtros.querySelectorAll('.filtro-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeTag = btn.dataset.tag;
    renderGrid();
  });

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-mp');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Redirigiendo…';

    try {
      const res = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) throw new Error(data.error || 'Error desconocido');
      window.location.href = data.init_point;
    } catch (err) {
      alert(`No se pudo iniciar el pago: ${err.message}`);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  function showPagoBanner() {
    const params = new URLSearchParams(location.search);
    const pago = params.get('pago');

    const mensajes = {
      exito: { texto: '✅ ¡Pago recibido! Isabel confirmará tu pedido a la brevedad.', color: 'var(--verde)' },
      pendiente: { texto: '⏳ Tu pago quedó pendiente de confirmación.', color: 'var(--verde-oscuro)' },
      error: { texto: '❌ El pago no se pudo completar. Puedes intentar de nuevo o reservar por WhatsApp.', color: 'var(--rosa)' },
    };
    const info = mensajes[pago];
    if (!info) return;

    const banner = document.createElement('div');
    banner.textContent = info.texto;
    banner.style.cssText = `position:sticky;top:0;z-index:1000;background:${info.color};color:white;text-align:center;padding:14px 20px;font-family:'DM Sans',sans-serif;font-size:0.9rem;`;
    document.body.prepend(banner);

    // Limpiamos el parámetro de la URL para no repetir el aviso al recargar o compartir el link.
    params.delete('pago');
    const nuevaUrl = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
    history.replaceState({}, '', nuevaUrl);
  }

  async function loadProducts() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      grid.innerHTML = `<div class="prod-estado">No se pudo cargar el catálogo: ${error.message}</div>`;
      return;
    }

    products = data || [];
    renderGrid();
  }

  loadProducts();
  showPagoBanner();
})();
