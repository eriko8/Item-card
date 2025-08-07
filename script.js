
function addToCart(name, price, image) {
  const cartItem = { name, price, image };
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push(cartItem);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderInlineCart(); // update cart panel
  openCart(); // auto-show it
}

function toggleCart() {
  showCartModal();
}

function showCartModal() {
  // Remove any existing modal
  const oldModal = document.getElementById('cart-modal-bg');
  if (oldModal) oldModal.remove();
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const modalBg = document.createElement('div');
  modalBg.id = 'cart-modal-bg';
  modalBg.style.position = 'fixed';
  modalBg.style.top = 0;
  modalBg.style.left = 0;
  modalBg.style.right = 0;
  modalBg.style.bottom = 0;
  modalBg.style.background = 'rgba(0,0,0,0.5)';
  modalBg.style.display = 'flex';
  modalBg.style.alignItems = 'center';
  modalBg.style.justifyContent = 'center';
  modalBg.style.zIndex = 4000;
  modalBg.innerHTML = `
    <div style="background:#fff;border-radius:16px;box-shadow:0 8px 25px rgba(0,0,0,0.2);max-width:500px;width:100%;padding:32px 24px 24px 24px;position:relative;">
      <span style="position:absolute;top:12px;right:16px;font-size:24px;color:#888;cursor:pointer;" id="cart-modal-close">&times;</span>
      <h2 style="margin-top:0;margin-bottom:18px;font-size:1.3rem;font-weight:600;">Your Cart</h2>
      ${cart.length === 0 ? '<p>Your cart is empty.</p>' : `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:8px;text-align:left;">Image</th>
            <th style="padding:8px;text-align:left;">Name</th>
            <th style="padding:8px;text-align:right;">Price</th>
            <th style="padding:8px;text-align:center;">Remove</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map((item, i) => `
            <tr>
              <td style="padding:8px;"><img src="${item.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"></td>
              <td style="padding:8px;">${item.name}</td>
              <td style="padding:8px;text-align:right;">$${Number(item.price).toFixed(2)}</td>
              <td style="padding:8px;text-align:center;"><button onclick="removeCartItem(${i});document.getElementById('cart-modal-bg').remove();showCartModal();" style="background:crimson;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;">Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:18px;font-weight:bold;text-align:right;">Total: $${cart.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2)}</p>
      <button onclick="clearCart();document.getElementById('cart-modal-bg').remove();showCartModal();" style="margin-top:10px;background:#888;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;width:100%;">Clear All</button>
      `}
    </div>
  `;
  document.body.appendChild(modalBg);
  document.getElementById('cart-modal-close').onclick = () => modalBg.remove();
  modalBg.onclick = e => { if (e.target === modalBg) modalBg.remove(); };
}

function openCart() {
  document.getElementById("cartPanel").classList.add("active");
}

function renderInlineCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartItemsEl = document.getElementById("inlineCartItems");
  const cartTotalEl = document.getElementById("inlineCartTotal");
  cartItemsEl.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<li>Your cart is empty.</li>";
    cartTotalEl.textContent = "Total: $0.00";
    return;
  }

  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <strong>${item.name}</strong>
        <p>$${item.price.toFixed(2)}</p>
      </div>
      <button onclick="removeFromCart(${index})" style="background: crimson; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;">Remove</button>
    `;
    cartItemsEl.appendChild(li);
    total += item.price;
  });

  cartTotalEl.textContent = `Total: $${total.toFixed(2)}`;
}
