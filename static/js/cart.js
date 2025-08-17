// Cart Functions with Enhanced Error Handling
async function addToCart(productId) {
    console.log('Adding product to cart:', productId);
    
    if (!currentUser) {
        alert('Please login to add items to cart');
        return;
    }
    
    if (currentUser.is_admin) {
        alert('Admin users cannot add items to cart');
        return;
    }
    
    try {
        const result = await apiCall('/cart', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });
        
        console.log('Add to cart result:', result);
        
        if (result.success) {
            alert(`${result.product_name || 'Product'} added to cart!`);
            updateCartCount();
        } else {
            alert('Error adding to cart: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Network error. Please try again.');
    }
}

async function loadCart() {
    console.log('Loading cart...');
    
    if (!currentUser) {
        console.log('No user logged in, cannot load cart');
        document.getElementById('cart-items').innerHTML = '<p>Please login to view your cart.</p>';
        return;
    }
    
    if (currentUser.is_admin) {
        document.getElementById('cart-items').innerHTML = '<p>Admin users do not have shopping carts.</p>';
        document.getElementById('cart-total').innerHTML = '';
        document.getElementById('checkout-btn').style.display = 'none';
        return;
    }
    
    try {
        const cartData = await apiCall('/cart');
        console.log('Cart data received:', cartData);
        
        displayCart(cartData);
    } catch (error) {
        console.error('Error loading cart:', error);
        document.getElementById('cart-items').innerHTML = '<p class="error">Error loading cart. Please try again.</p>';
    }
}

