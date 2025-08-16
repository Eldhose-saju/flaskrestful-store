from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection

class OrdersResource(Resource):
    def get(self):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        
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