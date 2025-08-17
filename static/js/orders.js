// Enhanced Orders Functions with proper error handling and debugging
async function loadOrders() {
    console.log('Loading orders...');
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
        console.log('No user logged in, cannot load orders');
        return;
    }
    
    try {
        const orders = await apiCall('/orders');
        console.log('Orders loaded:', orders);
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-list').innerHTML = '<p class="error">Error loading orders. Please try again.</p>';
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-list');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>No orders found</p>';
        return;
    }
    
    let html = `
        <div class="orders-stats">
            <p>Total Orders: ${orders.length} | 
            Pending: ${orders.filter(o => o.status === 'pending').length} | 
            Delivered: ${orders.filter(o => o.status === 'delivered').length}</p>
        </div>
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    ${currentUser.is_admin ? '<th>Customer</th>' : ''}
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const canCancel = order.status === 'pending';
        
        html += `
            <tr>
                <td>#${order.id}</td>
                ${currentUser.is_admin ? `<td>${order.username || 'N/A'}</td>` : ''}
                <td>${orderDate}</td>
                <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td class="order-actions">
                    <button onclick="viewOrderDetails(${order.id})" class="btn-small btn-primary">View Details</button>
                    ${canCancel ? `<button class="btn-small btn-danger" onclick="cancelOrder(${order.id})">Cancel</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function viewOrderDetails(orderId) {
    console.log('Viewing order details for order ID:', orderId);
    
    try {
        const order = await apiCall(`/orders/${orderId}`);
        console.log('Order details received:', order);
        
        let itemsHtml = '<div class="order-items"><h4>Order Items:</h4>';
        
        if (order.items && order.items.length > 0) {
            itemsHtml += '<table class="order-items-table">';
            itemsHtml += '<thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>';
            
            order.items.forEach(item => {
                const itemTotal = item.quantity * item.price;
                itemsHtml += `
                    <tr>
                        <td><strong>${item.product_name || item.name || 'Unknown Product'}</strong></td>
                        <td>${item.quantity}</td>
                        <td>$${parseFloat(item.price).toFixed(2)}</td>
                        <td>$${itemTotal.toFixed(2)}</td>
                    </tr>
                `;
            });
            itemsHtml += '</tbody></table>';
        } else {
            itemsHtml += '<p>No items found for this order</p>';
        }
        itemsHtml += '</div>';
        
        showOrderModal(order, itemsHtml);
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Error loading order details. Please try again.');
    }
}

function showOrderModal(order, itemsHtml) {
    // Remove existing modal if any
    const existingModal = document.getElementById('order-details-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create new modal
    const modal = document.createElement('div');
    modal.id = 'order-details-modal';
    modal.className = 'modal';
    
    const orderDate = new Date(order.created_at).toLocaleString();
    const customerName = order.username || currentUser.username;
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeOrderModal()"></div>
        <div class="modal-content order-modal-content">
            <div class="modal-header">
                <h3>Order #${order.id}</h3>
                <button class="modal-close" onclick="closeOrderModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="order-info">
                    <div class="order-info-grid">
                        <div><strong>Customer:</strong> ${customerName}</div>
                        <div><strong>Order Date:</strong> ${orderDate}</div>
                        <div><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></div>
                        <div><strong>Total Amount:</strong> <span class="order-total">$${parseFloat(order.total_amount).toFixed(2)}</span></div>
                    </div>
                </div>
                ${itemsHtml}
            </div>
            <div class="modal-footer">
                <button onclick="closeOrderModal()" class="btn-secondary">Close</button>
                ${order.status === 'pending' ? `<button onclick="cancelOrderFromModal(${order.id})" class="btn-danger">Cancel Order</button>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
    });
}

function closeOrderModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        modal.remove();
    }
    
    // Remove escape key listener
    document.removeEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
    });
}

async function cancelOrder(orderId) {
    console.log('Canceling order:', orderId);
    
    if (!confirm('Are you sure you want to cancel this order? Stock will be restored and this action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('Making API call to cancel order...');
        
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        console.log('Cancel order result:', result);
        
        if (result.success) {
            alert('Order cancelled successfully! Stock has been restored.');
            loadOrders(); // Reload the orders list
            closeOrderModal(); // Close modal if open
        } else {
            console.error('Failed to cancel order:', result.message);
            alert('Error cancelling order: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Network error while cancelling order. Please try again.');
    }
}

// Cancel order from the modal
async function cancelOrderFromModal(orderId) {
    await cancelOrder(orderId);
}

// Alternative cancel method using PUT (for status updates)
async function cancelOrderViaPut(orderId) {
    console.log('Canceling order via PUT:', orderId);
    
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    try {
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'cancelled'
            })
        });
        
        if (result.success) {
            alert('Order cancelled successfully!');
            loadOrders();
            closeOrderModal();
        } else {
            alert('Error cancelling order: ' + result.message);
        }
    } catch (error) {
        console.error('Error cancelling order via PUT:', error);
        alert('Network error. Please try again.');
    }
}

// Debug function for orders
function debugOrders() {
    console.log('=== ORDERS DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('Orders section element:', document.getElementById('orders-section'));
    console.log('Orders list element:', document.getElementById('orders-list'));
    
    // Test API connectivity for orders
    console.log('Testing orders API...');
    if (currentUser) {
        apiCall('/orders')
            .then(orders => {
                console.log('Orders API test successful:', orders);
            })
            .catch(error => {
                console.error('Orders API test failed:', error);
            });
    } else {
        console.log('No user logged in - cannot test orders API');
    }
}

// Make debug function available globally
window.debugOrders = debugOrders;