function displayCart(cartData) {
    console.log('Displaying cart:', cartData);
    
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartData || !cartData.items || cartData.items.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Browse our products and add items to your cart!</p>
                <button onclick="showSection('products')" class="btn-primary">Continue Shopping</button>
            </div>
        `;
        cartTotal.innerHTML = '';
        checkoutBtn.style.display = 'none';
        return;
    }
    
    let html = '<div class="cart-items-list">';
    let total = 0;
    
    cartData.items.forEach((item, index) => {
        console.log(`Rendering cart item ${index + 1}:`, item);
        
        try {
            const product = item.product;
            const subtotal = item.subtotal || 0;
            total += subtotal;
            
            if (!product) {
                html += `
                    <div class="cart-item error-item">
                        <p class="error">Product information not available</p>
                        <button onclick="removeFromCart(${item.id})" class="btn-danger btn-small">Remove</button>
                    </div>
                `;
            } else {
                html += `
                    <div class="cart-item" data-cart-id="${item.id}">
                        <div class="cart-item-info">
                            <div class="product-details">
                                <h4>${product.name || 'Unknown Product'}</h4>
                                ${product.brand ? `<p class="product-brand">${product.brand}</p>` : ''}
                                <p class="product-price">${parseFloat(product.price || 0).toFixed(2)} each</p>
                                <p class="stock-info">Stock: ${product.stock || 0}</p>
                            </div>
                            <div class="quantity-controls">
                                <label>Quantity:</label>
                                <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})" 
                                        class="quantity-btn" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})" 
                                        class="quantity-btn" ${item.quantity >= product.stock ? 'disabled' : ''}>+</button>
                            </div>
                            <div class="cart-item-actions">
                                <p class="subtotal">Subtotal: ${subtotal.toFixed(2)}</p>
                                <button onclick="removeFromCart(${item.id})" class="btn-danger btn-small">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Error rendering cart item ${index + 1}:`, error, item);
            html += `
                <div class="cart-item error-item">
                    <p class="error">Error displaying item</p>
                    <button onclick="removeFromCart(${item.id})" class="btn-danger btn-small">Remove</button>
                </div>
            `;
        }
    });

    html += '</div>';
    cartItems.innerHTML = html;
    
    // Display cart total
    cartTotal.innerHTML = `
        <div class="cart-summary">
            <div class="cart-stats">
                <p>Items in cart: ${cartData.count || 0}</p>
                <p class="cart-total-amount">Total: ${total.toFixed(2)}</p>
            </div>
        </div>
    `;
    
    checkoutBtn.style.display = total > 0 ? 'block' : 'none';
    
    console.log(`Cart displayed: ${cartData.items.length} items, total: ${total.toFixed(2)}`);
}

async function updateCartQuantity(cartId, newQuantity) {
    console.log(`Updating cart item ${cartId} to quantity ${newQuantity}`);
    
    if (newQuantity <= 0) {
        removeFromCart(cartId);
        return;
    }
    
    try {
        const result = await apiCall(`/cart/${cartId}`, {
            method: 'PUT',
            body: JSON.stringify({
                quantity: newQuantity
            })
        });
        
        console.log('Update cart result:', result);
        
        if (result.success) {
            loadCart(); // Reload cart to show updated totals
            updateCartCount();
        } else {
            alert('Error updating cart: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        alert('Network error. Please try again.');
    }
}

async function removeFromCart(cartId) {
    console.log('Removing item from cart:', cartId);
    
    if (!confirm('Are you sure you want to remove this item from your cart?')) {
        return;
    }
    
    try {
        const result = await apiCall(`/cart/${cartId}`, {
            method: 'DELETE'
        });
        
        console.log('Remove from cart result:', result);
        
        if (result.success) {
            loadCart(); // Reload cart
            updateCartCount();
        } else {
            alert('Error removing item: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Network error. Please try again.');
    }
}

async function updateCartCount() {
    console.log('Updating cart count...');
    
    if (!currentUser || currentUser.is_admin) {
        document.getElementById('cart-count').textContent = '0';
        return;
    }
    
    try {
        const cartData = await apiCall('/cart');
        console.log('Cart count data:', cartData);
        
        const count = cartData && cartData.items ? cartData.items.reduce((total, item) => total + item.quantity, 0) : 0;
        document.getElementById('cart-count').textContent = count;
        console.log('Cart count updated to:', count);
    } catch (error) {
        console.error('Error updating cart count:', error);
        document.getElementById('cart-count').textContent = '0';
    }
}

async function checkout() {
    console.log('Starting checkout process...');
    
    if (!currentUser) {
        alert('Please login to checkout');
        return;
    }
    
    if (currentUser.is_admin) {
        alert('Admin users cannot place orders');
        return;
    }
    
    if (!confirm('Are you sure you want to place this order?')) {
        return;
    }
    
    // Disable checkout button to prevent double-clicks
    const checkoutBtn = document.getElementById('checkout-btn');
    const originalText = checkoutBtn.textContent;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';
    
    try {
        console.log('Making checkout API call...');
        const result = await apiCall('/orders', {
            method: 'POST'
        });
        
        console.log('Checkout result:', result);
        
        if (result.success) {
            alert(`Order placed successfully! Order #${result.order_id}\nTotal: ${result.total_amount.toFixed(2)}`);
            
            // Clear cart display and redirect
            document.getElementById('cart-items').innerHTML = `
                <div class="checkout-success">
                    <h3>✅ Order Placed Successfully!</h3>
                    <p>Order #${result.order_id}</p>
                    <p>Total: ${result.total_amount.toFixed(2)}</p>
                    <p>You can view your order status in the "My Orders" section.</p>
                    <button onclick="showSection('orders')" class="btn-primary">View My Orders</button>
                    <button onclick="showSection('products')" class="btn-secondary">Continue Shopping</button>
                </div>
            `;
            document.getElementById('cart-total').innerHTML = '';
            checkoutBtn.style.display = 'none';
            
            // Update cart count
            updateCartCount();
        } else {
            console.error('Checkout failed:', result.message);
            alert('Checkout failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Network error during checkout. Please try again.');
    } finally {
        // Re-enable checkout button
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = originalText;
    }
}

// Clear cart function (utility)
async function clearCart() {
    if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
    }
    
    try {
        // Get all cart items and remove them one by one
        const cartData = await apiCall('/cart');
        
        if (cartData && cartData.items) {
            for (const item of cartData.items) {
                await apiCall(`/cart/${item.id}`, {
                    method: 'DELETE'
                });
            }
        }
        
        loadCart();
        updateCartCount();
        alert('Cart cleared successfully');
    } catch (error) {
        console.error('Error clearing cart:', error);
        alert('Error clearing cart. Please try again.');
    }
}

// Debug function for cart
function debugCart() {
    console.log('=== CART DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('Cart items element:', document.getElementById('cart-items'));
    console.log('Cart total element:', document.getElementById('cart-total'));
    console.log('Checkout button:', document.getElementById('checkout-btn'));
    
    // Test cart API
    if (currentUser && !currentUser.is_admin) {
        console.log('Testing cart API...');
        apiCall('/cart')
            .then(data => {
                console.log('Cart API test successful:', data);
            })
            .catch(error => {
                console.error('Cart API test failed:', error);
            });
    } else {
        console.log('No regular user logged in - cannot test cart API');
    }
}

// Make debug function available globally
window.debugCart = debugCart;

// Initialize cart functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cart module initialized');
    
    // Add event listeners for cart-related elements
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
});

// Export functions for use in other modules
window.addToCart = addToCart;
window.loadCart = loadCart;
window.updateCartCount = updateCartCount;
window.checkout = checkout;