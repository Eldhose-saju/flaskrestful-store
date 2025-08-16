// Orders Functions
async function loadOrders() {
    if (!currentUser) return;
    
    const orders = await apiCall('/orders');
    displayOrders(orders);
}

function displayOrders(orders) {
    const container = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders found</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
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
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>$${order.total_amount}</td>
                <td><span class="status-${order.status}">${order.status}</span></td>
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

async function viewOrderDetails(orderId) {
    try {
        const order = await apiCall(`/orders/${orderId}`);
        
        let itemsHtml = '<div class="order-items"><h4>Order Items:</h4>';
        if (order.items && order.items.length > 0) {
            itemsHtml += '<ul>';
            order.items.forEach(item => {
                const itemTotal = item.quantity * item.price;
                itemsHtml += `<li>${item.name} - Quantity: ${item.quantity}, Price: $${item.price}, Total: $${itemTotal.toFixed(2)}</li>`;
            });
            itemsHtml += '</ul>';
        } else {
            itemsHtml += '<p>No items found</p>';
        }
        itemsHtml += '</div>';
        
        // Create a more sophisticated modal instead of alert
        showOrderModal(order, itemsHtml);
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Error loading order details');
    }
}

function showOrderModal(order, itemsHtml) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('order-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'order-details-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <div id="order-details-content"></div>
                <div style="margin-top: 1rem;">
                    <button onclick="closeOrderModal()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const content = `
        <h3>Order #${order.id}</h3>
        <div class="order-info">
            <p><strong>Customer:</strong> ${order.username || currentUser.username}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="status-${order.status}">${order.status}</span></p>
            <p><strong>Total:</strong> $${order.total_amount}</p>
        </div>
        ${itemsHtml}
    `;
    
    document.getElementById('order-details-content').innerHTML = content;
    modal.classList.remove('hidden');
}

function closeOrderModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiCall(`/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            alert('Order cancelled successfully! Stock has been restored.');
            loadOrders(); // Reload the orders list
        } else {
            alert('Error cancelling order: ' + result.message);
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Error cancelling order. Please try again.');
    }
}