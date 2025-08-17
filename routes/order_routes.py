from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection, get_products_db_connection
import traceback

class OrdersResource(Resource):
    def get(self, order_id=None):
        try:
            print(f"Orders GET - Session: {dict(session)}, order_id: {order_id}")
            
            if not session.get('user_id'):
                print("No user_id in session for orders")
                return {'message': 'Login required'}, 401
            
            conn = get_db_connection()
            
            if order_id:
                # Get specific order with items
                if session.get('is_admin'):
                    # Admin can view any order
                    order = conn.execute('''
                        SELECT o.*, u.username
                        FROM orders o
                        JOIN users u ON o.user_id = u.id
                        WHERE o.id = ?
                    ''', (order_id,)).fetchone()
                else:
                    # Regular user can only view their own orders
                    order = conn.execute(
                        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
                        (order_id, session['user_id'])
                    ).fetchone()
                
                if not order:
                    conn.close()
                    return {'message': 'Order not found'}, 404
                
                # Get order items with product details
                order_items = conn.execute('''
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ''', (order_id,)).fetchall()
                
                conn.close()
                
                order_dict = dict(order)
                order_dict['items'] = [dict(item) for item in order_items]
                return order_dict
            
            else:
                # Get all orders for user or admin
                if session.get('is_admin'):
                    print("Admin user - fetching all orders")
                    orders = conn.execute('''
                        SELECT o.*, u.username
                        FROM orders o
                        JOIN users u ON o.user_id = u.id
                        ORDER BY o.created_at DESC
                    ''').fetchall()
                else:
                    print(f"Regular user - fetching orders for user_id: {session['user_id']}")
                    orders = conn.execute(
                        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
                        (session['user_id'],)
                    ).fetchall()
                
                conn.close()
                result = [dict(order) for order in orders]
                print(f"Found {len(result)} orders")
                return result
            
        except Exception as e:
            print(f"Error in orders GET: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return {'success': False, 'message': 'Server error'}, 500
    
    def post(self):
        try:
            print(f"=== STARTING CHECKOUT PROCESS ===")
            print(f"Orders POST - Session: {dict(session)}")
            
            if not session.get('user_id'):
                print("ERROR: No user_id in session for checkout")
                return {'success': False, 'message': 'Login required'}, 401
            
            user_id = session['user_id']
            print(f"Processing order for user_id: {user_id}")
            
            # Connect to both databases
            conn = get_db_connection()
            products_conn = get_products_db_connection()
            cursor = conn.cursor()
            
            try:
                # Get cart items with detailed logging
                print("Fetching cart items with products...")
                cart_items = conn.execute('''
                    SELECT c.id as cart_id, c.product_id, c.quantity, c.user_id
                    FROM cart c
                    WHERE c.user_id = ?
                ''', (user_id,)).fetchall()
                
                print(f"Found {len(cart_items)} raw cart items")
                
                if not cart_items:
                    print("ERROR: Cart is empty - cannot checkout")
                    return {'success': False, 'message': 'Cart is empty'}, 400
                
                # Get product details and validate
                validated_items = []
                total_amount = 0
                
                for cart_item in cart_items:
                    print(f"Processing cart item: {dict(cart_item)}")
                    
                    # Get product details from products database
                    product = products_conn.execute(
                        'SELECT * FROM products WHERE id = ?',
                        (cart_item['product_id'],)
                    ).fetchone()
                    
                    if not product:
                        conn.close()
                        products_conn.close()
                        return {'success': False, 'message': f'Product {cart_item["product_id"]} not found'}, 400
                    
                    product_dict = dict(product)
                    print(f"Product details: {product_dict['name']} - Price: ${product_dict['price']} - Stock: {product_dict['stock']}")
                    
                    # Validate stock
                    if cart_item['quantity'] > product_dict['stock']:
                        conn.close()
                        products_conn.close()
                        error_msg = f'Insufficient stock for {product_dict["name"]}. Available: {product_dict["stock"]}, Requested: {cart_item["quantity"]}'
                        print(f"ERROR: {error_msg}")
                        return {'success': False, 'message': error_msg}, 400
                    
                    # Calculate item total
                    item_total = cart_item['quantity'] * product_dict['price']
                    total_amount += item_total
                    
                    validated_items.append({
                        'cart_id': cart_item['cart_id'],
                        'product_id': cart_item['product_id'],
                        'quantity': cart_item['quantity'],
                        'price': product_dict['price'],
                        'name': product_dict['name'],
                        'subtotal': item_total
                    })
                    
                    print(f"Validated: {product_dict['name']} - Qty: {cart_item['quantity']} x ${product_dict['price']} = ${item_total}")
                
                print(f"Total order amount: ${total_amount}")
                print(f"Total items to order: {len(validated_items)}")
                
                # Create order
                print("Creating order record...")
                cursor.execute(
                    'INSERT INTO orders (user_id, total_amount, status, created_at) VALUES (?, ?, ?, datetime("now"))',
                    (user_id, total_amount, 'pending')
                )
                order_id = cursor.lastrowid
                print(f"Order created with ID: {order_id}")
                
                # Process each validated item
                print("Processing order items and updating stock...")
                for item in validated_items:
                    # Add to order_items table
                    cursor.execute('''
                        INSERT INTO order_items (order_id, product_id, quantity, price)
                        VALUES (?, ?, ?, ?)
                    ''', (order_id, item['product_id'], item['quantity'], item['price']))
                    
                    # Update product stock in products database
                    products_conn.execute(
                        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ?',
                        (item['quantity'], item['product_id'])
                    )
                    
                    print(f"Added {item['name']} to order items and reduced stock by {item['quantity']}")
                
                # Clear user's cart
                print("Clearing user's cart...")
                cursor.execute('DELETE FROM cart WHERE user_id = ?', (user_id,))
                
                # Commit all changes
                print("Committing all database changes...")
                conn.commit()
                products_conn.commit()
                
                print(f"=== ORDER {order_id} COMPLETED SUCCESSFULLY ===")
                print(f"Total amount: ${total_amount}")
                print(f"Items ordered: {len(validated_items)}")
                
                return {
                    'success': True, 
                    'order_id': order_id, 
                    'total_amount': float(total_amount),
                    'message': 'Order placed successfully',
                    'items_count': len(validated_items)
                }, 200
                
            finally:
                # Always close database connections
                products_conn.close()
                conn.close()
                
        except Exception as e:
            print(f"CRITICAL ERROR in orders POST: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.rollback()
                products_conn.rollback()
                conn.close()
                products_conn.close()
            except:
                pass
            return {'success': False, 'message': f'Server error: {str(e)}'}, 500
    
    def put(self, order_id):
        """Update order status (admin only) or cancel order (user only if pending)"""
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401
            
            data = request.get_json()
            if not data:
                return {'message': 'No data provided'}, 400
            
            conn = get_db_connection()
            products_conn = get_products_db_connection()
            cursor = conn.cursor()
            
            # Check if order exists and get current status
            if session.get('is_admin'):
                order = cursor.execute(
                    'SELECT * FROM orders WHERE id = ?', (order_id,)
                ).fetchone()
            else:
                order = cursor.execute(
                    'SELECT * FROM orders WHERE id = ? AND user_id = ?', 
                    (order_id, session['user_id'])
                ).fetchone()
            
            if not order:
                conn.close()
                products_conn.close()
                return {'message': 'Order not found'}, 404
            
            # Handle different update scenarios
            if session.get('is_admin'):
                # Admin can update status
                new_status = data.get('status')
                if new_status:
                    cursor.execute(
                        'UPDATE orders SET status = ? WHERE id = ?',
                        (new_status, order_id)
                    )
                    conn.commit()
                    conn.close()
                    products_conn.close()
                    return {'success': True, 'message': 'Order status updated successfully'}
            else:
                # Regular users can only cancel pending orders
                if order['status'] != 'pending':
                    conn.close()
                    products_conn.close()
                    return {'message': 'Can only cancel pending orders'}, 400
                
                # Cancel the order and restore stock
                cursor.execute(
                    'UPDATE orders SET status = ? WHERE id = ?',
                    ('cancelled', order_id)
                )
                
                # Restore stock for cancelled items
                order_items = cursor.execute(
                    'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
                    (order_id,)
                ).fetchall()
                
                for item in order_items:
                    products_conn.execute(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        (item['quantity'], item['product_id'])
                    )
                
                conn.commit()
                products_conn.commit()
                conn.close()
                products_conn.close()
                return {'success': True, 'message': 'Order cancelled successfully'}
            
            conn.close()
            products_conn.close()
            return {'message': 'Invalid update request'}, 400
            
        except Exception as e:
            print(f"Error in orders PUT: {e}")
            try:
                conn.rollback()
                products_conn.rollback()
                conn.close()
                products_conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500
    
    def delete(self, order_id):
        """Cancel/Delete order and restore stock"""
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401
            
            conn = get_db_connection()
            products_conn = get_products_db_connection()
            cursor = conn.cursor()
            
            # Check if order exists and permissions
            if session.get('is_admin'):
                order = cursor.execute(
                    'SELECT * FROM orders WHERE id = ?', (order_id,)
                ).fetchone()
            else:
                order = cursor.execute(
                    'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?', 
                    (order_id, session['user_id'], 'pending')
                ).fetchone()
            
            if not order:
                conn.close()
                products_conn.close()
                if session.get('is_admin'):
                    return {'message': 'Order not found'}, 404
                else:
                    return {'message': 'Order not found or cannot be cancelled'}, 404
            
            # Get order items to restore stock
            order_items = cursor.execute(
                'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
                (order_id,)
            ).fetchall()
            
            # Restore stock
            for item in order_items:
                products_conn.execute(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    (item['quantity'], item['product_id'])
                )
            
            if session.get('is_admin'):
                # Admin can fully delete the order
                cursor.execute('DELETE FROM order_items WHERE order_id = ?', (order_id,))
                cursor.execute('DELETE FROM orders WHERE id = ?', (order_id,))
            else:
                # User cancellation - just update status
                cursor.execute(
                    'UPDATE orders SET status = ? WHERE id = ?',
                    ('cancelled', order_id)
                )
            
            conn.commit()
            products_conn.commit()
            conn.close()
            products_conn.close()
            
            return {'success': True, 'message': 'Order cancelled successfully'}
            
        except Exception as e:
            print(f"Error in orders DELETE: {e}")
            try:
                conn.rollback()
                products_conn.rollback()
                conn.close()
                products_conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500