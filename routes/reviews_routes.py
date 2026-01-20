from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection
import traceback

class ReviewsResource(Resource):
    def get(self, review_id=None):
        try:
            print(f"Reviews GET - Session: {dict(session)}, review_id: {review_id}")

            conn = get_db_connection()

            if review_id:
                # Get specific review
                review = conn.execute(
                    'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?',
                    (review_id,)
                ).fetchone()

                if not review:
                    conn.close()
                    return {'message': 'Review not found'}, 404

                conn.close()
                return dict(review)

            else:
                # Get reviews with optional product filter
                product_id = request.args.get('product_id', type=int)

                if product_id:
                    # Get reviews for specific product
                    reviews = conn.execute(
                        'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC',
                        (product_id,)
                    ).fetchall()

                    # Calculate average rating
                    avg_rating = conn.execute(
                        'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = ?',
                        (product_id,)
                    ).fetchone()

                else:
                    # Get all reviews (admin only)
                    if not session.get('is_admin'):
                        conn.close()
                        return {'message': 'Admin access required'}, 403

                    reviews = conn.execute(
                        'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC'
                    ).fetchall()
                    avg_rating = None

                conn.close()

                result = {
                    'reviews': [dict(review) for review in reviews],
                    'total': len(reviews)
                }

                if avg_rating and avg_rating['total_reviews'] > 0:
                    result['average_rating'] = round(avg_rating['avg_rating'], 1)
                    result['total_reviews'] = avg_rating['total_reviews']

                return result

        except Exception as e:
            print(f"Error in reviews GET: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def post(self):
        try:
            print(f"Reviews POST - Session: {dict(session)}")

            if not session.get('user_id'):
                return {'success': False, 'message': 'Login required'}, 401

            data = request.get_json()
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400

            product_id = data.get('product_id')
            rating = data.get('rating')
            comment = data.get('comment', '').strip()

            if not product_id or not rating:
                return {'success': False, 'message': 'Product ID and rating required'}, 400

            if not (1 <= rating <= 5):
                return {'success': False, 'message': 'Rating must be between 1 and 5'}, 400

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if user has purchased this product (optional - for validation)
            # For now, allow any logged-in user to review any product

            # Check if review already exists
            existing = cursor.execute(
                'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
                (user_id, product_id)
            ).fetchone()

            if existing:
                # Update existing review
                cursor.execute(
                    'UPDATE reviews SET rating = ?, comment = ?, created_at = datetime("now") WHERE user_id = ? AND product_id = ?',
                    (rating, comment, user_id, product_id)
                )
                message = 'Review updated successfully'
            else:
                # Create new review
                cursor.execute(
                    'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
                    (user_id, product_id, rating, comment)
                )
                message = 'Review added successfully'

            conn.commit()
            conn.close()

            return {'success': True, 'message': message}, 201

        except Exception as e:
            print(f"Error in reviews POST: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def put(self, review_id):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            data = request.get_json()
            if not data:
                return {'message': 'No data provided'}, 400

            rating = data.get('rating')
            comment = data.get('comment', '').strip()

            if rating is not None and not (1 <= rating <= 5):
                return {'message': 'Rating must be between 1 and 5'}, 400

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if review exists and belongs to user (or admin)
            if session.get('is_admin'):
                review = cursor.execute('SELECT * FROM reviews WHERE id = ?', (review_id,)).fetchone()
            else:
                review = cursor.execute(
                    'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
                    (review_id, user_id)
                ).fetchone()

            if not review:
                conn.close()
                return {'message': 'Review not found'}, 404

            # Build update query
            update_fields = []
            update_values = []

            if rating is not None:
                update_fields.append('rating = ?')
                update_values.append(rating)

            if comment is not None:
                update_fields.append('comment = ?')
                update_values.append(comment)

            if not update_fields:
                conn.close()
                return {'message': 'No valid fields to update'}, 400

            update_values.append(review_id)

            cursor.execute(
                f'UPDATE reviews SET {", ".join(update_fields)} WHERE id = ?',
                update_values
            )

            conn.commit()
            conn.close()

            return {'success': True, 'message': 'Review updated successfully'}

        except Exception as e:
            print(f"Error in reviews PUT: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def delete(self, review_id):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if review exists and belongs to user (or admin)
            if session.get('is_admin'):
                review = cursor.execute('SELECT * FROM reviews WHERE id = ?', (review_id,)).fetchone()
            else:
                review = cursor.execute(
                    'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
                    (review_id, user_id)
                ).fetchone()

            if not review:
                conn.close()
                return {'message': 'Review not found'}, 404

            cursor.execute('DELETE FROM reviews WHERE id = ?', (review_id,))
            conn.commit()
            conn.close()

            return {'success': True, 'message': 'Review deleted successfully'}

        except Exception as e:
            print(f"Error in reviews DELETE: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500