// Product Functions
async function loadProducts() {
    const products = await apiCall('/products');
    currentProducts = products;
    displayProducts(products);
}

function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p class="product-price">$${product.price}</p>
            <p>Stock: ${product.stock}</p>
            <p>Category: ${product.category}</p>
            ${currentUser ? `<button class="btn-primary" onclick="addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>` : ''}
        `;
        grid.appendChild(card);
    });
}