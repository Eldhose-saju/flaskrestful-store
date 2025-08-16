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
                    <th>Actions</th>
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
                <td>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" ${order.status === 'cancelled' ? 'disabled' : ''}>
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button onclick="viewOrderDetails(${order.id})">View Details</button>
                    ${order.status === 'pending' ? `<button class="btn-danger" onclick="cancelOrder(${order.id})">Cancel</button>` : ''}
                </td>
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
        <div style="margin-bottom: 1rem;">
            <button class="btn-primary" onclick="showCreateUserForm()">Create New User</button>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const isCurrentUser = user.id === currentUser.id;
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.is_admin ? 'Yes' : 'No'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="editUser(${user.id})">Edit</button>
                    ${!isCurrentUser ? `<button class="btn-danger" onclick="deleteUser(${user.id})">Delete</button>` : '<span class="text-muted">Current User</span>'}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
    const result = await apiCall(`/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
    });
    
    if (result.success) {
        alert('Order status updated successfully!');
        loadAdminOrders();
    } else {
        alert('Error updating order status: ' + result.message);
        loadAdminOrders(); // Refresh to reset the dropdown
    }
}

async function viewOrderDetails(orderId) {
    const order = await apiCall(`/orders/${orderId}`);
    
    let itemsHtml = '<h4>Order Items:</h4><ul>';
    if (order.items) {
        order.items.forEach(item => {
            itemsHtml += `<li>${item.name} - Quantity: ${item.quantity}, Price: $${item.price}</li>`;
        });
    }
    itemsHtml += '</ul>';
    
    const orderInfo = `
        <h3>Order #${order.id}</h3>
        <p><strong>Customer:</strong> ${order.username || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total:</strong> $${order.total_amount}</p>
        ${itemsHtml}
    `;
    
    alert(orderInfo); // You can replace this with a proper modal
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    const result = await apiCall(`/orders/${orderId}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        alert('Order cancelled successfully!');
        loadAdminOrders();
    } else {
        alert('Error cancelling order: ' + result.message);
    }
}

// User Management Functions
function showCreateUserForm() {
    const username = prompt('Enter username:');
    if (!username) return;
    
    const email = prompt('Enter email:');
    if (!email) return;
    
    const password = prompt('Enter password:');
    if (!password) return;
    
    const isAdmin = confirm('Make this user an admin?');
    
    createUser(username, email, password, isAdmin);
}

async function createUser(username, email, password, isAdmin) {
    const result = await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify({
            username: username,
            email: email,
            password: password,
            is_admin: isAdmin
        })
    });
    
    if (result.success) {
        alert('User created successfully!');
        loadAdminUsers();
    } else {
        alert('Error creating user: ' + result.message);
    }
}

async function editUser(userId) {
    const user = await apiCall(`/users/${userId}`);
    
    const newUsername = prompt('Enter new username:', user.username);
    if (newUsername === null) return; // User cancelled
    
    const newEmail = prompt('Enter new email:', user.email);
    if (newEmail === null) return;
    
    const changePassword = confirm('Do you want to change the password?');
    let newPassword = null;
    if (changePassword) {
        newPassword = prompt('Enter new password:');
        if (!newPassword) return;
    }
    
    const isAdmin = confirm('Should this user be an admin?');
    
    const updateData = {
        username: newUsername,
        email: newEmail,
        is_admin: isAdmin
    };
    
    if (newPassword) {
        updateData.password = newPassword;
    }
    
    const result = await apiCall(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
    });
    
    if (result.success) {
        alert('User updated successfully!');
        loadAdminUsers();
    } else {
        alert('Error updating user: ' + result.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their orders and cart items.')) return;
    
    const result = await apiCall(`/users/${userId}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        alert('User deleted successfully!');
        loadAdminUsers();
    } else {
        alert('Error deleting user: ' + result.message);
    }
}

// Product Modal Functions (existing code)
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