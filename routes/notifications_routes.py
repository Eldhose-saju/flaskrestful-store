from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection
import traceback

class NotificationsResource(Resource):
    def get(self, notification_id=None):
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            user_id = session['user_id']
            conn = get_db_connection()

            if notification_id:
                # Get specific notification
                notification = conn.execute(
                    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
                    (notification_id, user_id)
                ).fetchone()

                if not notification:
                    conn.close()
                    return {'message': 'Notification not found'}, 404

                conn.close()
                return dict(notification)

            else:
                # Get all notifications for user
                unread_only = request.args.get('unread_only', type=bool)
                limit = request.args.get('limit', 50, type=int)

                where_clause = 'user_id = ?'
                params = [user_id]

                if unread_only:
                    where_clause += ' AND read = 0'

                notifications = conn.execute(
                    f'SELECT * FROM notifications WHERE {where_clause} ORDER BY created_at DESC LIMIT ?',
                    params + [limit]
                ).fetchall()

                # Get unread count
                unread_count = conn.execute(
                    'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0',
                    (user_id,)
                ).fetchone()[0]

                conn.close()

                return {
                    'notifications': [dict(n) for n in notifications],
                    'unread_count': unread_count,
                    'total': len(notifications)
                }

        except Exception as e:
            print(f"Error in notifications GET: {e}")
            try:
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def post(self):
        """Create notification (admin only or system)"""
        try:
            if not session.get('is_admin'):
                return {'message': 'Admin access required'}, 403

            data = request.get_json()
            if not data:
                return {'message': 'No data provided'}, 400

            user_id = data.get('user_id')
            title = data.get('title')
            message = data.get('message')
            notification_type = data.get('type', 'info')

            if not user_id or not title or not message:
                return {'message': 'User ID, title, and message are required'}, 400

            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                (user_id, title, message, notification_type)
            )

            notification_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return {
                'success': True,
                'id': notification_id,
                'message': 'Notification sent successfully'
            }, 201

        except Exception as e:
            print(f"Error in notifications POST: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def put(self, notification_id):
        """Mark notification as read/unread"""
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            data = request.get_json()
            if not data:
                return {'message': 'No data provided'}, 400

            read_status = data.get('read')
            if read_status is None:
                return {'message': 'Read status required'}, 400

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if notification exists and belongs to user
            notification = cursor.execute(
                'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
                (notification_id, user_id)
            ).fetchone()

            if not notification:
                conn.close()
                return {'message': 'Notification not found'}, 404

            cursor.execute(
                'UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?',
                (1 if read_status else 0, notification_id, user_id)
            )

            conn.commit()
            conn.close()

            return {'success': True, 'message': 'Notification updated successfully'}

        except Exception as e:
            print(f"Error in notifications PUT: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

    def delete(self, notification_id):
        """Delete notification"""
        try:
            if not session.get('user_id'):
                return {'message': 'Login required'}, 401

            user_id = session['user_id']

            conn = get_db_connection()
            cursor = conn.cursor()

            # Check if notification exists and belongs to user (or admin)
            if session.get('is_admin'):
                notification = cursor.execute('SELECT * FROM notifications WHERE id = ?', (notification_id,)).fetchone()
            else:
                notification = cursor.execute(
                    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
                    (notification_id, user_id)
                ).fetchone()

            if not notification:
                conn.close()
                return {'message': 'Notification not found'}, 404

            cursor.execute('DELETE FROM notifications WHERE id = ?', (notification_id,))
            conn.commit()
            conn.close()

            return {'success': True, 'message': 'Notification deleted successfully'}

        except Exception as e:
            print(f"Error in notifications DELETE: {e}")
            try:
                conn.rollback()
                conn.close()
            except:
                pass
            return {'success': False, 'message': 'Server error'}, 500

# Utility functions for creating notifications
def create_order_notification(user_id, order_id, total_amount):
    """Create notification when order is placed"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            (user_id, f'Order #{order_id} Confirmed',
             f'Your order has been placed successfully. Total: ${total_amount:.2f}',
             'success')
        )

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error creating order notification: {e}")
        return False

def create_admin_notification(title, message):
    """Create notification for all admins"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get all admin users
        admins = cursor.execute('SELECT id FROM users WHERE is_admin = 1').fetchall()

        for admin in admins:
            cursor.execute(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                (admin['id'], title, message, 'admin')
            )

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error creating admin notification: {e}")
        return False