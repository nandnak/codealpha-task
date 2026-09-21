/**
 * Products Catalog Logic (Pure Vanilla JavaScript)
 * Fetches products from GET /api/products, manages filters, sorting, search, and cart actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const productsContainer = document.getElementById('products-container');
  const searchInput = document.getElementById('product-search');
  const sortSelect = document.getElementById('product-sort');
  const categoryChips = document.getElementById('category-chips');
  const productCountLabel = document.getElementById('product-count');

  let allProducts = [];
  let currentCategory = 'all';
  let currentSearchQuery = '';
  let currentSort = 'default';

  // Initialize and fetch products
  fetchProducts();

  // Attach search listener (with debounce for smooth typing)
  let searchTimeout = null;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    }, 200);
  });

  // Attach sort listener
  sortSelect?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndRender();
  });

  // Attach category chips listeners
  categoryChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    currentCategory = chip.getAttribute('data-category') || 'all';
    applyFiltersAndRender();
  });

  /**
   * 1. Fetch products from the configurable API endpoint
   */
  async function fetchProducts() {
    renderLoadingState();

    const apiUrl = `${API_CONFIG.baseURL}/api/products`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText || 'Server Error'})`);
      }

      const result = await response.json();

      // Handle standard API response format
      if (result.success && Array.isArray(result.data)) {
        allProducts = result.data;
      } else if (Array.isArray(result)) {
        allProducts = result;
      } else {
        throw new Error('Invalid response format received from API');
      }

      applyFiltersAndRender();
    } catch (error) {
      console.error('Failed to fetch products:', error);
      renderErrorState(error.message, apiUrl);
    }
  }

  /**
   * 2. Filter, sort, and render products
   */
  function applyFiltersAndRender() {
    let filtered = [...allProducts];

    // Category Filter
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => 
        (p.category || '').toLowerCase() === currentCategory.toLowerCase()
      );
    }

    // Search Query Filter
    if (currentSearchQuery) {
      filtered = filtered.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(currentSearchQuery);
        const descMatch = (p.description || '').toLowerCase().includes(currentSearchQuery);
        const catMatch = (p.category || '').toLowerCase().includes(currentSearchQuery);
        return nameMatch || descMatch || catMatch;
      });
    }

    // Sorting
    if (currentSort === 'price-asc') {
      filtered.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (currentSort === 'price-desc') {
      filtered.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (currentSort === 'name-asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Update product counter
    if (productCountLabel) {
      productCountLabel.textContent = `Showing ${filtered.length} of ${allProducts.length} product${allProducts.length === 1 ? '' : 's'}`;
    }

    // Render results or empty state
    if (filtered.length === 0) {
      renderEmptyState();
    } else {
      renderProductCards(filtered);
    }
  }

  /**
   * 3. Render Product Cards Grid
   */
  function renderProductCards(products) {
    if (!productsContainer) return;

    productsContainer.innerHTML = products.map(product => {
      const id = product._id || product.id;
      const stock = typeof product.stock === 'number' ? product.stock : 0;
      const isOutOfStock = stock <= 0;
      const isLowStock = stock > 0 && stock <= 5;

      // Stock badge markup
      let stockBadgeHtml = '';
      if (isOutOfStock) {
        stockBadgeHtml = `<span class="badge badge-stock-out">Out of Stock</span>`;
      } else if (isLowStock) {
        stockBadgeHtml = `<span class="badge badge-stock-low">Only ${stock} Left</span>`;
      } else {
        stockBadgeHtml = `<span class="badge badge-stock-in">In Stock</span>`;
      }

      // Safe image markup
      const imgHtml = product.image 
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-img" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'>📦</div>';">`
        : `<div class="product-image-placeholder">📦</div>`;

      return `
        <article class="product-card" data-id="${id}">
          <div class="product-image-container">
            ${imgHtml}
            <div class="product-badge-container">
              ${stockBadgeHtml}
            </div>
          </div>
          
          <div class="product-body">
            <span class="product-category">${escapeHtml(product.category || 'General')}</span>
            <h3 class="product-title" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
            <p class="product-desc">${escapeHtml(product.description || '')}</p>

            <div class="product-footer">
              <div class="product-price-row">
                <span class="product-price">${formatCurrency(product.price)}</span>
                <span class="product-stock-text">
                  ${isOutOfStock ? '<strong style="color: var(--danger-color)">Unavailable</strong>' : `${stock} available`}
                </span>
              </div>

              <div class="product-actions">
                <a href="product-details.html?id=${id}" class="btn btn-secondary btn-sm">View Details</a>
                <button 
                  class="btn btn-primary btn-sm add-to-cart-btn" 
                  data-id="${id}"
                  ${isOutOfStock ? 'disabled title="This item is currently sold out"' : ''}
                >
                  ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach click events for "Add to Cart"
    productsContainer.querySelectorAll('.add-to-cart-btn').forEach(button => {
      button.addEventListener('click', handleAddToCart);
    });
  }

  /**
   * 4. Add to Cart Handler
   */
  function handleAddToCart(e) {
    const button = e.currentTarget;
    const id = button.getAttribute('data-id');
    const product = allProducts.find(p => (p._id || p.id) === id);

    if (!product) return;

    if (product.stock <= 0) {
      showToast(`Sorry, "${product.name}" is out of stock.`, 'warning');
      return;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => (item.id || item._id) === id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity || 1;
      if (currentQty >= product.stock) {
        showToast(`Cannot add more. Only ${product.stock} units available in stock.`, 'warning');
        return;
      }
      cart[existingIndex].quantity = currentQty + 1;
    } else {
      cart.push({
        id: product._id || product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: 1
      });
    }

    saveCart(cart);
    showToast(`Added "${product.name}" to cart!`, 'success');

    // Visual feedback on button
    const originalText = button.textContent;
    button.textContent = 'Added ✓';
    button.style.backgroundColor = 'var(--success-color)';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 1000);
  }

  /**
   * 5. Loading State (Skeleton Cards)
   */
  function renderLoadingState() {
    if (!productsContainer) return;
    if (productCountLabel) productCountLabel.textContent = 'Fetching catalog...';

    productsContainer.innerHTML = Array(6).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-image skeleton-shimmer"></div>
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-line-sm skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-line-title skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-line-desc skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-line-btn skeleton-shimmer"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 6. Empty State
   */
  function renderEmptyState() {
    if (!productsContainer) return;

    const isFiltered = currentCategory !== 'all' || currentSearchQuery !== '';

    productsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No Products Found</h3>
        <p>
          ${isFiltered 
            ? 'We couldn\'t find any items matching your current filters or search term.'
            : 'No products are currently available in the database catalog. Run <code>npm run seed</code> in your terminal to insert sample products.'}
        </p>
        ${isFiltered 
          ? `<button class="btn btn-secondary" id="reset-filters-btn">Reset All Filters</button>`
          : `<button class="btn btn-primary" id="retry-fetch-btn">Refresh Catalog</button>`
        }
      </div>
    `;

    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearchQuery = '';
      currentCategory = 'all';
      document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-category') === 'all');
      });
      applyFiltersAndRender();
    });

    document.getElementById('retry-fetch-btn')?.addEventListener('click', fetchProducts);
  }

  /**
   * 7. Error State
   */
  function renderErrorState(errorMessage, targetUrl) {
    if (!productsContainer) return;
    if (productCountLabel) productCountLabel.textContent = 'Error connecting to API';

    productsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">⚠️</div>
        <h3>Unable to Load Products</h3>
        <p>
          Failed to fetch from <code>${escapeHtml(targetUrl)}</code>: <strong>${escapeHtml(errorMessage)}</strong>
        </p>
        <p style="font-size: 0.88rem; margin-bottom: 1.5rem;">
          Make sure your Node.js Express server is running (<code>npm run dev</code>) and your MongoDB Atlas connection is active.
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button class="btn btn-primary" id="retry-error-btn">Try Again</button>
          <a href="/api/health" target="_blank" class="btn btn-outline">Check Server Health</a>
        </div>
      </div>
    `;

    document.getElementById('retry-error-btn')?.addEventListener('click', fetchProducts);
  }

  // Utility to prevent XSS in text injection
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
