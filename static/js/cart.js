// Cart Functions
async function addToCart(productId) {
    if (!currentUser) {
        alert('Please login to add items to cart');
        showSection('auth');
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
        
        if (result.success) {
            loadCart();
            updateCartCount();
            alert('Item added to cart!');
        } else {
            console.error('Failed to add to cart:', result.message);
            if (result.message === 'Login required') {
                alert('Session expired. Please login again.');
                showSection('auth');
            } else {
                alert('Error adding to cart: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
}

async function loadCart() {
    if (!currentUser) return;
    
    const cartItems = await apiCall('/cart');
    currentCart = cartItems;
    displayCart(cartItems);
    updateCartCount();
}

function displayCart(cartItems) {
    const container = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total');
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p>Your cart is empty</p>';
        totalContainer.innerHTML = '';
        return;
    }
    
    let total = 0;
    container.innerHTML = '';
    
    cartItems.forEach(item => {
        const itemTotal = item.quantity * item.price;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <p>Price: $${item.price}</p>
            </div>
            <div class="cart-controls">
                <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" 
                       onchange="updateCartQuantity(${item.id}, this.value)" min="1">
                <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                <span>$${itemTotal.toFixed(2)}</span>
                <button class="btn-danger" onclick="removeFromCart(${item.id})">Remove</button>
            </div>
        `;
        container.appendChild(cartItem);
    });
    
    totalContainer.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
}

async function updateCartQuantity(cartId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(cartId);
        return;
    }
    
    await apiCall(`/cart/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify({
            quantity: parseInt(newQuantity)
        })
    });
    
    loadCart();
}

async function removeFromCart(cartId) {
    await apiCall(`/cart/${cartId}`, {
        method: 'DELETE'
    });
    
    loadCart();
}

function updateCartCount() {
    const count = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

async function checkout() {
    const result = await apiCall('/orders', {
        method: 'POST'
    });
    
    if (result.success) {
        alert('Order placed successfully!');
        loadCart();
        showSection('orders');
    } else {
        alert('Error placing order: ' + result.message);
    }
}