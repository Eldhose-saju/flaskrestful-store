// Fixed Product Functions with Enhanced Error Handling
let allProducts = [];
let filterOptions = {};

async function loadProducts() {
    console.log('Loading products...');
    
    try {
        // Get search parameters from URL or form
        const searchParams = getSearchParams();
        const queryString = new URLSearchParams(searchParams).toString();
        const url = queryString ? `/products?${queryString}` : '/products';
        
        console.log('Fetching from URL:', url);
        
        const result = await apiCall(url);
        console.log('Products API result:', result);
        
        // Handle both response formats more robustly
        if (result && typeof result === 'object') {
            if (Array.isArray(result)) {
                // Direct array response
                allProducts = result;
                filterOptions = {};
            } else if (result.products && Array.isArray(result.products)) {
                // Object with products array
                allProducts = result.products;
                filterOptions = result.filters || {};
            } else {
                console.error('Unexpected response format:', result);
                allProducts = [];
                filterOptions = {};
            }
        } else {
            console.error('Invalid response:', result);
            allProducts = [];
            filterOptions = {};
        }
        
        console.log('Processed products:', allProducts);
        console.log('Filter options:', filterOptions);
        
        displayProducts(allProducts);
        updateFilterOptions();
        updateProductStats();
        
    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
                    <h3>Error loading products</h3>
                    <p>Failed to load products: ${error.message}</p>
                    <p>Please check:</p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>Flask server is running on port 5000</li>
                        <li>Database is initialized with products</li>
                        <li>CORS is properly configured</li>
                        <li>No JavaScript console errors</li>
                    </ul>
                    <button onclick="loadProducts()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
        }
    }
}

function getSearchParams() {
    const params = {
        search: '',
        category: '',
        brand: '',
        min_price: '',
        max_price: '',
        featured: false,
        sort: 'name'
    };
    
    // Safely get values from form elements
    try {
        const searchEl = document.getElementById('product-search');
        if (searchEl) params.search = searchEl.value || '';
        
        const categoryEl = document.getElementById('category-filter');
        if (categoryEl) params.category = categoryEl.value || '';
        
        const brandEl = document.getElementById('brand-filter');
        if (brandEl) params.brand = brandEl.value || '';
        
        const minPriceEl = document.getElementById('min-price');
        if (minPriceEl && minPriceEl.value) params.min_price = minPriceEl.value;
        
        const maxPriceEl = document.getElementById('max-price');
        if (maxPriceEl && maxPriceEl.value) params.max_price = maxPriceEl.value;
        
        const featuredEl = document.getElementById('featured-filter');
        if (featuredEl) params.featured = featuredEl.checked || false;
        
        const sortEl = document.getElementById('sort-select');
        if (sortEl) params.sort = sortEl.value || 'name';
        
    } catch (error) {
        console.warn('Error getting search params:', error);
    }
    
    return params;
}

