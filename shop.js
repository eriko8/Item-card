// ====== Configuration for Public API Integration ======
const USE_PUBLIC_API = true; // Public API only (no local products.json fallback)

// Resolve API base from injected meta; validate and fallback to sensible default
const metaBaseEl = document.querySelector('meta[name="public-api-base"]');
let PUBLIC_API_BASE = (metaBaseEl && metaBaseEl.getAttribute('content') || '').trim();
if (!/^https?:\/\//i.test(PUBLIC_API_BASE)) {
  console.warn('[API] Invalid or missing public-api-base meta value ("' + PUBLIC_API_BASE + '"). Falling back to http://127.0.0.1:5000');
  PUBLIC_API_BASE = 'http://127.0.0.1:5000';
}
PUBLIC_API_BASE = PUBLIC_API_BASE.replace(/\/$/, '');
console.log('[API] Using PUBLIC_API_BASE:', PUBLIC_API_BASE);
const PUBLIC_API_PER_PAGE = 50; // Adjust as needed
const META_KEY = document.querySelector('meta[name="public-api-key"]')?.getAttribute('content'); // injected via server.js from .env
const PUBLIC_API_KEY = META_KEY || 'public-demo-key-12345'; // Demo key fallback

// Internal caches
let categoryMap = {}; // id -> name
let rawCategories = []; // Full category objects from API

function apiHeaders() {
  const h = {};
  if (PUBLIC_API_KEY) h['X-API-Key'] = PUBLIC_API_KEY;
  return h;
}

async function fetchCategories() {
  try {
    const resp = await fetch(`${PUBLIC_API_BASE}/public/categories`, { headers: apiHeaders() });
    if (!resp.ok) throw new Error('Categories request failed: ' + resp.status);
    const data = await resp.json();
    rawCategories = data.categories || [];
    categoryMap = rawCategories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  } catch (err) {
    console.warn('[API] Failed to fetch categories', err);
  }
}

async function fetchProducts() {
  if (!PUBLIC_API_KEY) {
    console.error('[API] No PUBLIC_API_KEY available. Set it via meta tag or environment.');
  }
  try {
    const resp = await fetch(`${PUBLIC_API_BASE}/public/products?per_page=${PUBLIC_API_PER_PAGE}`, { headers: apiHeaders() });
    if (!resp.ok) throw new Error('Products request failed: ' + resp.status);
    const data = await resp.json();
    const list = data.products || [];
    return list.map(p => mapApiProduct(p));
  } catch (err) {
    console.error('[API] Failed to fetch products (no local fallback):', err);
    return [];
  }
}

function mapApiProduct(p) {
  const image = (p.image_urls && p.image_urls[0]) || '';
  const categoryName = categoryMap[p.category_id] || '';
  return {
    id: String(p.id),
    title: p.name || 'Untitled',
    description: p.description || '',
    price: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : (p.price ? `$${Number(p.price).toFixed(2)}` : '$0.00'),
    oldPrice: '',
    badge: '',
    category: categoryName,
    colors: ['default'],
    defaultColor: 'default',
    images: { default: image },
    promoCode: '',
    promoDiscount: ''
  };
}

function renderProductCard(product) {
  const defaultColor = product.defaultColor || product.colors[0];
  return `
    <div class="border p-2 sm:p-2 md:p-3 text-center shadow hover:shadow-lg cursor-pointer product-card bg-white rounded-lg flex flex-col relative w-full" style="max-width:240px;min-width:0;" data-id="${product.id}">
      <span class="inline-block bg-red-500 text-white text-xs rounded px-2 py-1 absolute mt-2 ml-2">${product.badge}</span>
      <img src="${product.images[defaultColor]}" alt="${product.title}" class="w-full h-36 sm:h-40 md:h-44 object-cover mb-2 fade-img show rounded-md" data-main-img>
      <h3 class="font-semibold text-sm sm:text-base md:text-lg">${product.title}</h3>
      <p class="text-xs text-gray-600">${product.description}</p>
      <div class="flex justify-center gap-2 my-2">
        ${product.colors.map(c => `<span class="color-dot ${c}" data-color="${c}" style="width:14px;height:14px;border-radius:50%;display:inline-block;border:1px solid #ccc;"></span>`).join('')}
      </div>
      <div class="flex justify-center items-center gap-2">
        <span class="text-blue-600 font-semibold">${product.price}</span>
        <span class="line-through text-gray-400">${product.oldPrice}</span>
      </div>
      <button class="buy-button mt-2 px-3 py-1.5 bg-blue-600 text-white rounded w-full text-xs sm:text-sm" onclick="addToCart('${product.title.replace(/'/g, "\\'")}', ${parseFloat(product.price.replace(/[^\d.]/g, ''))}, '${product.images[defaultColor]}')">Buy Now</button>
    </div>
  `;
}

let allProducts = [];
let currentCategory = 'All';
let currentSearch = '';

function renderGrid(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = products.map(renderProductCard).join('');
  grid.querySelectorAll('.product-card[data-id]').forEach(card => {
    const id = card.getAttribute('data-id');
    const product = products.find(p => p.id === id);
    const img = card.querySelector('[data-main-img]');
    card.querySelectorAll('.color-dot[data-color]').forEach(dot => {
      dot.addEventListener('click', e => {
        e.stopPropagation();
        const color = dot.getAttribute('data-color');
        if (product.images[color]) {
          img.classList.remove('show');
          setTimeout(() => { img.src = product.images[color]; img.classList.add('show'); }, 200);
        }
      });
    });
    card.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.classList.contains('color-dot')) return;
      if (!product) return;
      const modal = createModal(product);
      document.body.appendChild(modal);
    });
  });
}

