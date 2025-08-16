// Admin Functions
function switchAdminTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('admin-products').classList.toggle('hidden', tab !== 'products');
    document.getElementById('admin-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('admin-users').classList.toggle('hidden', tab !== 'users');
    
    if (tab === 'orders') loadAdminOrders();
    else if (tab === 'users') loadAdminUsers();
}

async function loadAdminData() {
    if (!currentUser || !currentUser.is_admin) return;
    
    loadAdminProducts();
}

async function loadAdminProducts() {
    const products = await apiCall('/products');
    const container = document.getElementById('admin-products-list');
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(product => {
        html += `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>$${product.price}</td>
                <td>${product.stock}</td>
                <td>${product.category}</td>
                <td>
                    <button onclick="editProduct(${product.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadAdminOrders() {
    const orders = await apiCall('/orders');
    const container = document.getElementById('admin-orders-list');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders found</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>User</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(order => {
        html += `
            <tr>
                <td>${order.id}</td>
                <td>${order.username || 'N/A'}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>$${order.total_amount}</td>
                <td>${order.status}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadAdminUsers() {
    const users = await apiCall('/users');
    const container = document.getElementById('admin-users-list');
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.is_admin ? 'Yes' : 'No'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Product Modal Functions
function showAddProductForm() {
    editingProductId = null;
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-name').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-modal').classList.remove('hidden');
}

async function saveProduct() {
    const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        category: document.getElementById('product-category').value
    };
    
    let result;
    if (editingProductId) {
        result = await apiCall(`/products/${editingProductId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    } else {
        result = await apiCall('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }
    
    if (result.success) {
        closeProductModal();
        loadAdminProducts();
        loadProducts();
    } else {
        document.getElementById('product-modal-error').textContent = result.message || 'Error saving product';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-modal-error').textContent = '';
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const result = await apiCall(`/products/${productId}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        loadAdminProducts();
        loadProducts();
    }
}