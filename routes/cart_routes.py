from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection, get_products_db_connection
import traceback

class CartResource(Resource):
    def get(self, cart_id=None):
        try:
            print(f"Cart GET - Session: {dict(session)}, cart_id: {cart_id}")
            
            if not session.get('user_id'):
                print("No user_id in session for cart")
                return {'message': 'Login required'}, 401
            
            user_id = session['user_id']
            print(f"Getting cart for user_id: {user_id}")
            
            conn = get_db_connection()
            products_conn = get_products_db_connection()
            
            if cart_id:
                # Get specific cart item
                cart_item = conn.execute(
                    'SELECT * FROM cart WHERE id = ? AND user_id = ?',
                    (cart_id, user_id)
                ).fetchone()
                
                if not cart_item:
                    conn.close()
                    products_conn.close()
                    return {'message': 'Cart item not found'}, 404
                
                # Get product details
                product = products_conn.execute(
                    'SELECT * FROM products WHERE id = ?',
                    (cart_item['product_id'],)
                ).fetchone()
                
                conn.close()
                products_conn.close()
                
                result = dict(cart_item)
                if product:
                    result['product'] = dict(product)
                
                return result
            
            else:
                # Get all cart items for user
                print("Fetching all cart items for user")
                cart_items = conn.execute(
                    'SELECT * FROM cart WHERE user_id = ?',
                    (user_id,)
                ).fetchall()
                
                print(f"Found {len(cart_items)} cart items")
                
                result = []
                total = 0
                
                for item in cart_items:
                    # Get product details for each cart item
                    product = products_conn.execute(
                        'SELECT * FROM products WHERE id = ?',
                        (item['product_id'],)
                    ).fetchone()
                    
                    cart_item = dict(item)
                    if product:
                        product_dict = dict(product)
                        cart_item['product'] = product_dict
                        cart_item['subtotal'] = item['quantity'] * product_dict['price']
                        total += cart_item['subtotal']
                        print(f"  - {product_dict['name']}: qty={item['quantity']}, price=${product_dict['price']}, subtotal=${cart_item['subtotal']}")
                    else:
                        print(f"  - Product {item['product_id']} not found")
                        cart_item['product'] = None
                        cart_item['subtotal'] = 0
                    
                    result.append(cart_item)
                
                conn.close()
                products_conn.close()
                
                print(f"Cart total: ${total}")
                return {
                    'items': result,
                    'total': total,
                    'count': len(result)
                }
            
        except Exception as e:
            print(f"Error in cart GET: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.close()
                products_conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500
    
    def post(self):
        try:
            print(f"Cart POST - Session: {dict(session)}")
            
            if not session.get('user_id'):
                print("No user_id in session for add to cart")
                return {'success': False, 'message': 'Login required'}, 401
            
            data = request.get_json()
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
            
            product_id = data.get('product_id')
            quantity = data.get('quantity', 1)
            
            print(f"Adding to cart: product_id={product_id}, quantity={quantity}")
            
            if not product_id:
                return {'success': False, 'message': 'Product ID required'}, 400
            
            if quantity <= 0:
                return {'success': False, 'message': 'Quantity must be positive'}, 400
            
            user_id = session['user_id']
            
            # Check if product exists and has enough stock
            products_conn = get_products_db_connection()
            product = products_conn.execute(
                'SELECT * FROM products WHERE id = ?', (product_id,)
            ).fetchone()
            
            if not product:
                products_conn.close()
                return {'success': False, 'message': 'Product not found'}, 404
            
            if product['stock'] < quantity:
                products_conn.close()
                return {'success': False, 'message': f'Insufficient stock. Available: {product["stock"]}'}, 400
            
            products_conn.close()
            
            # Add to cart or update existing item
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if item already in cart
            existing = cursor.execute(
                'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
                (user_id, product_id)
            ).fetchone()
            
            if existing:
                # Update quantity
                new_quantity = existing['quantity'] + quantity
                if new_quantity > product['stock']:
                    conn.close()
                    return {'success': False, 'message': f'Cannot add {quantity} more. Total would exceed stock limit of {product["stock"]}'}, 400
                
                cursor.execute(
                    'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
                    (new_quantity, user_id, product_id)
                )
                print(f"Updated cart item quantity to {new_quantity}")
            else:
                # Add new item
                cursor.execute(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    (user_id, product_id, quantity)
                )
                print(f"Added new item to cart")
            
            conn.commit()
            conn.close()
            
            return {
                'success': True, 
                'message': f'Added {quantity} item(s) to cart',
                'product_name': product['name']
            }, 200
            
        except Exception as e:
            print(f"Error in cart POST: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500
    
    def put(self, cart_id):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401
            
            data = request.get_json()
            if not data:
                return {'message': 'No data provided'}, 400
            
            quantity = data.get('quantity')
            if quantity is None or quantity <= 0:
                return {'message': 'Valid quantity required'}, 400
            
            user_id = session['user_id']
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if cart item exists
            cart_item = cursor.execute(
                'SELECT * FROM cart WHERE id = ? AND user_id = ?',
                (cart_id, user_id)
            ).fetchone()
            
            if not cart_item:
                conn.close()
                return {'message': 'Cart item not found'}, 404
            
            # Check product stock
            products_conn = get_products_db_connection()
            product = products_conn.execute(
                'SELECT stock FROM products WHERE id = ?',
                (cart_item['product_id'],)
            ).fetchone()
            products_conn.close()
            
            if not product or quantity > product['stock']:
                conn.close()
                return {'message': f'Insufficient stock. Available: {product["stock"] if product else 0}'}, 400
            
            # Update quantity
            cursor.execute(
                'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
                (quantity, cart_id, user_id)
            )
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Cart updated successfully'}
            
        except Exception as e:
            print(f"Error in cart PUT: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500
    
    def delete(self, cart_id):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401
            
            user_id = session['user_id']
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if cart item exists
            cart_item = cursor.execute(
                'SELECT * FROM cart WHERE id = ? AND user_id = ?',
                (cart_id, user_id)
            ).fetchone()
            
            if not cart_item:
                conn.close()
                return {'message': 'Cart item not found'}, 404
            
            # Delete the item
            cursor.execute(
                'DELETE FROM cart WHERE id = ? AND user_id = ?',
                (cart_id, user_id)
            )
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Item removed from cart'}
            
        except Exception as e:
            print(f"Error in cart DELETE: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

# Additional cart utility endpoints
def clear_cart_for_user(user_id):
    """Utility function to clear cart for a user (used after checkout)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cart WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error clearing cart: {e}")
        return False

def get_cart_count_for_user(user_id):
    """Utility function to get cart item count for a user"""
    try:
        conn = get_db_connection()
        count = conn.execute(
            'SELECT SUM(quantity) FROM cart WHERE user_id = ?', (user_id,)
        ).fetchone()[0] or 0
        conn.close()
        return count
    except Exception as e:
        print(f"Error getting cart count: {e}")
        return 0