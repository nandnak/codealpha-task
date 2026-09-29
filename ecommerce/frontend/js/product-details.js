/**
 * Product Details Page Logic (Pure Vanilla JavaScript)
 * Extracts 'id' from URL query params, requests GET /api/products/:id,
 * renders interactive product showcase, manages quantity selection and cart interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('product-details-container');
  const breadcrumbsContainer = document.getElementById('breadcrumbs-container');

  // 1. Extract product ID from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  // If no ID is provided in the URL
  if (!productId || productId.trim() === '') {
    renderErrorState({
      title: 'No Product Selected',
      message: 'Please select a product from our catalog to view its details.',
      showRetry: false
    });
    return;
  }

  // 2. Fetch product details
  fetchProductDetails(productId.trim());

  /**
   * Fetch single product by ID from configured API
   */
  async function fetchProductDetails(id) {
    renderLoadingSkeleton();

    const apiUrl = `${API_CONFIG.baseURL}/api/products/${id}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404) {
          renderErrorState({
            title: 'Product Not Found',
            message: `No product was found matching ID: "${id}". It may have been removed or the link is incorrect.`,
            showRetry: false
          });
          return;
        } else if (response.status === 400) {
          renderErrorState({
            title: 'Invalid Product Identifier',
            message: data?.message || `The provided product ID "${id}" is not in a valid format.`,
            showRetry: false
          });
          return;
        } else {
          throw new Error(data?.message || `Server error (HTTP ${response.status})`);
        }
      }

      const product = data?.data || data;

      if (!product || typeof product !== 'object') {
        throw new Error('Unexpected data format received from API');
      }

      // Render product details
      renderProductDetails(product);

    } catch (error) {
      console.error('Error fetching product details:', error);
      renderErrorState({
        title: 'Unable to Load Product',
        message: `Could not connect to the backend API at <code>${escapeHtml(apiUrl)}</code>. Please make sure the server is running.`,
        showRetry: true,
        retryFn: () => fetchProductDetails(id)
      });
    }
  }

  /**
   * Render complete product details view
   */
  function renderProductDetails(product) {
    if (!container) return;

    // Update browser page title
    document.title = `${product.name} - SwiftCart`;

    // Update breadcrumbs
    if (breadcrumbsContainer) {
      breadcrumbsContainer.innerHTML = `
        <a href="index.html">Home</a>
        <span class="separator">/</span>
        <a href="products.html">Products</a>
        <span class="separator">/</span>
        <a href="products.html?category=${encodeURIComponent(product.category || '')}">${escapeHtml(product.category || 'General')}</a>
        <span class="separator">/</span>
        <span class="current">${escapeHtml(product.name)}</span>
      `;
    }

    const stock = typeof product.stock === 'number' ? product.stock : 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;

    // Stock badge markup
    let stockBadgeHtml = '';
    let stockStatusText = '';
    if (isOutOfStock) {
      stockBadgeHtml = `<span class="badge badge-stock-out">Out of Stock</span>`;
      stockStatusText = `<strong style="color: var(--danger-color);">Currently Sold Out</strong>`;
    } else if (isLowStock) {
      stockBadgeHtml = `<span class="badge badge-stock-low">Only ${stock} Left</span>`;
      stockStatusText = `<span style="color: var(--warning-color); font-weight: 600;">Limited Inventory (${stock} remaining)</span>`;
    } else {
      stockBadgeHtml = `<span class="badge badge-stock-in">In Stock</span>`;
      stockStatusText = `<span style="color: var(--success-color); font-weight: 600;">${stock} units available</span>`;
    }

    // Image fallback
    const imgHtml = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-detail-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'font-size: 5rem;\\'>📦</div>';">`
      : `<div style="font-size: 5rem;">📦</div>`;

    container.innerHTML = `
      <div class="product-detail-layout">
        <!-- Left: Product Image Showcase -->
        <div class="product-detail-image-box">
          ${imgHtml}
          <div style="position: absolute; top: 16px; right: 16px;">
            ${stockBadgeHtml}
          </div>
        </div>

        <!-- Right: Product Information & Purchase Controls -->
        <div class="product-detail-info">
          <span class="detail-category">${escapeHtml(product.category || 'General')}</span>
          <h1 class="detail-title">${escapeHtml(product.name)}</h1>

          <div class="detail-price-row">
            <span class="detail-price">${formatCurrency(product.price)}</span>
            <span style="font-size: 0.9rem; color: var(--text-muted);">Includes all taxes</span>
          </div>

          <p class="detail-description">${escapeHtml(product.description || 'No description provided.')}</p>

          <!-- Meta Specifications Box -->
          <div class="detail-meta-box">
            <div class="detail-meta-item">
              <span class="detail-meta-label">Category</span>
              <span class="detail-meta-value">${escapeHtml(product.category || 'Standard')}</span>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-label">Availability</span>
              <span class="detail-meta-value">${stockStatusText}</span>
            </div>
          </div>

          <!-- Purchase Controls Section -->
          <div class="detail-actions-section">
            <div class="qty-control-row">
              <label for="detail-qty-input" class="qty-label">Quantity:</label>
              <div class="qty-stepper">
                <button type="button" class="qty-btn" id="qty-minus" ${isOutOfStock ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
                <input 
                  type="number" 
                  id="detail-qty-input" 
                  class="qty-input" 
                  value="1" 
                  min="1" 
                  max="${stock}" 
                  ${isOutOfStock ? 'disabled' : ''}
                >
                <button type="button" class="qty-btn" id="qty-plus" ${isOutOfStock ? 'disabled' : ''} aria-label="Increase quantity">+</button>
              </div>
              <span style="font-size: 0.85rem; color: var(--text-muted);" id="qty-feedback-text">
                ${isOutOfStock ? 'Item unavailable' : `Max ${stock}`}
              </span>
            </div>

            <!-- Action CTA Buttons -->
            <div class="detail-cta-buttons">
              <button 
                id="add-to-cart-detail-btn" 
                class="btn btn-primary" 
                style="flex: 2;" 
                ${isOutOfStock ? 'disabled title="Product is out of stock"' : ''}
              >
                🛒 ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
              </button>
              <a href="products.html" class="btn btn-secondary" style="flex: 1;">
                &larr; Back to Products
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    // 3. Attach interactive quantity controls & Add to Cart
    if (!isOutOfStock) {
      setupQuantityStepper(stock);
      setupAddToCart(product, stock);
    }
  }

  /**
   * Set up quantity selector stepper (+ and - buttons and input validation)
   */
  function setupQuantityStepper(maxStock) {
    const qtyInput = document.getElementById('detail-qty-input');
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn = document.getElementById('qty-plus');

    if (!qtyInput || !minusBtn || !plusBtn) return;

    function updateButtonStates(val) {
      minusBtn.disabled = val <= 1;
      plusBtn.disabled = val >= maxStock;
    }

    minusBtn.addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10) || 1;
      if (currentVal > 1) {
        currentVal--;
        qtyInput.value = currentVal;
        updateButtonStates(currentVal);
      }
    });

    plusBtn.addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value, 10) || 1;
      if (currentVal < maxStock) {
        currentVal++;
        qtyInput.value = currentVal;
        updateButtonStates(currentVal);
      } else {
        showToast(`Only ${maxStock} units available in stock.`, 'warning');
      }
    });

    qtyInput.addEventListener('change', () => {
      let val = parseInt(qtyInput.value, 10);
      if (isNaN(val) || val < 1) {
        val = 1;
      } else if (val > maxStock) {
        val = maxStock;
        showToast(`Quantity adjusted to maximum available stock (${maxStock}).`, 'warning');
      }
      qtyInput.value = val;
      updateButtonStates(val);
    });

    // Initial button state
    updateButtonStates(parseInt(qtyInput.value, 10) || 1);
  }

  /**
   * Set up "Add to Cart" button logic
   */
  function setupAddToCart(product, maxStock) {
    const addBtn = document.getElementById('add-to-cart-detail-btn');
    const qtyInput = document.getElementById('detail-qty-input');

    addBtn?.addEventListener('click', () => {
      const selectedQty = parseInt(qtyInput.value, 10) || 1;
      const id = product._id || product.id;

      const cart = getCart();
      const existingItem = cart.find(item => (item.id || item._id) === id);
      const currentInCart = existingItem ? (existingItem.quantity || 1) : 0;

      // Prevent exceeding stock limit across combined additions
      if (currentInCart + selectedQty > maxStock) {
        const remainingAddable = maxStock - currentInCart;
        if (remainingAddable <= 0) {
          showToast(`You already have all ${maxStock} available units in your cart.`, 'warning');
        } else {
          showToast(`Cannot add ${selectedQty}. Only ${remainingAddable} more unit(s) can be added to your cart.`, 'warning');
        }
        return;
      }

      if (existingItem) {
        existingItem.quantity = currentInCart + selectedQty;
      } else {
        cart.push({
          id: id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          quantity: selectedQty
        });
      }

      // Save and update navbar badge
      saveCart(cart);

      // Show toast notification
      showToast(`Added ${selectedQty} × "${product.name}" to your cart!`, 'success');

      // Visual feedback on the button
      const originalText = addBtn.innerHTML;
      addBtn.innerHTML = '✓ Added to Cart';
      addBtn.style.backgroundColor = 'var(--success-color)';
      setTimeout(() => {
        addBtn.innerHTML = originalText;
        addBtn.style.backgroundColor = '';
      }, 1200);
    });
  }

  /**
   * Render loading skeleton state
   */
  function renderLoadingSkeleton() {
    if (!container) return;
    container.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-detail-image-box skeleton-shimmer" style="height: 440px;"></div>
        <div class="product-detail-info" style="gap: 1.25rem;">
          <div class="skeleton-line skeleton-line-sm skeleton-shimmer" style="width: 25%;"></div>
          <div class="skeleton-line skeleton-line-title skeleton-shimmer" style="width: 80%; height: 36px;"></div>
          <div class="skeleton-line skeleton-shimmer" style="width: 30%; height: 32px;"></div>
          <div class="skeleton-line skeleton-line-desc skeleton-shimmer" style="height: 90px;"></div>
          <div class="skeleton-line skeleton-line-btn skeleton-shimmer" style="height: 48px; margin-top: 1.5rem;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render friendly error message
   */
  function renderErrorState({ title, message, showRetry = false, retryFn = null }) {
    if (!container) return;

    // Update document title and breadcrumb
    document.title = `${title} - SwiftCart`;
    if (breadcrumbsContainer) {
      breadcrumbsContainer.innerHTML = `
        <a href="index.html">Home</a>
        <span class="separator">/</span>
        <a href="products.html">Products</a>
        <span class="separator">/</span>
        <span class="current">Error</span>
      `;
    }

    container.innerHTML = `
      <div class="error-state" style="max-width: 650px; margin: 2rem auto;">
        <div class="error-state-icon">⚠️</div>
        <h3>${escapeHtml(title)}</h3>
        <p style="margin-bottom: 2rem;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="products.html" class="btn btn-primary">&larr; Back to Products</a>
          ${showRetry ? `<button class="btn btn-secondary" id="retry-btn">Try Again</button>` : ''}
        </div>
      </div>
    `;

    if (showRetry && retryFn) {
      document.getElementById('retry-btn')?.addEventListener('click', retryFn);
    }
  }

  // Prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
