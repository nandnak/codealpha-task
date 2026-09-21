/**
 * Shopping Cart page script
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTotal = document.getElementById('summary-total');
  const cart = getCart();

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Your cart is currently empty. <br><br>
          <a href="products.html" class="btn btn-primary">Browse Products</a>
        </td>
      </tr>
    `;
    if (summarySubtotal) summarySubtotal.textContent = '$0.00';
    if (summaryTotal) summaryTotal.textContent = '$0.00';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map((item, index) => {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    total += itemTotal;
    return `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td>${formatCurrency(item.price)}</td>
        <td>
          <input type="number" min="1" max="99" value="${item.quantity || 1}" 
            onchange="updateItemQuantity(${index}, this.value)"
            style="width: 60px; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px;">
        </td>
        <td><strong>${formatCurrency(itemTotal)}</strong></td>
        <td>
          <button class="btn btn-secondary" onclick="removeCartItem(${index})" style="padding: 0.3rem 0.6rem; font-size: 0.85rem; color: var(--danger-color);">
            Remove
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
}

function updateItemQuantity(index, newQty) {
  const cart = getCart();
  const qty = parseInt(newQty, 10);
  if (qty > 0 && cart[index]) {
    cart[index].quantity = qty;
    saveCart(cart);
    renderCart();
  }
}

function removeCartItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}
