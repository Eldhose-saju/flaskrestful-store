// Main Application Logic with Admin Restrictions

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    updateCartCount();
});

function showSection(sectionName) {
    // Admin users can only access admin section
    if (currentUser && currentUser.is_admin && sectionName !== 'admin') {
        alert('Admin users can only access the Admin panel');
        sectionName = 'admin';
    }
    
    // Regular users cannot access admin section
    if (currentUser && !currentUser.is_admin && sectionName === 'admin') {
        alert('Access denied: Admin privileges required');
        sectionName = 'products';
    }
    
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
    const isRegularUser = currentUser && !currentUser.is_admin;
    
    // Always show login/logout
    document.getElementById('login-btn').classList.toggle('hidden', isLoggedIn);
    document.getElementById('logout-btn').classList.toggle('hidden', !isLoggedIn);
    
    if (isAdmin) {
        // Admin UI - only show admin button and hide all user features
        document.getElementById('home-btn').classList.add('hidden');
        document.getElementById('cart-btn').classList.add('hidden');
        document.getElementById('orders-btn').classList.add('hidden');
        document.getElementById('admin-btn').classList.remove('hidden');
        
        document.getElementById('user-info').textContent = `Admin: ${currentUser.username}`;
        document.getElementById('user-info').classList.remove('hidden');
        
        showSection('admin');
    } else if (isRegularUser) {
        // Regular user UI - show user features, hide admin
        document.getElementById('home-btn').classList.remove('hidden');
        document.getElementById('cart-btn').classList.remove('hidden');
        document.getElementById('orders-btn').classList.remove('hidden');
        document.getElementById('admin-btn').classList.add('hidden');
        
        document.getElementById('user-info').textContent = `Welcome, ${currentUser.username}`;
        document.getElementById('user-info').classList.remove('hidden');
        
        showSection('products');
    } else {
        // Not logged in - hide all user/admin features
        document.getElementById('home-btn').classList.remove('hidden');
        document.getElementById('cart-btn').classList.add('hidden');
        document.getElementById('orders-btn').classList.add('hidden');
        document.getElementById('admin-btn').classList.add('hidden');
        document.getElementById('user-info').classList.add('hidden');
        
        showSection('auth');
    }
}