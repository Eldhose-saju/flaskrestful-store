// Main Application Logic

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadProducts();
    updateCartCount();
});

function showSection(sectionName) {
    const sections = ['auth', 'products', 'cart', 'orders', 'admin'];
    sections.forEach(section => {
        document.getElementById(`${section}-section`).classList.add('hidden');
    });
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Load data for the section
    if (sectionName === 'products') loadProducts();
    else if (sectionName === 'cart') loadCart();
    else if (sectionName === 'orders') loadOrders();
    else if (sectionName === 'admin') loadAdminData();
}

function updateUI() {
    const isLoggedIn = currentUser !== null;
    const isAdmin = currentUser && currentUser.is_admin;
    
    document.getElementById('login-btn').classList.toggle('hidden', isLoggedIn);
    document.getElementById('logout-btn').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('cart-btn').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('orders-btn').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('admin-btn').classList.toggle('hidden', !isAdmin);
    
    if (isLoggedIn) {
        document.getElementById('user-info').textContent = `Welcome, ${currentUser.username}`;
        document.getElementById('user-info').classList.remove('hidden');
        showSection('products');
    } else {
        document.getElementById('user-info').classList.add('hidden');
    }
}