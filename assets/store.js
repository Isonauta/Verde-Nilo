// Fase 3: catálogo dinámico de la tienda pública.
// Lee los productos disponibles desde Supabase (mismo proyecto que el panel admin)
// y los renderiza en #productos-grid, con filtro por menú (tags).

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
    const texto = `Hola Verde Nilo, quiero reservar el TouBag "${product.name}" (${formatPrice(product.price)})`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }

  function renderGrid() {
    const visibles = activeTag === 'todos'
      ? products
      : products.filter((p) => (p.tags || []).includes(activeTag));

    if (visibles.length === 0) {
      grid.innerHTML = '<div class="prod-estado">Todavía no hay TouBags en esta categoría. Vuelve pronto 🌿</div>';
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
              <a class="btn-reservar" href="${reservarUrl(product)}" target="_blank">💬 Reservar</a>
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
})();
