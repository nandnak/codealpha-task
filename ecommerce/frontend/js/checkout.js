/**
 * Checkout page script
 */

document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkout-form');
  const summarySubtotal = document.getElementById('checkout-subtotal');
  const summaryTotal = document.getElementById('checkout-total');
  const cart = getCart();

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(total);

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (cart.length === 0) {
        alert('Your cart is empty! Add products before placing an order.');
        return;
      }

      const order = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        date: new Date().toLocaleDateString(),
        items: cart,
        total: total,
        status: 'Processing'
      };

      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.unshift(order);
      localStorage.setItem('orders', JSON.stringify(existingOrders));

      // Clear cart
      localStorage.removeItem('cart');
      updateCartBadge();

      alert(`Order ${order.id} placed successfully!`);
      window.location.href = 'orders.html';
    });
  }
});
