/**
 * Checkout Page Logic (Pure Vanilla JavaScript)
 * Previews cart items, manages payment method selections, and posts real orders to MongoDB backend.
 */

document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkout-form');
  const summarySubtotal = document.getElementById('checkout-subtotal');
  const summaryTotal = document.getElementById('checkout-total');
  const miniItemsContainer = document.getElementById('checkout-mini-items');
  const itemCountLabel = document.getElementById('checkout-item-count');
  const submitBtn = document.getElementById('submit-order-btn');
  const cart = getCart();

  // Redirect if cart is empty
  if (cart.length === 0) {
    showToast('Your cart is empty. Please add products first.', 'warning');
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1200);
    return;
  }

  // 1. Auto-fill logged-in user details if available
  const user = getCurrentUser();
  if (user) {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    if (fullNameInput && user.name) fullNameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  // 2. Render mini-items preview
  let total = 0;
  let totalQty = 0;

  if (miniItemsContainer) {
    miniItemsContainer.innerHTML = cart.map(item => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const itemTotal = price * qty;
      total += itemTotal;
      totalQty += qty;

      const imgUrl = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

      return `
        <div class="mini-item">
          <img 
            src="${escapeHtml(imgUrl)}" 
            alt="${escapeHtml(item.name)}" 
            class="mini-item-thumb"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';"
          >
          <div class="mini-item-details">
            <div class="mini-item-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="mini-item-sub">${qty} × ${formatCurrency(price)}</div>
          </div>
          <div style="font-weight: 700; color: var(--text-main);">
            ${formatCurrency(itemTotal)}
          </div>
        </div>
      `;
    }).join('');
  }

  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
  if (itemCountLabel) itemCountLabel.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
  if (submitBtn) submitBtn.innerHTML = `🔒 Place Order (${formatCurrency(total)})`;

  // 3. Setup payment option cards switcher
  setupPaymentOptions();

  // 4. Handle checkout form submission
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const phone = document.getElementById('phone')?.value.trim();
      const address = document.getElementById('address')?.value.trim();
      const city = document.getElementById('city')?.value.trim();
      const zip = document.getElementById('zip')?.value.trim();
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';

      if (!fullName || !email || !address || !city || !zip) {
        showToast('Please complete all required shipping fields', 'warning');
        return;
      }

      // Prepare order payload
      const orderPayload = {
        orderItems: cart.map(item => ({
          product: item.id || item._id,
          name: item.name,
          image: item.image,
          price: Number(item.price),
          quantity: Number(item.quantity) || 1
        })),
        shippingAddress: {
          fullName,
          address,
          city,
          zip,
          country: 'US'
        },
        customer: {
          name: fullName,
          email,
          phone
        },
        paymentMethod
      };

      // Disable button during submission
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = `⏳ Processing Order...`;

      try {
        const headers = {
          'Content-Type': 'application/json'
        };

        const token = getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_CONFIG.baseURL}/api/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Server returned an error placing the order');
        }

        const createdOrder = result.data;

        // Clear shopping cart on successful placement
        saveCart([]);

        // Store latest order reference in localStorage
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localOrders.unshift(createdOrder);
        localStorage.setItem('orders', JSON.stringify(localOrders));
        localStorage.setItem('lastOrder', JSON.stringify(createdOrder));

        // Show confirmation modal
        showOrderSuccessModal(createdOrder);

      } catch (err) {
        console.error('Order creation error:', err);
        showToast(err.message || 'Failed to place order. Please try again.', 'warning');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});

function setupPaymentOptions() {
  const options = document.querySelectorAll('.payment-option-card');
  const cardBox = document.getElementById('card-fields-box');
  const upiBox = document.getElementById('upi-fields-box');

  options.forEach(card => {
    card.addEventListener('click', () => {
      options.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const val = radio?.value;
      if (cardBox) cardBox.style.display = val === 'card' ? 'block' : 'none';
      if (upiBox) upiBox.style.display = val === 'upi' ? 'block' : 'none';
    });
  });
}

function showOrderSuccessModal(order) {
  const modal = document.getElementById('order-success-modal');
  if (!modal) {
    window.location.href = 'orders.html';
    return;
  }

  const orderNumElem = document.getElementById('modal-order-number');
  const recipientElem = document.getElementById('modal-recipient-name');
  const totalElem = document.getElementById('modal-total-amount');
  const methodElem = document.getElementById('modal-payment-method');

  if (orderNumElem) orderNumElem.textContent = order.orderNumber || order._id;
  if (recipientElem) recipientElem.textContent = order.shippingAddress?.fullName || order.customer?.name || 'Customer';
  if (totalElem) totalElem.textContent = formatCurrency(order.totalPrice);
  if (methodElem) {
    const methods = { cod: 'Cash on Delivery', card: 'Credit/Debit Card (Simulated)', upi: 'UPI Transfer (Simulated)' };
    methodElem.textContent = methods[order.paymentMethod] || order.paymentMethod;
  }

  modal.classList.add('active');
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
