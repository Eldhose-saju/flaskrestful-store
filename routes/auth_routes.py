from flask import request, jsonify, session
from flask_restful import Resource
import sqlite3
from database.db_init import get_db_connection, hash_password

class AuthResource(Resource):
    def options(self):
        return jsonify({'status': 'OK'})
    
    def post(self):
        try:
            data = request.get_json()
            print(f"AuthResource POST data: {data}")
            
            if not data:
                return {'success': False, 'message': 'No data provided'}, 400
                
            action = data.get('action')
            print(f"AuthResource action: {action}")
            
            if action == 'login':
                username = data.get('username')
                password = data.get('password')
                
                if not username or not password:
                    return {'success': False, 'message': 'Username and password required'}, 400
                
                conn = get_db_connection()
                user = conn.execute(
                    'SELECT * FROM users WHERE username = ? AND password = ?',
                    (username, hash_password(password))
                ).fetchone()
                conn.close()
                
                if user:
                    session.permanent = True
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['is_admin'] = bool(user['is_admin'])
                    
                    print(f"Login successful for user: {username}, session: {dict(session)}")  # Debug
                    
                    return {
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'is_admin': bool(user['is_admin'])
                        }
                    }, 200
                else:
                    print(f"Login failed for user: {username}")  # Debug
                    return {'success': False, 'message': 'Invalid credentials'}, 401
            
            elif action == 'register':
                username = data.get('username')
                email = data.get('email')
                password = data.get('password')
                
                if not username or not email or not password:
                    return {'success': False, 'message': 'All fields required'}, 400
                
                conn = get_db_connection()
                try:
                    conn.execute(
                        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                        (username, email, hash_password(password))
                    )
                    conn.commit()
                    conn.close()
                    return {'success': True, 'message': 'User registered successfully'}, 201
                except sqlite3.IntegrityError:
                    conn.close()
                    return {'success': False, 'message': 'Username or email already exists'}, 400
            
            elif action == 'logout':
                session.clear()
                return {'success': True, 'message': 'Logged out successfully'}, 200
            
            elif action == 'check':
                print(f"Session check: {dict(session)}")  # Debug
                if 'user_id' in session:
                    return {
                        'success': True,
                        'user': {
                            'id': session['user_id'],
                            'username': session['username'],
                            'is_admin': session.get('is_admin', False)
                        }
                    }, 200
                return {'success': False, 'message': 'Not logged in'}, 401
            
            return {'success': False, 'message': 'Invalid action'}, 400
            
        except Exception as e:
            print(f"AuthResource error: {e}")
            return {'success': False, 'message': 'Server error'}, 500