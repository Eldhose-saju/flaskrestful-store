// Enhanced Admin Functions - Consistent with codebase patterns
function switchAdminTab(tab) {
    console.log('Switching admin tab to:', tab);
    
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Hide all admin sections
    document.getElementById('admin-products').classList.toggle('hidden', tab !== 'products');
    document.getElementById('admin-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('admin-users').classList.toggle('hidden', tab !== 'users');
    
    // Load data for active tab
    if (tab === 'products') loadAdminProducts();
    else if (tab === 'orders') loadAdminOrders();
    else if (tab === 'users') loadAdminUsers();
}

async function loadAdminData() {
    console.log('Loading admin data...');
    console.log('Current user:', currentUser);
    
    if (!currentUser || !currentUser.is_admin) {
        console.log('User is not admin, redirecting...');
        alert('Admin access required');
        showSection('products');
        return;
    }
    
    // Load products by default
    loadAdminProducts();
}

async function loadAdminProducts() {
    console.log('Loading admin products...');
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Admin access required for product management');
        return;
    }
    
    try {
        const result = await apiCall('/products?sort=newest');
        const products = result.products || result; // Handle both response formats
        const container = document.getElementById('admin-products-list');
        
        if (!container) {
            console.error('Admin products container not found');
            return;
        }
        
        displayAdminProducts(products, container);
        
    } catch (error) {
        console.error('Error loading admin products:', error);
        const container = document.getElementById('admin-products-list');
        if (container) {
            container.innerHTML = '<div class="error">Error loading products. Please try again.</div>';
        }
    }
}

function displayAdminProducts(products, container) {
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-data">No products found</div>';
        return;
    }
    
    let html = `
        <div class="admin-stats">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${products.length}</span>
                    <span class="stat-label">Total Products</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${products.filter(p => p.stock > 0).length}</span>
                    <span class="stat-label">In Stock</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${products.filter(p => p.featured).length}</span>
                    <span class="stat-label">Featured</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${products.filter(p => p.stock === 0).length}</span>
                    <span class="stat-label">Out of Stock</span>
                </div>
            </div>
        </div>
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product Details</th>
                        <th>Category/Brand</th>
                        <th>Price</th>
                        <th>Stock Status</th>
                        <th>Featured</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    products.forEach(product => {
        const stockClass = product.stock === 0 ? 'out-of-stock' : product.stock < 10 ? 'low-stock' : 'in-stock';
        const stockText = product.stock === 0 ? 'Out of Stock' : product.stock < 10 ? `Low (${product.stock})` : `${product.stock} units`;
        
        html += `
            <tr class="product-row">
                <td class="product-id">${product.id}</td>
                <td class="product-details">
                    <div class="product-name">${product.name}</div>
                    ${product.description ? `<div class="product-description">${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}</div>` : ''}
                </td>
                <td class="product-meta">
                    <div class="product-category">${product.category || '-'}</div>
                    <div class="product-brand">${product.brand || '-'}</div>
                </td>
                <td class="product-price">$${parseFloat(product.price).toFixed(2)}</td>
                <td class="product-stock">
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </td>
                <td class="product-featured">
                    ${product.featured ? '<span class="featured-badge">⭐ Featured</span>' : '<span class="not-featured">-</span>'}
                </td>
                <td class="product-actions">
                    <div class="action-buttons">
                        <button onclick="editProduct(${product.id})" class="btn-small btn-primary" title="Edit Product">
                            <i class="icon-edit">✏️</i> Edit
                        </button>
                        <button class="btn-danger btn-small" onclick="deleteProduct(${product.id})" title="Delete Product">
                            <i class="icon-delete">🗑️</i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function loadAdminOrders() {
    console.log('Loading admin orders...');
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Admin access required for order management');
        return;
    }
    
    try {
        const orders = await apiCall('/orders');
        const container = document.getElementById('admin-orders-list');
        
        if (!container) {
            console.error('Admin orders container not found');
            return;
        }
        
        displayAdminOrders(orders, container);
        
    } catch (error) {
        console.error('Error loading admin orders:', error);
        const container = document.getElementById('admin-orders-list');
        if (container) {
            container.innerHTML = '<div class="error">Error loading orders. Please try again.</div>';
        }
    }
}

