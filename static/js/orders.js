// Enhanced Orders Functions with proper error handling and debugging
async function loadOrders() {
    console.log('Loading orders...');
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
        console.log('No user logged in, cannot load orders');
        const ordersListElement = document.getElementById('orders-list');
        if (ordersListElement) {
            ordersListElement.innerHTML = '<p>Please login to view your orders.</p>';
        }
        return;
    }
    
    try {
        console.log('Making API call to /orders...');
        const orders = await apiCall('/orders');
        console.log('Orders loaded:', orders);
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        const ordersListElement = document.getElementById('orders-list');
        if (ordersListElement) {
            ordersListElement.innerHTML = `
                <div class="error-message">
                    <h3>Error loading orders</h3>
                    <p>Failed to load orders: ${error.message}</p>
                    <button onclick="loadOrders()" class="btn-primary">Retry</button>
                </div>
            `;
        }
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-list');
    
    if (!container) {
        console.error('Orders list container not found!');
        return;
    }
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="no-orders">
                <h3>No orders found</h3>
                <p>You haven't placed any orders yet.</p>
                <button onclick="showSection('products')" class="btn-primary">Start Shopping</button>
            </div>
        `;
        return;
    }
    
    console.log(`Displaying ${orders.length} orders`);
    
    let html = `
        <div class="orders-stats">
            <div class="stats-summary">
                <span>Total Orders: <strong>${orders.length}</strong></span>
                <span>Pending: <strong>${orders.filter(o => o.status === 'pending').length}</strong></span>
                <span>Processing: <strong>${orders.filter(o => o.status === 'processing').length}</strong></span>
                <span>Shipped: <strong>${orders.filter(o => o.status === 'shipped').length}</strong></span>
                <span>Delivered: <strong>${orders.filter(o => o.status === 'delivered').length}</strong></span>
            </div>
        </div>
        <div class="orders-table-container">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        ${currentUser && currentUser.is_admin ? '<th>Customer</th>' : ''}
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    orders.forEach(order => {
        try {
            const orderDate = new Date(order.created_at).toLocaleDateString();
            const orderTime = new Date(order.created_at).toLocaleTimeString();
            const canCancel = order.status === 'pending';
            const statusClass = `status-${order.status}`;
            const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);
            
            html += `
                <tr class="order-row">
                    <td class="order-id">
                        <strong>#${order.id}</strong>
                    </td>
                    ${currentUser && currentUser.is_admin ? `
                        <td class="order-customer">${order.username || 'N/A'}</td>
                    ` : ''}
                    <td class="order-date">
                        <div class="date">${orderDate}</div>
                        <div class="time">${orderTime}</div>
                    </td>
                    <td class="order-total">
                        $${totalAmount}
                    </td>
                    <td class="order-status">
                        <span class="status-badge ${statusClass}">
                            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                    </td>
                    <td class="order-actions">
                        <div class="action-buttons">
                            <button onclick="viewOrderDetails(${order.id})" 
                                    class="btn-small btn-primary" 
                                    title="View Order Details">
                                <i class="icon-view">👁️</i> View Details
                            </button>
                            ${canCancel ? `
                                <button class="btn-small btn-danger" 
                                        onclick="cancelOrder(${order.id})" 
                                        title="Cancel Order">
                                    <i class="icon-cancel">❌</i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error('Error rendering order:', error, order);
            html += `
                <tr class="order-row error-row">
                    <td colspan="${currentUser && currentUser.is_admin ? '6' : '5'}" class="error">
                        Error displaying order #${order.id || 'unknown'}
                    </td>
                </tr>
            `;
        }
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    console.log(`Orders table rendered successfully with ${orders.length} orders`);
}

async function viewOrderDetails(orderId) {
    console.log('Viewing order details for order ID:', orderId);
    
    if (!orderId) {
        console.error('Invalid order ID:', orderId);
        alert('Invalid order ID');
        return;
    }
    
    // Show loading state
    showLoadingMessage('Loading order details...');
    
    try {
        console.log(`Making API call to /orders/${orderId}...`);
        const order = await apiCall(`/orders/${orderId}`);
        console.log('Order details received:', order);
        
        hideLoadingMessage();
        
        if (!order) {
            throw new Error('No order data received');
        }
        
        // Build items HTML with better error handling
        let itemsHtml = '<div class="order-items-section"><h4>Order Items:</h4>';
        
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            console.log(`Order has ${order.items.length} items`);
            
            itemsHtml += `
                <div class="order-items-table-container">
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            order.items.forEach((item, index) => {
                try {
                    console.log(`Processing item ${index + 1}:`, item);
                    
                    const productName = item.product_name || item.name || `Product #${item.product_id || 'unknown'}`;
                    const category = item.product_category || 'Unknown';
                    const quantity = parseInt(item.quantity || 0);
                    const unitPrice = parseFloat(item.price || 0);
                    const itemTotal = quantity * unitPrice;
                    
                    itemsHtml += `
                        <tr class="order-item-row">
                            <td class="item-product">
                                <strong>${escapeHtml(productName)}</strong>
                                ${item.product_brand ? `<br><small>Brand: ${escapeHtml(item.product_brand)}</small>` : ''}
                            </td>
                            <td class="item-category">${escapeHtml(category)}</td>
                            <td class="item-quantity">${quantity}</td>
                            <td class="item-price">$${unitPrice.toFixed(2)}</td>
                            <td class="item-total">$${itemTotal.toFixed(2)}</td>
                        </tr>
                    `;
                } catch (itemError) {
                    console.error(`Error processing item ${index + 1}:`, itemError, item);
                    itemsHtml += `
                        <tr class="order-item-row error-item">
                            <td colspan="5" class="error">Error displaying item details</td>
                        </tr>
                    `;
                }
            });
            
            itemsHtml += '</tbody></table></div>';
        } else {
            console.warn('No items found for this order');
            itemsHtml += '<div class="no-items">No items found for this order</div>';
        }
        
        itemsHtml += '</div>';
        
        showOrderModal(order, itemsHtml);
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        hideLoadingMessage();
        
        let errorMessage = 'Error loading order details.';
        if (error.message.includes('404')) {
            errorMessage = 'Order not found or you do not have permission to view it.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Please log in to view order details.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        alert(errorMessage + '\n\nTechnical details: ' + error.message);
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
    modal.className = 'modal order-details-modal';
    
    try {
        const orderDate = new Date(order.created_at).toLocaleString();
        const customerName = order.username || (currentUser ? currentUser.username : 'Unknown');
        const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);
        const statusClass = `status-${order.status}`;
        const statusText = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown';
        
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeOrderModal()"></div>
            <div class="modal-content order-modal-content">
                <div class="modal-header">
                    <h3>Order Details #${order.id}</h3>
                    <button class="modal-close" onclick="closeOrderModal()" title="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-summary-section">
                        <h4>Order Information</h4>
                        <div class="order-info-grid">
                            <div class="info-item">
                                <label>Order ID:</label>
                                <span>#${order.id}</span>
                            </div>
                            <div class="info-item">
                                <label>Customer:</label>
                                <span>${escapeHtml(customerName)}</span>
                            </div>
                            <div class="info-item">
                                <label>Order Date:</label>
                                <span>${orderDate}</span>
                            </div>
                            <div class="info-item">
                                <label>Status:</label>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="info-item">
                                <label>Total Amount:</label>
                                <span class="order-total-amount">$${totalAmount}</span>
                            </div>
                        </div>
                    </div>
                    ${itemsHtml}
                </div>
                <div class="modal-footer">
                    <button onclick="closeOrderModal()" class="btn-secondary">Close</button>
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
                closeOrderModal();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        modal.handleEscape = handleEscape; // Store reference for cleanup
        
        console.log('Order details modal displayed successfully');
        
    } catch (error) {
        console.error('Error creating order modal:', error);
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeOrderModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Error</h3>
                    <button class="modal-close" onclick="closeOrderModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="error">Error displaying order details: ${error.message}</p>
                </div>
                <div class="modal-footer">
                    <button onclick="closeOrderModal()" class="btn-secondary">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        // Remove escape key listener if it exists
        if (modal.handleEscape) {
            document.removeEventListener('keydown', modal.handleEscape);
        }
        modal.remove();
        console.log('Order details modal closed');
    }
}

