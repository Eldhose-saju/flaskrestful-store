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
                <td>${order.status}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}