// Cart Functions with Enhanced Error Handling and Bug Fixes

// Fixed Unicode issue in success message
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
        const cartItemsElement = document.getElementById('cart-items');
        if (cartItemsElement) {
            cartItemsElement.innerHTML = '<p>Please login to view your cart.</p>';
        }
        return;
    }
    
    if (currentUser.is_admin) {
        const cartItemsElement = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');
        const checkoutBtnElement = document.getElementById('checkout-btn');
        
        if (cartItemsElement) {
            cartItemsElement.innerHTML = '<p>Admin users do not have shopping carts.</p>';
        }
        if (cartTotalElement) {
            cartTotalElement.innerHTML = '';
        }
        if (checkoutBtnElement) {
            checkoutBtnElement.style.display = 'none';
        }
        return;
    }
    
    try {
        const cartData = await apiCall('/cart');
        console.log('Cart data received:', cartData);
        
        displayCart(cartData);
    } catch (error) {
        console.error('Error loading cart:', error);
        const cartItemsElement = document.getElementById('cart-items');
        if (cartItemsElement) {
            cartItemsElement.innerHTML = '<p class="error">Error loading cart. Please try again.</p>';
        }
    }
}

function displayCart(cartData) {
    console.log('Displaying cart:', cartData);
    
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Add null checks for DOM elements
    if (!cartItems) {
        console.error('Cart items element not found');
        return;
    }
    
    if (!cartData || !cartData.items || cartData.items.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Browse our products and add items to your cart!</p>
                <button onclick="showSection('products')" class="btn-primary">Continue Shopping</button>
            </div>
        `;
        if (cartTotal) cartTotal.innerHTML = '';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    
    let html = '<div class="cart-items-list">';
    let total = 0;
    
    cartData.items.forEach((item, index) => {
        console.log(`Rendering cart item ${index + 1}:`, item);
        
        try {
            const product = item.product;
            const subtotal = parseFloat(item.subtotal || 0);
            total += subtotal;
            
            if (!product) {
                html += `
                    <div class="cart-item error-item">
                        <p class="error">Product information not available</p>
                        <button onclick="removeFromCart(${item.id})" class="btn-danger btn-small">Remove</button>
                    </div>
                `;
            } else {
                // Fix price parsing and null checks
                const price = parseFloat(product.price || 0);
                const stock = parseInt(product.stock || 0);
                const quantity = parseInt(item.quantity || 1);
                
                html += `
                    <div class="cart-item" data-cart-id="${item.id}">
                        <div class="cart-item-info">
                            <div class="product-details">
                                <h4>${escapeHtml(product.name || 'Unknown Product')}</h4>
                                ${product.brand ? `<p class="product-brand">${escapeHtml(product.brand)}</p>` : ''}
                                <p class="product-price">$${price.toFixed(2)} each</p>
                                <p class="stock-info">Stock: ${stock}</p>
                            </div>
                            <div class="quantity-controls">
                                <label>Quantity:</label>
                                <button onclick="updateCartQuantity(${item.id}, ${quantity - 1})" 
                                        class="quantity-btn" ${quantity <= 1 ? 'disabled' : ''}>-</button>
                                <span class="quantity">${quantity}</span>
                                <button onclick="updateCartQuantity(${item.id}, ${quantity + 1})" 
                                        class="quantity-btn" ${quantity >= stock ? 'disabled' : ''}>+</button>
                            </div>
                            <div class="cart-item-actions">
                                <p class="subtotal">Subtotal: $${subtotal.toFixed(2)}</p>
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
                    <button onclick="removeFromCart(${item.id || 0})" class="btn-danger btn-small">Remove</button>
                </div>
            `;
        }
    });

    html += '</div>';
    cartItems.innerHTML = html;
    
    // Display cart total
    if (cartTotal) {
        cartTotal.innerHTML = `
            <div class="cart-summary">
                <div class="cart-stats">
                    <p>Items in cart: ${cartData.count || 0}</p>
                    <p class="cart-total-amount">Total: $${total.toFixed(2)}</p>
                </div>
            </div>
        `;
    }
    
    if (checkoutBtn) {
        checkoutBtn.style.display = total > 0 ? 'block' : 'none';
    }
    
    console.log(`Cart displayed: ${cartData.items.length} items, total: $${total.toFixed(2)}`);
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function updateCartQuantity(cartId, newQuantity) {
    console.log(`Updating cart item ${cartId} to quantity ${newQuantity}`);
    
    // Fix: Ensure cartId is valid
    if (!cartId || cartId <= 0) {
        console.error('Invalid cart ID:', cartId);
        alert('Invalid cart item. Please refresh the page.');
        return;
    }
    
    if (newQuantity <= 0) {
        removeFromCart(cartId);
        return;
    }
    
    try {
        const result = await apiCall(`/cart/${cartId}`, {
            method: 'PUT',
            body: JSON.stringify({
                quantity: parseInt(newQuantity)
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
    
    // Fix: Ensure cartId is valid
    if (!cartId || cartId <= 0) {
        console.error('Invalid cart ID:', cartId);
        alert('Invalid cart item. Please refresh the page.');
        return;
    }
    
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
    
    const countElement = document.getElementById('cart-count');
    if (!countElement) {
        console.warn('Cart count element not found');
        return;
    }
    
    if (!currentUser || currentUser.is_admin) {
        countElement.textContent = '0';
        return;
    }
    
    try {
        const cartData = await apiCall('/cart');
        console.log('Cart count data:', cartData);
        
        const count = cartData && cartData.items ? 
            cartData.items.reduce((total, item) => total + parseInt(item.quantity || 0), 0) : 0;
        
        countElement.textContent = count.toString();
        console.log('Cart count updated to:', count);
    } catch (error) {
        console.error('Error updating cart count:', error);
        countElement.textContent = '0';
    }
}

// FIXED CHECKOUT FUNCTION with better error handling
async function checkout() {
    console.log('=== STARTING CHECKOUT PROCESS ===');
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
        alert('Please login to checkout');
        return;
    }
    
    if (currentUser.is_admin) {
        alert('Admin users cannot place orders');
        return;
    }
    
    // Verify cart has items before confirming
    try {
        console.log('Checking cart contents before checkout...');
        const cartCheck = await apiCall('/cart');
        console.log('Cart check result:', cartCheck);
        
        if (!cartCheck || !cartCheck.items || cartCheck.items.length === 0) {
            alert('Your cart is empty. Add some items before checking out.');
            return;
        }
        
        console.log(`Cart contains ${cartCheck.items.length} items`);
    } catch (error) {
        console.error('Error checking cart before checkout:', error);
        alert('Error verifying cart contents. Please try again.');
        return;
    }
    
    if (!confirm('Are you sure you want to place this order?')) {
        console.log('User cancelled checkout');
        return;
    }
    
    // Disable checkout button to prevent double-clicks
    const checkoutBtn = document.getElementById('checkout-btn');
    const originalText = checkoutBtn ? checkoutBtn.textContent : 'Checkout';
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }
    
    try {
        console.log('Making checkout API call to /orders...');
        const result = await apiCall('/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Checkout result:', result);
        
        if (result && result.success) {
            const orderId = result.order_id;
            const totalAmount = parseFloat(result.total_amount || 0);
            
            console.log(`Order placed successfully! Order ID: ${orderId}, Total: $${totalAmount}`);
            
            // Show success message - Fixed Unicode character
            alert(`Order placed successfully!\nOrder #${orderId}\nTotal: $${totalAmount.toFixed(2)}`);
            
            // Clear cart display and show success
            const cartItems = document.getElementById('cart-items');
            const cartTotal = document.getElementById('cart-total');
            
            if (cartItems) {
                cartItems.innerHTML = `
                    <div class="checkout-success">
                        <h3>✅ Order Placed Successfully!</h3>
                        <p><strong>Order #${orderId}</strong></p>
                        <p><strong>Total: $${totalAmount.toFixed(2)}</strong></p>
                        <p>You can view your order status in the "My Orders" section.</p>
                        <div class="success-actions">
                            <button onclick="showSection('orders')" class="btn-primary">View My Orders</button>
                            <button onclick="showSection('products')" class="btn-secondary">Continue Shopping</button>
                        </div>
                    </div>
                `;
            }
            
            if (cartTotal) {
                cartTotal.innerHTML = '';
            }
            
            if (checkoutBtn) {
                checkoutBtn.style.display = 'none';
            }
            
            // Update cart count
            await updateCartCount();
            
        } else {
            console.error('Checkout failed:', result);
            const errorMessage = (result && result.message) ? result.message : 'Unknown error occurred';
            console.error('Error details:', errorMessage);
            alert('Checkout failed: ' + errorMessage);
        }
    } catch (error) {
        console.error('Checkout network error:', error);
        console.error('Error stack:', error.stack);
        
        // More specific error handling
        let errorMessage = 'Network error during checkout. Please try again.';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (error.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.status === 400) {
            errorMessage = 'Invalid checkout data. Please refresh the page and try again.';
        } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
        }
        
        alert(errorMessage);
    } finally {
        // Always re-enable checkout button
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = originalText;
        }
        console.log('=== CHECKOUT PROCESS COMPLETED ===');
    }
}

