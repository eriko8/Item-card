// Get cart data from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Select the cart container
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");

// Render cart items
function renderCart() {
  cartItemsEl.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("cart-item");

    li.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p class="cart-item-price">$${item.price.toFixed(2)}</p>
      </div>
      <button class="remove-button" onclick="removeItem(${index})">Remove</button>
    `;

    cartItemsEl.appendChild(li);
    total += item.price;
  });

  cartTotalEl.textContent = `Total: $${total.toFixed(2)}`;
}

// Remove item from cart
function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// Initial render
renderCart();
