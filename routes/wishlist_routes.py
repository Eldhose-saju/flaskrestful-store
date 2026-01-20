from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection, get_products_db_connection
import traceback

class WishlistResource(Resource):
    def get(self, wishlist_id=None):
        try:
            print(f"Wishlist GET - Session: {dict(session)}, wishlist_id: {wishlist_id}")

            if not session.get('user_id'):
                print("No user_id in session for wishlist")
                return {'message': 'Login required'}, 401

            user_id = session['user_id']
            print(f"Getting wishlist for user_id: {user_id}")

            conn = get_db_connection()
            products_conn = get_products_db_connection()

            if wishlist_id:
                # Get specific wishlist item
                wishlist_item = conn.execute(
                    'SELECT * FROM wishlist WHERE id = ? AND user_id = ?',
                    (wishlist_id, user_id)
                ).fetchone()

                if not wishlist_item:
                    conn.close()
                    products_conn.close()
                    return {'message': 'Wishlist item not found'}, 404

                # Get product details
                product = products_conn.execute(
                    'SELECT * FROM products WHERE id = ?',
                    (wishlist_item['product_id'],)
                ).fetchone()

                conn.close()
                products_conn.close()

                result = dict(wishlist_item)
                if product:
                    result['product'] = dict(product)

                return result

            else:
                # Get all wishlist items for user
                print("Fetching all wishlist items for user")
                wishlist_items = conn.execute(
                    'SELECT * FROM wishlist WHERE user_id = ? ORDER BY added_at DESC',
                    (user_id,)
                ).fetchall()

                print(f"Found {len(wishlist_items)} wishlist items")

                result = []
                for item in wishlist_items:
                    # Get product details for each wishlist item
                    product = products_conn.execute(
                        'SELECT * FROM products WHERE id = ?',
                        (item['product_id'],)
                    ).fetchone()

                    wishlist_item = dict(item)
                    if product:
                        product_dict = dict(product)
                        wishlist_item['product'] = product_dict
                        print(f"  - Found product: {product_dict['name']}")
                    else:
                        print(f"  - Product {item['product_id']} not found")
                        wishlist_item['product'] = None

                    result.append(wishlist_item)

                conn.close()
                products_conn.close()

                print(f"Wishlist total items: {len(result)}")
                return {
                    'items': result,
                    'count': len(result)
                }

        except Exception as e:
            print(f"Error in wishlist GET: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.close()
                products_conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def post(self):
        try:
            print(f"Wishlist POST - Session: {dict(session)}")

            if not session.get('user_id'):
                print("No user_id in session for add to wishlist")
                return {'success': False, 'message': 'Login required'}, 401

            data = request.get_json()
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400

            product_id = data.get('product_id')

            print(f"Adding to wishlist: product_id={product_id}")

            if not product_id:
                return {'success': False, 'message': 'Product ID required'}, 400

            user_id = session['user_id']

            # Check if product exists
            products_conn = get_products_db_connection()
            product = products_conn.execute(
                'SELECT * FROM products WHERE id = ?',
                (product_id,)
            ).fetchone()

            if not product:
                products_conn.close()
                return {'success': False, 'message': 'Product not found'}, 404

            products_conn.close()

            # Add to wishlist or check if already exists
            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if item already in wishlist
            existing = cursor.execute(
                'SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?',
                (user_id, product_id)
            ).fetchone()

            if existing:
                conn.close()
                return {'success': False, 'message': 'Product already in wishlist'}, 400

            # Add new item
            cursor.execute(
                'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
                (user_id, product_id)
            )

            conn.commit()
            conn.close()

            print(f"Added new item to wishlist")
            return {
                'success': True,
                'message': f'Added {product["name"]} to wishlist',
                'product_name': product['name']
            }, 200

        except Exception as e:
            print(f"Error in wishlist POST: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def delete(self, wishlist_id):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if wishlist item exists
            wishlist_item = cursor.execute(
                'SELECT * FROM wishlist WHERE id = ? AND user_id = ?',
                (wishlist_id, user_id)
            ).fetchone()

            if not wishlist_item:
                conn.close()
                return {'message': 'Wishlist item not found'}, 404

            # Delete the item
            cursor.execute(
                'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
                (wishlist_id, user_id)
            )
            conn.commit()
            conn.close()

            return {'success': True, 'message': 'Item removed from wishlist'}

        except Exception as e:
            print(f"Error in wishlist DELETE: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500