// Clear cart function with better error handling
async function clearCart() {
    if (!currentUser) {
        alert('Please login first.');
        return;
    }
    
    if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
    }
    
    try {
        // Get all cart items and remove them one by one
        const cartData = await apiCall('/cart');
        
        if (cartData && cartData.items && cartData.items.length > 0) {
            for (const item of cartData.items) {
                if (item.id) {
                    await apiCall(`/cart/${item.id}`, {
                        method: 'DELETE'
                    });
                }
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

// Enhanced Debug function for cart
function debugCart() {
    console.log('=== CART DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('Cart items element:', document.getElementById('cart-items'));
    console.log('Cart total element:', document.getElementById('cart-total'));
    console.log('Checkout button:', document.getElementById('checkout-btn'));
    console.log('API_BASE:', window.API_BASE);
    
    // Test cart API
    if (currentUser && !currentUser.is_admin) {
        console.log('Testing cart API...');
        apiCall('/cart')
            .then(data => {
                console.log('Cart API test successful:', data);
                console.log('Items in cart:', data.items ? data.items.length : 0);
            })
            .catch(error => {
                console.error('Cart API test failed:', error);
            });
            
        // Test checkout API endpoint (without actually placing order)
        console.log('API Base URL for checkout:', `${window.API_BASE || ''}/orders`);
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
    if (checkoutBtn && !checkoutBtn.hasAttribute('data-listener')) {
        checkoutBtn.addEventListener('click', checkout);
        checkoutBtn.setAttribute('data-listener', 'true');
    }
    
    // Initialize cart count if user is logged in
    if (typeof currentUser !== 'undefined' && currentUser) {
        updateCartCount();
    }
});

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.addToCart = addToCart;
    window.loadCart = loadCart;
    window.updateCartCount = updateCartCount;
    window.checkout = checkout;
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
    window.clearCart = clearCart;
}