function displayProducts(products) {
    console.log('Displaying products:', products);
    
    const grid = document.getElementById('products-grid');
    if (!grid) {
        console.error('Products grid element not found!');
        return;
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
        grid.innerHTML = `
            <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 3rem; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px;">
                <h3 style="color: #6c757d; margin-bottom: 1rem;">No products found</h3>
                <p style="color: #6c757d;">No products match your current criteria.</p>
                ${!products || products.length === 0 ? '<p style="color: #dc3545;">The products database might be empty.</p>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    products.forEach((product, index) => {
        console.log(`Rendering product ${index + 1}:`, product);
        
        try {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Safely access product properties with fallbacks
            const name = product.name || 'Unknown Product';
            const price = product.price ? parseFloat(product.price).toFixed(2) : '0.00';
            const description = product.description || 'No description available';
            const stock = product.stock !== undefined ? parseInt(product.stock) : 0;
            const category = product.category || 'Uncategorized';
            const brand = product.brand || '';
            const featured = product.featured || false;
            
            const featuredBadge = featured ? '<span class="featured-badge">Featured</span>' : '';
            const stockStatus = stock === 0 ? 'out-of-stock' : stock < 10 ? 'low-stock' : '';
            const stockText = stock === 0 ? 'Out of Stock' : stock < 10 ? `Only ${stock} left` : `${stock} in stock`;
            
            card.innerHTML = `
                ${featuredBadge}
                <div class="product-header">
                    <h3>${name}</h3>
                    ${brand ? `<span class="product-brand">${brand}</span>` : ''}
                </div>
                <p class="product-description">${description}</p>
                <p class="product-price">${price}</p>
                <p class="product-stock ${stockStatus}">${stockText}</p>
                <p class="product-category">Category: ${category}</p>
                ${currentUser && !currentUser.is_admin ? `
                    <button class="btn-primary" onclick="addToCart(${product.id})" ${stock === 0 ? 'disabled' : ''}>
                        ${stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                ` : ''}
            `;
            
            grid.appendChild(card);
            
        } catch (error) {
            console.error(`Error rendering product ${index + 1}:`, error, product);
            
            // Add error card for debugging
            const errorCard = document.createElement('div');
            errorCard.className = 'product-card';
            errorCard.style.border = '2px solid #dc3545';
            errorCard.innerHTML = `
                <div style="color: #dc3545;">
                    <h3>Error rendering product</h3>
                    <p>Product index: ${index + 1}</p>
                    <p>Error: ${error.message}</p>
                    <pre style="font-size: 12px; background: #f8f9fa; padding: 0.5rem; border-radius: 4px; overflow: auto;">${JSON.stringify(product, null, 2)}</pre>
                </div>
            `;
            grid.appendChild(errorCard);
        }
    });
    
    console.log(`Successfully displayed ${products.length} products`);
}

function updateFilterOptions() {
    console.log('Updating filter options:', filterOptions);
    
    // Update category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter && filterOptions.categories) {
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        filterOptions.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            option.selected = currentValue === category;
            categoryFilter.appendChild(option);
        });
    }
    
    // Update brand filter
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter && filterOptions.brands) {
        const currentValue = brandFilter.value;
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        filterOptions.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            option.selected = currentValue === brand;
            brandFilter.appendChild(option);
        });
    }
}

function updateProductStats() {
    const statsElement = document.getElementById('product-stats');
    if (statsElement && allProducts) {
        const total = allProducts.length;
        const inStock = allProducts.filter(p => p.stock > 0).length;
        const featured = allProducts.filter(p => p.featured).length;
        
        statsElement.innerHTML = `
            Showing ${total} products | ${inStock} in stock | ${featured} featured
        `;
    }
}

// Enhanced search and filter functions
function searchProducts() {
    console.log('Search triggered');
    loadProducts(); // Reload with current search parameters
}

function clearFilters() {
    console.log('Clearing filters');
    
    // Clear all filter inputs safely
    const elements = [
        'product-search',
        'category-filter',
        'brand-filter', 
        'min-price',
        'max-price',
        'featured-filter',
        'sort-select'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = id === 'sort-select' ? 'name' : '';
            }
        }
    });
    
    // Reload products
    loadProducts();
}

function sortProducts(sortBy) {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.value = sortBy;
    }
    loadProducts();
}

// Enhanced initialization with better error handling
function initializeProductsSection() {
    console.log('Initializing products section...');
    
    // Add event listeners for real-time search with debouncing
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchProducts, 500); // Debounce search
        });
    }
    
    // Add event listeners for filters
    const filters = [
        'category-filter', 
        'brand-filter', 
        'min-price', 
        'max-price', 
        'featured-filter', 
        'sort-select'
    ];
    
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', searchProducts);
        }
    });
    
    console.log('Products section initialized');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing products...');
    initializeProductsSection();
});

// Quick filter functions with error handling
function showFeaturedProducts() {
    try {
        const featuredFilter = document.getElementById('featured-filter');
        if (featuredFilter) {
            featuredFilter.checked = true;
            loadProducts();
        }
    } catch (error) {
        console.error('Error showing featured products:', error);
    }
}

function showCategory(category) {
    try {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = category;
            loadProducts();
        }
    } catch (error) {
        console.error('Error filtering by category:', error);
    }
}

function showBrand(brand) {
    try {
        const brandFilter = document.getElementById('brand-filter');
        if (brandFilter) {
            brandFilter.value = brand;
            loadProducts();
        }
    } catch (error) {
        console.error('Error filtering by brand:', error);
    }
}

// Debug function to test products display
function debugProducts() {
    console.log('=== PRODUCTS DEBUG INFO ===');
    console.log('All products:', allProducts);
    console.log('Filter options:', filterOptions);
    console.log('Products grid element:', document.getElementById('products-grid'));
    console.log('Current user:', window.currentUser);
    
    // Test API call
    console.log('Testing products API...');
    if (window.apiCall) {
        window.apiCall('/products')
            .then(result => console.log('API test result:', result))
            .catch(error => console.error('API test failed:', error));
    } else {
        console.error('apiCall function not available');
    }
}

// Make debug function available globally
window.debugProducts = debugProducts;

// Export functions for use in other modules
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.searchProducts = searchProducts;
window.clearFilters = clearFilters;