function displayAdminOrders(orders, container) {
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-data">No orders found</div>';
        return;
    }
    
    const statusCounts = {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
    };
    
    let html = `
        <div class="admin-stats">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${orders.length}</span>
                    <span class="stat-label">Total Orders</span>
                </div>
                <div class="stat-item status-pending">
                    <span class="stat-number">${statusCounts.pending}</span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="stat-item status-processing">
                    <span class="stat-number">${statusCounts.processing}</span>
                    <span class="stat-label">Processing</span>
                </div>
                <div class="stat-item status-delivered">
                    <span class="stat-number">${statusCounts.delivered}</span>
                    <span class="stat-label">Delivered</span>
                </div>
            </div>
        </div>
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date & Time</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString();
        const formattedTime = orderDate.toLocaleTimeString();
        
        html += `
            <tr class="order-row">
                <td class="order-id">#${order.id}</td>
                <td class="order-customer">
                    <div class="customer-name">${order.username || 'N/A'}</div>
                </td>
                <td class="order-date">
                    <div class="date">${formattedDate}</div>
                    <div class="time">${formattedTime}</div>
                </td>
                <td class="order-total">$${parseFloat(order.total_amount).toFixed(2)}</td>
                <td class="order-status">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" 
                            ${order.status === 'cancelled' || order.status === 'delivered' ? 'disabled' : ''}
                            class="status-select status-${order.status}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td class="order-actions">
                    <div class="action-buttons">
                        <button onclick="viewOrderDetails(${order.id})" class="btn-small btn-primary" title="View Details">
                            <i class="icon-view">👁️</i> View
                        </button>
                        ${order.status === 'pending' ? `<button class="btn-danger btn-small" onclick="cancelOrder(${order.id})" title="Cancel Order"><i class="icon-cancel">❌</i> Cancel</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function loadAdminUsers() {
    console.log('Loading admin users...');
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Admin access required for user management');
        return;
    }
    
    try {
        const users = await apiCall('/users');
        const container = document.getElementById('admin-users-list');
        
        if (!container) {
            console.error('Admin users container not found');
            return;
        }
        
        displayAdminUsers(users, container);
        
    } catch (error) {
        console.error('Error loading admin users:', error);
        const container = document.getElementById('admin-users-list');
        if (container) {
            container.innerHTML = '<div class="error">Error loading users. Please try again.</div>';
        }
    }
}

function displayAdminUsers(users, container) {
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="no-data">No users found</div>';
        return;
    }
    
    const adminCount = users.filter(u => u.is_admin).length;
    const regularCount = users.filter(u => !u.is_admin).length;
    
    let html = `
        <div class="admin-actions">
            <button class="btn-primary" onclick="showCreateUserModal()">
                <i class="icon-add">➕</i> Create New User
            </button>
        </div>
        <div class="admin-stats">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${users.length}</span>
                    <span class="stat-label">Total Users</span>
                </div>
                <div class="stat-item admin-role">
                    <span class="stat-number">${adminCount}</span>
                    <span class="stat-label">Admins</span>
                </div>
                <div class="stat-item user-role">
                    <span class="stat-number">${regularCount}</span>
                    <span class="stat-label">Regular Users</span>
                </div>
            </div>
        </div>
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User Details</th>
                        <th>Role</th>
                        <th>Join Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    users.forEach(user => {
        const isCurrentUser = user.id === currentUser.id;
        const joinDate = new Date(user.created_at).toLocaleDateString();
        
        html += `
            <tr class="user-row ${isCurrentUser ? 'current-user' : ''}">
                <td class="user-id">${user.id}</td>
                <td class="user-details">
                    <div class="user-name">${user.username}</div>
                    <div class="user-email">${user.email}</div>
                </td>
                <td class="user-role">
                    <span class="role-badge ${user.is_admin ? 'admin-role' : 'user-role'}">
                        ${user.is_admin ? '👑 Admin' : '👤 User'}
                    </span>
                </td>
                <td class="user-joined">${joinDate}</td>
                <td class="user-actions">
                    <div class="action-buttons">
                        <button onclick="editUser(${user.id})" class="btn-small btn-primary" title="Edit User">
                            <i class="icon-edit">✏️</i> Edit
                        </button>
                        ${!isCurrentUser ? 
                            `<button class="btn-danger btn-small" onclick="deleteUser(${user.id})" title="Delete User">
                                <i class="icon-delete">🗑️</i> Delete
                            </button>` : 
                            '<span class="current-user-label">Current User</span>'
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Enhanced Product Modal Functions
function showAddProductForm() {
    console.log('Showing add product form');
    editingProductId = null;
    
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    
    if (title) title.textContent = 'Add New Product';
    
    // Clear all form fields
    clearProductForm();
    
    if (modal) modal.classList.remove('hidden');
}

function clearProductForm() {
    const fields = [
        'product-name', 'product-description', 'product-price', 
        'product-stock', 'product-category', 'product-brand', 
        'product-tags', 'product-image-url'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const featuredCheckbox = document.getElementById('product-featured');
    if (featuredCheckbox) featuredCheckbox.checked = false;
    
    const errorDiv = document.getElementById('product-modal-error');
    if (errorDiv) errorDiv.textContent = '';
}

function editProduct(productId) {
    console.log('Editing product:', productId);
    
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        alert('Product not found');
        return;
    }
    
    editingProductId = productId;
    const title = document.getElementById('product-modal-title');
    if (title) title.textContent = `Edit Product: ${product.name}`;
    
    // Fill form with product data
    const fieldMappings = {
        'product-name': product.name,
        'product-description': product.description || '',
        'product-price': product.price,
        'product-stock': product.stock,
        'product-category': product.category || '',
        'product-brand': product.brand || '',
        'product-tags': product.tags || '',
        'product-image-url': product.image_url || ''
    };
    
    Object.entries(fieldMappings).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) field.value = value;
    });
    
    const featuredCheckbox = document.getElementById('product-featured');
    if (featuredCheckbox) featuredCheckbox.checked = product.featured || false;
    
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('hidden');
}

async function saveProduct() {
    console.log('Saving product...', editingProductId ? 'Editing' : 'Creating');
    
    const productData = {
        name: document.getElementById('product-name')?.value.trim(),
        description: document.getElementById('product-description')?.value.trim(),
        price: parseFloat(document.getElementById('product-price')?.value),
        stock: parseInt(document.getElementById('product-stock')?.value),
        category: document.getElementById('product-category')?.value.trim(),
        brand: document.getElementById('product-brand')?.value.trim(),
        tags: document.getElementById('product-tags')?.value.trim(),
        image_url: document.getElementById('product-image-url')?.value.trim(),
        featured: document.getElementById('product-featured')?.checked || false
    };
    
    console.log('Product data:', productData);
    
    // Enhanced validation
    const validationErrors = validateProductData(productData);
    if (validationErrors.length > 0) {
        showProductModalError(validationErrors.join('<br>'));
        return;
    }
    
    // Show loading state
    const saveButton = document.querySelector('#product-modal .btn-primary');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
    }
    
    try {
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
        
        console.log('Save product result:', result);
        
        if (result.success) {
            closeProductModal();
            await loadAdminProducts();
            await loadProducts(); // Refresh products view if visible
            
            const message = editingProductId ? 'Product updated successfully!' : 'Product created successfully!';
            showSuccessMessage(message);
        } else {
            showProductModalError(result.message || 'Error saving product');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showProductModalError('Network error. Please try again.');
    } finally {
        // Reset button state
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = editingProductId ? 'Update Product' : 'Create Product';
        }
    }
}

function validateProductData(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 2) {
        errors.push('Product name must be at least 2 characters long');
    }
    
    if (!data.price || data.price <= 0) {
        errors.push('Price must be greater than 0');
    }
    
    if (data.stock === undefined || data.stock < 0) {
        errors.push('Stock must be 0 or greater');
    }
    
    if (data.price > 99999.99) {
        errors.push('Price cannot exceed $99,999.99');
    }
    
    if (data.stock > 999999) {
        errors.push('Stock cannot exceed 999,999 units');
    }
    
    return errors;
}

function showProductModalError(message) {
    const errorDiv = document.getElementById('product-modal-error');
    if (errorDiv) {
        errorDiv.innerHTML = message;
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
    
    const errorDiv = document.getElementById('product-modal-error');
    if (errorDiv) errorDiv.textContent = '';
    
    editingProductId = null;
}

async function deleteProduct(productId) {
    console.log('Deleting product:', productId);
    
    const product = allProducts.find(p => p.id === productId);
    const productName = product ? product.name : `Product #${productId}`;
    
    if (!confirm(`Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone and will affect any existing orders containing this product.`)) {
        return;
    }
    
    try {
        const result = await apiCall(`/products/${productId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete product result:', result);
        
        if (result.success) {
            showSuccessMessage(`Product "${productName}" deleted successfully!`);
            await loadAdminProducts();
            await loadProducts(); // Refresh products view if visible
        } else {
            alert('Error deleting product: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Network error. Please try again.');
    }
}

// Enhanced Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
    console.log('Updating order status:', orderId, newStatus);
    
    if (!newStatus) return;
    
    try {
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        console.log('Update order status result:', result);
        
        if (result.success) {
            showSuccessMessage('Order status updated successfully!');
            await loadAdminOrders();
        } else {
            alert('Error updating order status: ' + result.message);
            await loadAdminOrders(); // Refresh to reset the dropdown
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Network error. Please try again.');
        await loadAdminOrders();
    }
}

async function viewOrderDetails(orderId) {
    console.log('Viewing order details:', orderId);
    
    try {
        const order = await apiCall(`/orders/${orderId}`);
        console.log('Order details:', order);
        
        showOrderDetailsModal(order);
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Error loading order details. Please try again.');
    }
}

function showOrderDetailsModal(order) {
    // Remove existing modal if any
    const existingModal = document.getElementById('order-details-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'order-details-modal';
    modal.className = 'modal';
    
    const orderDate = new Date(order.created_at).toLocaleString();
    const customerName = order.username || 'Unknown Customer';
    
    let itemsHtml = '<div class="order-items-section"><h4>Order Items:</h4>';
    
    if (order.items && order.items.length > 0) {
        itemsHtml += '<div class="order-items-table-container">';
        itemsHtml += '<table class="order-items-table">';
        itemsHtml += '<thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>';
        
        order.items.forEach(item => {
            const itemTotal = item.quantity * item.price;
            itemsHtml += `
                <tr>
                    <td class="item-product">${item.product_name || item.name || 'Unknown Product'}</td>
                    <td class="item-quantity">${item.quantity}</td>
                    <td class="item-price">$${parseFloat(item.price).toFixed(2)}</td>
                    <td class="item-total">$${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        });
        itemsHtml += '</tbody></table></div>';
    } else {
        itemsHtml += '<div class="no-items">No items found for this order</div>';
    }
    itemsHtml += '</div>';
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeOrderDetailsModal()"></div>
        <div class="modal-content order-details-modal">
            <div class="modal-header">
                <h3>Order Details #${order.id}</h3>
                <button class="modal-close" onclick="closeOrderDetailsModal()" title="Close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="order-summary">
                    <div class="order-info-grid">
                        <div class="info-item">
                            <label>Customer:</label>
                            <span>${customerName}</span>
                        </div>
                        <div class="info-item">
                            <label>Order Date:</label>
                            <span>${orderDate}</span>
                        </div>
                        <div class="info-item">
                            <label>Status:</label>
                            <span class="status-badge status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                        </div>
                        <div class="info-item">
                            <label>Total Amount:</label>
                            <span class="order-total-amount">$${parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                ${itemsHtml}
            </div>
            <div class="modal-footer">
                <button onclick="closeOrderDetailsModal()" class="btn-secondary">Close</button>
                ${order.status === 'pending' ? 
                    `<button onclick="cancelOrderFromModal(${order.id})" class="btn-danger">Cancel Order</button>` : 
                    ''
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add escape key listener
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeOrderDetailsModal();
        }
    };
    
    document.addEventListener('keydown', handleEscape);
    modal.handleEscape = handleEscape; // Store reference for cleanup
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        if (modal.handleEscape) {
            document.removeEventListener('keydown', modal.handleEscape);
        }
        modal.remove();
    }
}

async function cancelOrder(orderId) {
    console.log('Canceling order:', orderId);
    
    if (!confirm('Are you sure you want to cancel this order?\n\nStock will be restored and this action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        console.log('Cancel order result:', result);
        
        if (result.success) {
            showSuccessMessage('Order cancelled successfully! Stock has been restored.');
            await loadAdminOrders();
        } else {
            alert('Error cancelling order: ' + result.message);
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Network error. Please try again.');
    }
}

async function cancelOrderFromModal(orderId) {
    await cancelOrder(orderId);
    closeOrderDetailsModal();
}

// Enhanced User Management Functions
function showCreateUserModal() {
    console.log('Showing create user modal');
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('create-user-modal');
    if (!modal) {
        modal = createUserModal();
        document.body.appendChild(modal);
    }
    
    // Clear form
    clearUserForm();
    
    const title = modal.querySelector('.modal-title');
    if (title) title.textContent = 'Create New User';
    
    modal.classList.remove('hidden');
}

function createUserModal() {
    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.className = 'modal hidden';
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeUserModal()"></div>
        <div class="modal-content user-modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Create New User</h3>
                <button class="modal-close" onclick="closeUserModal()" title="Close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="user-form" onsubmit="handleUserSubmit(event)">
                    <div class="form-group">
                        <label for="user-username">Username *</label>
                        <input type="text" id="user-username" required minlength="3" maxlength="50" placeholder="Enter username">
                    </div>
                    <div class="form-group">
                        <label for="user-email">Email *</label>
                        <input type="email" id="user-email" required placeholder="Enter email address">
                    </div>
                    <div class="form-group">
                        <label for="user-password">Password *</label>
                        <input type="password" id="user-password" required minlength="6" placeholder="Enter password">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="user-is-admin"> Make this user an admin
                        </label>
                    </div>
                </form>
                <div id="user-modal-error" class="error hidden"></div>
            </div>
            <div class="modal-footer">
                <button onclick="closeUserModal()" class="btn-secondary">Cancel</button>
                <button onclick="saveUser()" class="btn-primary">Create User</button>
            </div>
        </div>
    `;
    
    return modal;
}

function clearUserForm() {
    const fields = ['user-username', 'user-email', 'user-password'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const adminCheckbox = document.getElementById('user-is-admin');
    if (adminCheckbox) adminCheckbox.checked = false;
    
    const errorDiv = document.getElementById('user-modal-error');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    }
}

function closeUserModal() {
    const modal = document.getElementById('create-user-modal');
    if (modal) {
        modal.classList.add('hidden');
        clearUserForm();
    }
}

function handleUserSubmit(event) {
    event.preventDefault();
    saveUser();
}

async function saveUser() {
    console.log('Saving user...');
    
    const userData = {
        username: document.getElementById('user-username')?.value.trim(),
        email: document.getElementById('user-email')?.value.trim(),
        password: document.getElementById('user-password')?.value,
        is_admin: document.getElementById('user-is-admin')?.checked || false
    };
    
    console.log('User data:', { ...userData, password: '***' });
    
    // Validate
    const validationErrors = validateUserData(userData);
    if (validationErrors.length > 0) {
        showUserModalError(validationErrors.join('<br>'));
        return;
    }
    
    // Show loading state
    const saveButton = document.querySelector('#create-user-modal .btn-primary');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Creating...';
    }
    
    try {
        const result = await apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        console.log('Save user result:', result);
        
        if (result.success) {
            closeUserModal();
            await loadAdminUsers();
            showSuccessMessage(`User "${userData.username}" created successfully!`);
        } else {
            showUserModalError(result.message || 'Error creating user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showUserModalError('Network error. Please try again.');
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Create User';
        }
    }
}

function validateUserData(data) {
    const errors = [];
    
    if (!data.username || data.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
    }
    
    if (!data.email || !data.email.includes('@')) {
        errors.push('Please enter a valid email address');
    }
    
    if (!data.password || data.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    
    return errors;
}

function showUserModalError(message) {
    const errorDiv = document.getElementById('user-modal-error');
    if (errorDiv) {
        errorDiv.innerHTML = message;
        errorDiv.classList.remove('hidden');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function editUser(userId) {
    console.log('Editing user:', userId);
    
    try {
        const user = await apiCall(`/users/${userId}`);
        console.log('User data for editing:', user);
        
        // Simple prompt-based editing (can be enhanced with modal later)
        const newUsername = prompt('Enter new username:', user.username);
        if (newUsername === null) return; // User cancelled
        
        const newEmail = prompt('Enter new email:', user.email);
        if (newEmail === null) return;
        
        const changePassword = confirm('Do you want to change the password?');
        let newPassword = null;
        if (changePassword) {
            newPassword = prompt('Enter new password:');
            if (!newPassword) {
                alert('Password cannot be empty');
                return;
            }
        }
        
        const makeAdmin = confirm(`Should "${user.username}" be an admin?`);
        
        const updateData = {
            username: newUsername.trim(),
            email: newEmail.trim(),
            is_admin: makeAdmin
        };
        
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        console.log('Updating user with data:', { ...updateData, password: updateData.password ? '***' : undefined });
        
        const result = await apiCall(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        console.log('Update user result:', result);
        
        if (result.success) {
            showSuccessMessage('User updated successfully!');
            await loadAdminUsers();
        } else {
            alert('Error updating user: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Network error. Please try again.');
    }
}

async function deleteUser(userId) {
    console.log('Deleting user:', userId);
    
    if (!confirm('Are you sure you want to delete this user?\n\nThis will also delete all their orders and cart items. This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiCall(`/users/${userId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete user result:', result);
        
        if (result.success) {
            showSuccessMessage('User deleted successfully!');
            await loadAdminUsers();
        } else {
            alert('Error deleting user: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Network error. Please try again.');
    }
}

// Utility Functions
function showSuccessMessage(message) {
    // Create temporary success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Enhanced error handling for admin functions
function handleAdminError(error, context = '') {
    console.error(`Admin error ${context}:`, error);
    
    let message = 'An unexpected error occurred';
    if (error.message) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }
    
    // Show user-friendly error
    alert(`${context ? context + ': ' : ''}${message}`);
}

// Debug functions for admin panel
function debugAdminPanel() {
    console.log('=== ADMIN PANEL DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('All products:', allProducts);
    console.log('Admin sections:');
    console.log('  - Products section:', document.getElementById('admin-products'));
    console.log('  - Orders section:', document.getElementById('admin-orders'));
    console.log('  - Users section:', document.getElementById('admin-users'));
    console.log('  - Product modal:', document.getElementById('product-modal'));
    
    if (currentUser && currentUser.is_admin) {
        console.log('Admin access confirmed - testing API endpoints...');
        
        // Test products API
        apiCall('/products')
            .then(result => console.log('Products API test:', result))
            .catch(err => console.error('Products API test failed:', err));
            
        // Test orders API
        apiCall('/orders')
            .then(result => console.log('Orders API test:', result))
            .catch(err => console.error('Orders API test failed:', err));
            
        // Test users API
        apiCall('/users')
            .then(result => console.log('Users API test:', result))
            .catch(err => console.error('Users API test failed:', err));
    } else {
        console.log('User is not admin or not logged in');
    }
}

// Make debug function available globally
window.debugAdminPanel = debugAdminPanel;

// Keyboard shortcuts for admin functions
document.addEventListener('keydown', function(e) {
    // Only enable shortcuts when admin panel is visible and user is admin
    if (!currentUser || !currentUser.is_admin) return;
    
    const adminSection = document.getElementById('admin-section');
    if (!adminSection || adminSection.classList.contains('hidden')) return;
    
    // Ctrl/Cmd + N = New Product
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddProductForm();
    }
    
    // Escape = Close modals
    if (e.key === 'Escape') {
        const productModal = document.getElementById('product-modal');
        const userModal = document.getElementById('create-user-modal');
        const orderModal = document.getElementById('order-details-modal');
        
        if (productModal && !productModal.classList.contains('hidden')) {
            closeProductModal();
        } else if (userModal && !userModal.classList.contains('hidden')) {
            closeUserModal();
        } else if (orderModal) {
            closeOrderDetailsModal();
        }
    }
});