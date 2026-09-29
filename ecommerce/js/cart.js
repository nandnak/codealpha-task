/**
 * Shopping Cart Logic (Pure Vanilla JavaScript)
 * Renders modern cart items with thumbnails, steppers, subtotal, and summary calculations.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  // Attach clear cart listener
  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove all items from your cart?')) {
      saveCart([]);
      renderCart();
      showToast('Cart cleared', 'info');
    }
  });
});

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTotal = document.getElementById('summary-total');
  const summaryQtyCount = document.getElementById('summary-qty-count');
  const cartTableFooter = document.getElementById('cart-table-footer');
  const proceedBtn = document.getElementById('proceed-checkout-btn');
  const subtitle = document.getElementById('cart-item-count-subtitle');
  const cart = getCart();

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state" style="padding: 3rem 1.5rem; border: none; box-shadow: none;">
            <div class="empty-state-icon">🛒</div>
            <h3>Your Shopping Cart is Empty</h3>
            <p>Looks like you haven't added any premium products to your cart yet.</p>
            <a href="products.html" class="btn btn-primary" style="margin-top: 0.5rem;">
              Discover Products &rarr;
            </a>
          </div>
        </td>
      </tr>
    `;

    if (summarySubtotal) summarySubtotal.textContent = '$0.00';
    if (summaryTotal) summaryTotal.textContent = '$0.00';
    if (summaryQtyCount) summaryQtyCount.textContent = '0 items';
    if (cartTableFooter) cartTableFooter.style.display = 'none';
    if (proceedBtn) {
      proceedBtn.classList.add('disabled');
      proceedBtn.style.pointerEvents = 'none';
      proceedBtn.style.opacity = '0.5';
    }
    if (subtitle) subtitle.textContent = 'Your cart is currently empty';
    return;
  }

  // Active items in cart
  if (cartTableFooter) cartTableFooter.style.display = 'flex';
  if (proceedBtn) {
    proceedBtn.classList.remove('disabled');
    proceedBtn.style.pointerEvents = 'auto';
    proceedBtn.style.opacity = '1';
  }

  let total = 0;
  let totalQty = 0;

  container.innerHTML = cart.map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const itemTotal = price * qty;
    total += itemTotal;
    totalQty += qty;

    const imgUrl = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
    const id = item.id || item._id || '';

    return `
      <tr data-index="${index}">
        <td>
          <div class="cart-product-cell">
            <img 
              src="${escapeHtml(imgUrl)}" 
              alt="${escapeHtml(item.name)}" 
              class="cart-thumb"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';"
            >
            <div class="cart-product-info">
              <span class="cart-product-category">${escapeHtml(item.category || 'Product')}</span>
              <a href="product-details.html?id=${id}" class="cart-product-title" title="${escapeHtml(item.name)}">
                ${escapeHtml(item.name)}
              </a>
            </div>
          </div>
        </td>

        <td>
          <span style="font-weight: 600; color: var(--text-main); font-size: 1rem;">
            ${formatCurrency(price)}
          </span>
        </td>

        <td>
          <div class="cart-qty-stepper">
            <button 
              type="button" 
              class="cart-qty-btn" 
              onclick="adjustCartQuantity(${index}, -1)" 
              aria-label="Decrease quantity"
              ${qty <= 1 ? 'disabled style="opacity: 0.4;"' : ''}
            >−</button>
            <input 
              type="number" 
              min="1" 
              max="99" 
              value="${qty}" 
              class="cart-qty-input"
              onchange="onQuantityInputChange(${index}, this.value)"
            >
            <button 
              type="button" 
              class="cart-qty-btn" 
              onclick="adjustCartQuantity(${index}, 1)" 
              aria-label="Increase quantity"
            >+</button>
          </div>
        </td>

        <td>
          <strong style="font-size: 1.05rem; color: var(--text-main);">
            ${formatCurrency(itemTotal)}
          </strong>
        </td>

        <td style="text-align: right;">
          <button 
            type="button" 
            class="cart-remove-btn" 
            onclick="removeCartItem(${index})"
            title="Remove from cart"
          >
            🗑️ <span>Remove</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
  if (summaryQtyCount) summaryQtyCount.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
  if (subtitle) subtitle.textContent = `You have ${totalQty} item${totalQty === 1 ? '' : 's'} in your cart`;
}

function adjustCartQuantity(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;

  const current = Number(cart[index].quantity) || 1;
  const updated = current + delta;

  if (updated <= 0) {
    removeCartItem(index);
    return;
  }

  cart[index].quantity = updated;
  saveCart(cart);
  renderCart();
}

function onQuantityInputChange(index, rawVal) {
  const cart = getCart();
  if (!cart[index]) return;

  let val = parseInt(rawVal, 10);
  if (isNaN(val) || val < 1) {
    val = 1;
  } else if (val > 99) {
    val = 99;
  }

  cart[index].quantity = val;
  saveCart(cart);
  renderCart();
}

function removeCartItem(index) {
  const cart = getCart();
  if (!cart[index]) return;

  const removedName = cart[index].name;
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  showToast(`Removed "${removedName}" from cart`, 'info');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
