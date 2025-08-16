from flask import request, jsonify, session
from flask_restful import Resource
from database.db_init import get_db_connection

class CartResource(Resource):
    def options(self, cart_id=None):
        return jsonify({'status': 'OK'})
    
    def get(self):
        print(f"Cart GET - Session: {dict(session)}")  # Debug
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        cart_items = conn.execute('''
            SELECT c.id, c.quantity, p.id as product_id, p.name, p.price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        ''', (session['user_id'],)).fetchall()
        conn.close()
        
        return [dict(item) for item in cart_items]
    
    def post(self):
        print(f"Cart POST - Session: {dict(session)}")  # Debug
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        data = request.get_json()
        if not data:
            return {'message': 'No data provided'}, 400
            
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return {'message': 'Product ID required'}, 400
        
        conn = get_db_connection()
        
        # Check if item already in cart
        existing = conn.execute(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            (session['user_id'], product_id)
        ).fetchone()
        
        if existing:
            conn.execute(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                (quantity, session['user_id'], product_id)
            )
        else:
            conn.execute(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                (session['user_id'], product_id, quantity)
            )
        
        conn.commit()
        conn.close()
        return {'success': True, 'message': 'Item added to cart'}
    
    def put(self, cart_id):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        data = request.get_json()
        quantity = data.get('quantity')
        
        conn = get_db_connection()
        conn.execute(
            'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
            (quantity, cart_id, session['user_id'])
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Cart updated'}
    
    def delete(self, cart_id):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        conn.execute(
            'DELETE FROM cart WHERE id = ? AND user_id = ?',
            (cart_id, session['user_id'])
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Item removed from cart'}