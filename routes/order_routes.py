from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection

class OrdersResource(Resource):
    def get(self, order_id=None):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        
        if order_id:
            # Get specific order
            if session.get('is_admin'):
                order = conn.execute('''
                    SELECT o.*, u.username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    WHERE o.id = ?
                ''', (order_id,)).fetchone()
            else:
                order = conn.execute('''
                    SELECT o.*, u.username
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    WHERE o.id = ? AND o.user_id = ?
                ''', (order_id, session['user_id'])).fetchone()
            
            if not order:
                conn.close()
                return {'message': 'Order not found'}, 404
                
            # Get order items
            items = conn.execute('''
                SELECT oi.*, p.name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ''', (order_id,)).fetchall()
            
            conn.close()
            
            order_dict = dict(order)
            order_dict['items'] = [dict(item) for item in items]
            return order_dict
        
        # Get all orders (existing functionality)
        if session.get('is_admin'):
            orders = conn.execute('''
                SELECT o.*, u.username
                FROM orders o
                JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
            ''').fetchall()
        else:
            orders = conn.execute(
                'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
                (session['user_id'],)
            ).fetchall()
        
        conn.close()
        return [dict(order) for order in orders]
    
    def post(self):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get cart items
        cart_items = conn.execute('''
            SELECT c.product_id, c.quantity, p.price, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        ''', (session['user_id'],)).fetchall()
        
        if not cart_items:
            conn.close()
            return {'success': False, 'message': 'Cart is empty'}
        
        # Calculate total and check stock
        total_amount = 0
        for item in cart_items:
            if item['quantity'] > item['stock']:
                conn.close()
                return {'success': False, 'message': f'Insufficient stock for product ID {item["product_id"]}'}
            total_amount += item['quantity'] * item['price']
        
        # Create order
        cursor.execute(
            'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
            (session['user_id'], total_amount)
        )
        order_id = cursor.lastrowid
        
        # Add order items and update stock
        for item in cart_items:
            cursor.execute('''
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ''', (order_id, item['product_id'], item['quantity'], item['price']))
            
            cursor.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                (item['quantity'], item['product_id'])
            )
        
        # Clear cart
        cursor.execute('DELETE FROM cart WHERE user_id = ?', (session['user_id'],))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'order_id': order_id, 'message': 'Order placed successfully'}
    
    def put(self, order_id):
        """Update order status (admin only)"""
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        data = request.get_json()
        if not data or 'status' not in data:
            return {'message': 'Status required'}, 400
        
        valid_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        if data['status'] not in valid_statuses:
            return {'message': f'Invalid status. Valid options: {", ".join(valid_statuses)}'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if order exists
        order = cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        if not order:
            conn.close()
            return {'message': 'Order not found'}, 404
        
        # Update order status
        cursor.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            (data['status'], order_id)
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Order status updated successfully'}
    
    def delete(self, order_id):
        """Cancel order (users can cancel their own pending orders, admins can cancel any)"""
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check order ownership and status
        if session.get('is_admin'):
            order = cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        else:
            order = cursor.execute(
                'SELECT * FROM orders WHERE id = ? AND user_id = ?',
                (order_id, session['user_id'])
            ).fetchone()
        
        if not order:
            conn.close()
            return {'message': 'Order not found'}, 404
        
        # Only allow cancellation of pending orders
        if order['status'] != 'pending':
            conn.close()
            return {'message': 'Only pending orders can be cancelled'}, 400
        
        # Restore stock for cancelled orders
        order_items = cursor.execute(
            'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
            (order_id,)
        ).fetchall()
        
        for item in order_items:
            cursor.execute(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                (item['quantity'], item['product_id'])
            )
        
        # Delete order items first (foreign key constraint)
        cursor.execute('DELETE FROM order_items WHERE order_id = ?', (order_id,))
        # Delete the order
        cursor.execute('DELETE FROM orders WHERE id = ?', (order_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Order cancelled successfully'}