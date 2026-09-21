/**
 * Orders History page script
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('orders-container');
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');

  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No orders found yet. <br><br>
          <a href="products.html" class="btn btn-primary">Start Shopping</a>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.id}</strong></td>
      <td>${order.date}</td>
      <td>${order.items ? order.items.length : 1} item(s)</td>
      <td><strong>${formatCurrency(order.total)}</strong></td>
      <td><span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">${order.status}</span></td>
    </tr>
  `).join('');
});
