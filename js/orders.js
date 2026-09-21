/**
 * Orders Page Logic (Pure Vanilla JavaScript)
 * Fetches user orders from GET /api/orders/myorders with token, or displays local order history.
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderOrders();
});

async function fetchAndRenderOrders() {
  const container = document.getElementById('orders-container');
  const subtitle = document.getElementById('orders-subtitle');
  if (!container) return;

  const token = getAuthToken();
  const user = getCurrentUser();

  let orders = [];

  if (token) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/orders/myorders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          orders = result.data;
        }
      }
    } catch (err) {
      console.warn('Could not fetch remote orders, checking local cache:', err);
    }
  }

  // Fallback / merge with local stored orders
  if (orders.length === 0) {
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      if (Array.isArray(localOrders) && localOrders.length > 0) {
        orders = localOrders;
      }
    } catch (e) {
      orders = [];
    }
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="margin: 2rem auto; max-width: 600px;">
        <div class="empty-state-icon">📦</div>
        <h3>No Orders Found</h3>
        <p>You haven't placed any orders yet. Explore our product catalog to make your first purchase!</p>
        <a href="products.html" class="btn btn-primary" style="margin-top: 0.5rem;">
          Shop Modern Catalog &rarr;
        </a>
      </div>
    `;
    if (subtitle) subtitle.textContent = 'No previous orders found for your account';
    return;
  }

  if (subtitle) {
    subtitle.textContent = `Showing ${orders.length} order${orders.length === 1 ? '' : 's'} placed through SwiftCart`;
  }

  container.innerHTML = orders.map(order => {
    const orderNumber = order.orderNumber || order.id || order._id || 'ORD-UNKNOWN';
    const rawDate = order.createdAt || order.date || new Date().toISOString();
    const formattedDate = new Date(rawDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const status = order.status || 'Processing';
    let statusClass = 'status-processing';
    if (status === 'Shipped') statusClass = 'status-shipped';
    else if (status === 'Delivered') statusClass = 'status-delivered';
    else if (status === 'Cancelled') statusClass = 'status-cancelled';

    const items = order.orderItems || order.items || [];
    const total = Number(order.totalPrice || order.total || 0);

    const paymentMethods = {
      cod: 'Cash on Delivery',
      card: 'Credit / Debit Card',
      upi: 'UPI / NetBanking'
    };
    const paymentLabel = paymentMethods[order.paymentMethod] || order.paymentMethod || 'Standard Payment';

    const shipping = order.shippingAddress || {};
    const shippingText = [shipping.fullName, shipping.address, shipping.city, shipping.zip]
      .filter(Boolean)
      .join(', ');

    return `
      <article class="order-card">
        <header class="order-card-header">
          <div class="order-meta-group">
            <div class="order-meta-item">
              <span class="order-meta-label">Order Number</span>
              <span class="order-meta-val" style="color: var(--primary-color);">${escapeHtml(orderNumber)}</span>
            </div>
            <div class="order-meta-item">
              <span class="order-meta-label">Date Placed</span>
              <span class="order-meta-val">${formattedDate}</span>
            </div>
            <div class="order-meta-item">
              <span class="order-meta-label">Payment</span>
              <span class="order-meta-val" style="font-weight: 500; font-size: 0.88rem;">${escapeHtml(paymentLabel)}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <span class="order-status-badge ${statusClass}">
              ● ${escapeHtml(status)}
            </span>
            <div style="text-align: right;">
              <span class="order-meta-label">Total</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">${formatCurrency(total)}</div>
            </div>
          </div>
        </header>

        <div class="order-card-body">
          <div class="order-items-table">
            ${items.map(item => {
              const qty = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              const itemTotal = price * qty;
              const imgUrl = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

              return `
                <div class="order-item-row">
                  <div class="order-item-main">
                    <img 
                      src="${escapeHtml(imgUrl)}" 
                      alt="${escapeHtml(item.name)}" 
                      class="order-item-img"
                      onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';"
                    >
                    <div>
                      <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.name)}</div>
                      <div style="font-size: 0.82rem; color: var(--text-muted);">Qty: ${qty} × ${formatCurrency(price)}</div>
                    </div>
                  </div>
                  <strong style="color: var(--text-main);">${formatCurrency(itemTotal)}</strong>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${shippingText ? `
          <footer class="order-card-footer">
            <div>
              <strong>Delivering to:</strong> ${escapeHtml(shippingText)}
            </div>
            <div>
              <span style="color: var(--success-color); font-weight: 600;">✓ Free Express Delivery</span>
            </div>
          </footer>
        ` : ''}
      </article>
    `;
  }).join('');
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
