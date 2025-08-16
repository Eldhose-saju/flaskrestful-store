from flask import request, session
from flask_restful import Resource
from database.db_init import get_db_connection, hash_password
import sqlite3

class UsersResource(Resource):
    def get(self, user_id=None):
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        conn = get_db_connection()
        
        if user_id:
            # Get specific user
            if session.get('is_admin') or session['user_id'] == user_id:
                user = conn.execute(
                    'SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?',
                    (user_id,)
                ).fetchone()
                
                if not user:
                    conn.close()
                    return {'message': 'User not found'}, 404
                
                conn.close()
                return dict(user)
            else:
                conn.close()
                return {'message': 'Access denied'}, 403
        
        # Get all users (admin only)
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        users = conn.execute(
            'SELECT id, username, email, is_admin, created_at FROM users'
        ).fetchall()
        conn.close()
        
        return [dict(user) for user in users]
    
    def post(self):
        """Create new user (admin only or public registration)"""
        data = request.get_json()
        if not data:
            return {'message': 'No data provided'}, 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        is_admin = data.get('is_admin', False)
        
        if not username or not email or not password:
            return {'message': 'Username, email, and password are required'}, 400
        
        # Only admins can create admin users
        if is_admin and not session.get('is_admin'):
            return {'message': 'Admin access required to create admin users'}, 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
                (username, email, hash_password(password), is_admin)
            )
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'user_id': user_id,
                'message': 'User created successfully'
            }, 201
        except sqlite3.IntegrityError as e:
            conn.close()
            return {'success': False, 'message': 'Username or email already exists'}, 400
    
    def put(self, user_id):
        """Update user (users can update themselves, admins can update anyone)"""
        if not session.get('user_id'):
            return {'message': 'Login required'}, 401
        
        # Check permissions
        if not session.get('is_admin') and session['user_id'] != user_id:
            return {'message': 'Access denied'}, 403
        
        data = request.get_json()
        if not data:
            return {'message': 'No data provided'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        user = cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            conn.close()
            return {'message': 'User not found'}, 404
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        if 'username' in data:
            update_fields.append('username = ?')
            update_values.append(data['username'])
        
        if 'email' in data:
            update_fields.append('email = ?')
            update_values.append(data['email'])
        
        if 'password' in data:
            update_fields.append('password = ?')
            update_values.append(hash_password(data['password']))
        
        # Only admins can change admin status
        if 'is_admin' in data and session.get('is_admin'):
            update_fields.append('is_admin = ?')
            update_values.append(data['is_admin'])
        
        if not update_fields:
            conn.close()
            return {'message': 'No valid fields to update'}, 400
        
        update_values.append(user_id)
        
        try:
            cursor.execute(
                f'UPDATE users SET {", ".join(update_fields)} WHERE id = ?',
                update_values
            )
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'User updated successfully'}
        except sqlite3.IntegrityError:
            conn.close()
            return {'success': False, 'message': 'Username or email already exists'}, 400
    
    def delete(self, user_id):
        """Delete user (admin only, cannot delete self)"""
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        if session['user_id'] == user_id:
            return {'message': 'Cannot delete your own account'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        user = cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            conn.close()
            return {'message': 'User not found'}, 404
        
        # Delete user (this will cascade delete related cart items, orders, etc.)
        cursor.execute('DELETE FROM cart WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', (user_id,))
        cursor.execute('DELETE FROM orders WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'User deleted successfully'}