function getFilteredProducts() {
  let filtered = allProducts;
  if (currentCategory !== 'All') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  if (currentSearch.trim()) {
    const q = currentSearch.trim().toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  return filtered;
}

function renderCategoriesFromApi() {
  const categoryListEl = document.getElementById('category-list');
  if (!categoryListEl) return;
  const categoryNames = rawCategories.length ? rawCategories.map(c => c.name) : Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
  const all = ['All', ...categoryNames];
  categoryListEl.innerHTML = all.map(cat => `<li class="cursor-pointer hover:underline${cat === 'All' ? ' font-bold text-blue-600' : ''}" data-category="${cat}">${cat}</li>`).join('');
}

function wireUiHandlers() {
  const categoryListEl = document.getElementById('category-list');
  if (categoryListEl) {
    categoryListEl.addEventListener('click', e => {
      const li = e.target.closest('li[data-category]');
      if (!li) return;
      currentCategory = li.getAttribute('data-category');
      document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('font-bold', 'text-blue-600'));
      li.classList.add('font-bold', 'text-blue-600');
      renderGrid(getFilteredProducts());
    });
  }
  const searchBox = document.getElementById('search-box');
  const searchBtn = document.getElementById('search-btn');
  if (searchBox) {
    searchBox.addEventListener('input', () => { currentSearch = searchBox.value; renderGrid(getFilteredProducts()); });
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', () => { currentSearch = searchBox.value; renderGrid(getFilteredProducts()); });
  }
}

(async function initCatalogue(){
  await fetchCategories();
  const products = await fetchProducts();
  allProducts = products;
  renderCategoriesFromApi();
  renderGrid(getFilteredProducts());
  wireUiHandlers();
})();

function addToCart(name, price, image) {
  const cartItem = { name, price, image };
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push(cartItem);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderInlineCart();
  openCart();
}

function toggleCart() {
  document.getElementById('cartPanel').classList.toggle('active');
  renderInlineCart();
}

function openCart() {
  document.getElementById('cartPanel').classList.add('active');
  renderInlineCart();
}

function renderInlineCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartItemsEl = document.getElementById('inlineCartItems');
  const cartTotalEl = document.getElementById('inlineCartTotal');
  cartItemsEl.innerHTML = '';
  let total = 0;
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<li>Your cart is empty.</li>';
    cartTotalEl.textContent = 'Total: $0.00';
    return;
  }
  cart.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `<img src="${item.image}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;margin-right:10px;">${item.name} <span style="margin-left:auto;font-weight:bold;">$${item.price}</span> <button onclick="removeCartItem(${i})" style="background:crimson;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">x</button>`;
    cartItemsEl.appendChild(li);
    total += Number(item.price);
  });
  cartTotalEl.textContent = `Total: $${total.toFixed(2)}`;
}

function removeCartItem(idx) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(idx, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderInlineCart();
}

function clearCart() {
  localStorage.setItem('cart', JSON.stringify([]));
  renderInlineCart();
}

function createModal(product) {
  const modalBg = document.createElement('div');
  modalBg.className = 'modal-bg';
  const defaultColor = product.defaultColor || product.colors[0];
  modalBg.innerHTML = `
    <div class="modal-card">
      <span class="modal-close" title="Close">&times;</span>
      <img src="${product.images[defaultColor]}" alt="${product.title}" style="width:100%;border-radius:12px;object-fit:cover;max-height:220px;box-shadow:0 4px 16px rgba(0,0,0,0.10);margin-bottom:12px;" class="fade-img show" data-modal-img>
      <span class="badge" style="position:absolute;top:20px;left:20px;">${product.badge}</span>
      <h3 class="product-title" style="margin-top:18px;font-size:1.3rem;font-weight:600;">${product.title}</h3>
      <p class="description" style="margin-bottom:10px;color:#555;font-size:1rem;">${product.description}</p>
      <div class="price-row" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
        <span class="new-price" style="color:#2563eb;font-weight:bold;">${product.price}</span>
        <span class="old-price" style="text-decoration:line-through;color:#888;font-size:14px;">${product.oldPrice}</span>
      </div>
      <div class="colors" style="margin-bottom:10px;display:flex;gap:8px;justify-content:center;">
        ${product.colors.map(c => `<span class="color-dot ${c}" data-color="${c}" style="width:18px;height:18px;border-radius:50%;border:2px solid #eee;box-shadow:0 2px 6px rgba(0,0,0,0.07);"></span>`).join('')}
      </div>
      <div class="promo" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <span class="promo-code" style="background:#f3f3f3;padding:2px 8px;border-radius:4px;font-weight:bold;">${product.promoCode}</span>
        <span class="promo-discount" style="color:purple;font-weight:bold;">${product.promoDiscount}</span>
      </div>
      <button class="buy-button" style="margin-top:10px;width:100%;background:#2563eb;color:#fff;padding:10px 0;border-radius:8px;font-weight:600;font-size:1rem;">BUY +</button>
    </div>`;
  const modalImg = modalBg.querySelector('[data-modal-img]');
  modalBg.querySelectorAll('.color-dot[data-color]').forEach(dot => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      const color = dot.getAttribute('data-color');
      if (product.images[color]) {
        modalImg.classList.remove('show');
        setTimeout(() => { modalImg.src = product.images[color]; modalImg.classList.add('show'); }, 200);
      }
    });
  });
  modalBg.querySelector('.modal-close').onclick = () => modalBg.remove();
  modalBg.onclick = e => { if (e.target === modalBg) modalBg.remove(); };
  return modalBg;
}
