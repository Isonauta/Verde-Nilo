(() => {
  const { createClient } = window.supabase;
  const client = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

  const loginScreen = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  const productForm = document.getElementById('product-form');
  const formTitle = document.getElementById('form-title');
  const formError = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  const fields = {
    name: document.getElementById('p-name'),
    description: document.getElementById('p-description'),
    price: document.getElementById('p-price'),
    type: document.getElementById('p-type'),
    typeOptions: document.getElementById('p-type-options'),
    status: document.getElementById('p-status'),
    featured: document.getElementById('p-featured'),
    images: document.getElementById('p-images'),
  };

  const tagCheckboxes = {
    temporada: document.getElementById('tag-temporada'),
    ofertas: document.getElementById('tag-ofertas'),
    nuevos_ingresos: document.getElementById('tag-nuevos'),
  };

  const imageGrid = document.getElementById('image-grid');
  const productList = document.getElementById('product-list');
  const productCount = document.getElementById('product-count');
  const orderList = document.getElementById('order-list');
  const orderCount = document.getElementById('order-count');

  let editingId = null;
  let currentImages = []; // URLs públicas ya subidas a Storage
  let allProducts = [];

  function showError(el, message) {
    el.textContent = message;
    el.classList.add('visible');
  }

  function clearError(el) {
    el.textContent = '';
    el.classList.remove('visible');
  }

  function formatPrice(value) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  }

  // ---------- AUTH ----------

  async function checkSession() {
    const { data } = await client.auth.getSession();
    if (data.session) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadProducts();
    loadOrders();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginError);
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showError(loginError, 'Correo o contraseña incorrectos.');
      return;
    }
    showDashboard();
  });

  logoutBtn.addEventListener('click', async () => {
    await client.auth.signOut();
    showLogin();
  });

  // ---------- IMAGES ----------

  function renderImageGrid() {
    imageGrid.innerHTML = '';
    currentImages.forEach((url, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'image-thumb';
      thumb.innerHTML = `<img src="${url}" alt=""><button type="button" title="Quitar foto">✕</button>`;
      thumb.querySelector('button').addEventListener('click', () => removeImage(index));
      imageGrid.appendChild(thumb);
    });
  }

  function storagePathFromUrl(url) {
    const marker = '/product-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  async function removeImage(index) {
    const url = currentImages[index];
    const path = storagePathFromUrl(url);
    if (path) {
      await client.storage.from('product-images').remove([path]);
    }
    currentImages.splice(index, 1);
    renderImageGrid();
  }

  fields.images.addEventListener('change', async () => {
    const files = Array.from(fields.images.files);
    fields.images.value = '';
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${crypto.randomUUID()}-${safeName}`;
      const { error } = await client.storage.from('product-images').upload(path, file);
      if (error) {
        showError(formError, `No se pudo subir "${file.name}": ${error.message}`);
        continue;
      }
      const { data } = client.storage.from('product-images').getPublicUrl(path);
      currentImages.push(data.publicUrl);
      renderImageGrid();
    }
  });

  // ---------- FORM ----------

  function resetForm() {
    editingId = null;
    currentImages = [];
    productForm.reset();
    renderImageGrid();
    formTitle.textContent = 'Nuevo producto';
    cancelEditBtn.style.display = 'none';
    clearError(formError);
  }

  function fillFormForEdit(product) {
    editingId = product.id;
    currentImages = [...(product.images || [])];
    fields.name.value = product.name || '';
    fields.description.value = product.description || '';
    fields.price.value = product.price ?? '';
    fields.type.value = product.product_type || '';
    fields.status.value = product.status || 'disponible';
    fields.featured.checked = !!product.featured;
    const tags = product.tags || [];
    tagCheckboxes.temporada.checked = tags.includes('temporada');
    tagCheckboxes.ofertas.checked = tags.includes('ofertas');
    tagCheckboxes.nuevos_ingresos.checked = tags.includes('nuevos_ingresos');
    renderImageGrid();
    formTitle.textContent = `Editando: ${product.name}`;
    cancelEditBtn.style.display = 'inline-block';
    clearError(formError);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditBtn.addEventListener('click', resetForm);

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(formError);

    const price = Number(fields.price.value);
    if (!fields.name.value.trim() || Number.isNaN(price) || price < 0) {
      showError(formError, 'Revisa el nombre y el precio.');
      return;
    }

    const tags = Object.values(tagCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    const payload = {
      name: fields.name.value.trim(),
      description: fields.description.value.trim(),
      price,
      product_type: fields.type.value.trim() || null,
      images: currentImages,
      tags,
      status: fields.status.value,
      featured: fields.featured.checked,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';

    const query = editingId
      ? client.from('products').update(payload).eq('id', editingId)
      : client.from('products').insert(payload);

    const { error } = await query;

    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';

    if (error) {
      showError(formError, `No se pudo guardar: ${error.message}`);
      return;
    }

    resetForm();
    loadProducts();
  });

  // ---------- LIST ----------

  async function loadProducts() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      productList.innerHTML = `<div class="error-msg visible">No se pudieron cargar los productos: ${error.message}</div>`;
      return;
    }

    allProducts = data || [];
    updateTypeSuggestions();
    renderProductList();
  }

  function updateTypeSuggestions() {
    const types = [...new Set(allProducts.map((p) => p.product_type).filter(Boolean))];
    fields.typeOptions.innerHTML = types.map((t) => `<option value="${t}">`).join('');
  }

  function renderProductList() {
    productCount.textContent = `${allProducts.length} producto(s)`;

    if (allProducts.length === 0) {
      productList.innerHTML = '<div class="empty-state">Todavía no hay productos. Crea el primero con el formulario.</div>';
      return;
    }

    productList.innerHTML = '';
    allProducts.forEach((product) => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const img = product.images && product.images[0]
        ? `<img src="${product.images[0]}" alt="">`
        : '<div class="no-img">🌿</div>';

      const tagBadges = (product.tags || []).map((t) => `<span class="badge">${t.replace('_', ' ')}</span>`).join('');
      const typeBadge = product.product_type ? `<span class="badge">${product.product_type}</span>` : '';
      const featuredBadge = product.featured ? '<span class="badge">★ destacado</span>' : '';

      card.innerHTML = `
        ${img}
        <div class="product-info">
          <h3>${product.name}</h3>
          <div class="product-price">${formatPrice(product.price)}</div>
          <div class="badge-row">
            <span class="badge badge-status-${product.status}">${product.status}</span>
            ${typeBadge}${tagBadges}${featuredBadge}
          </div>
        </div>
        <div class="product-actions"></div>
      `;

      const actions = card.querySelector('.product-actions');

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => fillFormForEdit(product));
      actions.appendChild(editBtn);

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-secondary';
      toggleBtn.textContent = product.status === 'vendido' ? 'Marcar disponible' : 'Marcar vendido';
      toggleBtn.addEventListener('click', () => toggleSold(product));
      actions.appendChild(toggleBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', () => deleteProduct(product));
      actions.appendChild(deleteBtn);

      productList.appendChild(card);
    });
  }

  async function toggleSold(product) {
    const newStatus = product.status === 'vendido' ? 'disponible' : 'vendido';
    const { error } = await client.from('products').update({ status: newStatus }).eq('id', product.id);
    if (error) {
      alert(`No se pudo actualizar: ${error.message}`);
      return;
    }
    loadProducts();
  }

  async function deleteProduct(product) {
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;

    const paths = (product.images || []).map(storagePathFromUrl).filter(Boolean);
    if (paths.length) {
      await client.storage.from('product-images').remove(paths);
    }

    const { error } = await client.from('products').delete().eq('id', product.id);
    if (error) {
      alert(`No se pudo eliminar: ${error.message}`);
      return;
    }
    if (editingId === product.id) resetForm();
    loadProducts();
  }

  // ---------- PEDIDOS (Mercado Pago) ----------

  async function loadOrders() {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      orderList.innerHTML = `<div class="error-msg visible">No se pudieron cargar los pedidos: ${error.message}</div>`;
      return;
    }

    renderOrderList(data || []);
  }

  function renderOrderList(orders) {
    const nuevos = orders.filter((o) => o.status === 'aprobado').length;
    orderCount.textContent = nuevos > 0 ? `${nuevos} nuevo(s)` : `${orders.length} pedido(s)`;

    if (orders.length === 0) {
      orderList.innerHTML = '<div class="empty-state">Todavía no hay pedidos por Mercado Pago.</div>';
      return;
    }

    orderList.innerHTML = '';
    orders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';

      const fecha = new Date(order.created_at).toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      const comprador = [order.buyer_name, order.buyer_email].filter(Boolean).join(' · ');

      card.innerHTML = `
        <div class="order-card-top">
          <h3>${order.product_name}</h3>
          <div class="order-price">${formatPrice(order.amount)}</div>
        </div>
        <div class="badge-row">
          <span class="badge badge-order-${order.status}">${order.status}</span>
        </div>
        <div class="order-meta" style="margin-top:6px">
          ${comprador ? `${comprador}<br>` : ''}${fecha}
        </div>
      `;

      orderList.appendChild(card);
    });
  }

  checkSession();
})();