async function cancelOrder(orderId) {
    console.log('Canceling order:', orderId);
    
    if (!orderId) {
        console.error('Invalid order ID for cancellation:', orderId);
        alert('Invalid order ID');
        return;
    }
    
    if (!confirm('Are you sure you want to cancel this order?\n\nStock will be restored and this action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('Making API call to cancel order...');
        
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        console.log('Cancel order result:', result);
        
        if (result && result.success) {
            alert('Order cancelled successfully! Stock has been restored.');
            await loadOrders(); // Reload the orders list
            closeOrderModal(); // Close modal if open
        } else {
            const errorMessage = (result && result.message) ? result.message : 'Unknown error occurred';
            console.error('Failed to cancel order:', errorMessage);
            alert('Error cancelling order: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        
        let errorMessage = 'Network error while cancelling order.';
        if (error.message.includes('404')) {
            errorMessage = 'Order not found or cannot be cancelled.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Please log in to cancel orders.';
        } else if (error.message.includes('403')) {
            errorMessage = 'You do not have permission to cancel this order.';
        }
        
        alert(errorMessage + ' Please try again.');
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
        
        if (result && result.success) {
            alert('Order cancelled successfully!');
            await loadOrders();
            closeOrderModal();
        } else {
            alert('Error cancelling order: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error cancelling order via PUT:', error);
        alert('Network error. Please try again.');
    }
}

// Helper functions for better user experience
function showLoadingMessage(message = 'Loading...') {
    // Remove existing loading message
    hideLoadingMessage();
    
    const loading = document.createElement('div');
    loading.id = 'loading-message';
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    // Add styles
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    document.body.appendChild(loading);
}

function hideLoadingMessage() {
    const loading = document.getElementById('loading-message');
    if (loading) {
        loading.remove();
    }
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debug function for orders
function debugOrders() {
    console.log('=== ORDERS DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('Orders section element:', document.getElementById('orders-section'));
    console.log('Orders list element:', document.getElementById('orders-list'));
    console.log('API base URL:', window.API_BASE || 'http://localhost:5000/api');
    
    // Test API connectivity for orders
    console.log('Testing orders API...');
    if (currentUser) {
        apiCall('/orders')
            .then(orders => {
                console.log('Orders API test successful:', orders);
                console.log(`Found ${orders.length} orders`);
                
                // Test individual order details if orders exist
                if (orders.length > 0) {
                    const firstOrderId = orders[0].id;
                    console.log(`Testing order details API with order ${firstOrderId}...`);
                    return apiCall(`/orders/${firstOrderId}`);
                }
            })
            .then(orderDetails => {
                if (orderDetails) {
                    console.log('Order details API test successful:', orderDetails);
                    console.log(`Order has ${orderDetails.items ? orderDetails.items.length : 0} items`);
                }
            })
            .catch(error => {
                console.error('Orders API test failed:', error);
                console.error('Error details:', {
                    message: error.message,
                    status: error.status,
                    url: error.url
                });
            });
    } else {
        console.log('No user logged in - cannot test orders API');
    }
    
    // Check for required DOM elements
    console.log('DOM element checks:');
    console.log('  - orders-section:', !!document.getElementById('orders-section'));
    console.log('  - orders-list:', !!document.getElementById('orders-list'));
    
    // Check if apiCall function is available
    console.log('API function availability:');
    console.log('  - apiCall function:', typeof apiCall);
    console.log('  - currentUser variable:', typeof currentUser);
}

// Enhanced error handling wrapper for API calls
async function safeApiCall(endpoint, options = {}) {
    try {
        console.log(`Making safe API call to: ${endpoint}`);
        const result = await apiCall(endpoint, options);
        console.log(`Safe API call successful:`, result);
        return result;
    } catch (error) {
        console.error(`Safe API call failed for ${endpoint}:`, error);
        
        // Enhanced error information
        const errorInfo = {
            endpoint,
            method: options.method || 'GET',
            message: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
        };
        
        console.error('Detailed error info:', errorInfo);
        throw error;
    }
}

// Initialize orders functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Orders module initialized');
    
    // Add event listeners for orders-related elements
    const ordersSection = document.getElementById('orders-section');
    if (ordersSection) {
        console.log('Orders section found, setting up observers...');
        
        // Set up mutation observer to detect when orders section becomes visible
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.id === 'orders-section' && !target.classList.contains('hidden')) {
                        console.log('Orders section became visible, loading orders...');
                        setTimeout(loadOrders, 100); // Small delay to ensure UI is ready
                    }
                }
            });
        });
        
        observer.observe(ordersSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Make debug function available globally
window.debugOrders = debugOrders;
window.safeApiCall = safeApiCall;

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.loadOrders = loadOrders;
    window.viewOrderDetails = viewOrderDetails;
    window.cancelOrder = cancelOrder;
    window.cancelOrderFromModal = cancelOrderFromModal;
    window.closeOrderModal = closeOrderModal;
}