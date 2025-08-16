from flask import request, jsonify, session
from database.db_init import get_db_connection, hash_password

def register_debug_routes(app):
    # Test endpoint
    @app.route('/api/test', methods=['GET', 'POST'])
    def test_endpoint():
        return jsonify({
            'success': True, 
            'message': 'Backend is working!',
            'method': request.method,
            'session': dict(session)
        })

    # Debug endpoint to check users
    @app.route('/api/debug/users', methods=['GET'])
    def debug_users():
        conn = get_db_connection()
        users = conn.execute('SELECT id, username, email, is_admin FROM users').fetchall()
        conn.close()
        
        return jsonify({
            'users': [dict(user) for user in users],
            'admin_password_hash': hash_password('admin123')
        })

    # Direct login endpoint (not using Flask-RESTful)
    @app.route('/api/login', methods=['POST', 'OPTIONS'])
    def direct_login():
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            data = request.get_json()
            print(f"Direct login attempt: {data}")
            
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
                
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return jsonify({'success': False, 'message': 'Username and password required'}), 400
            
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
                
                print(f"Direct login successful for user: {username}, session: {dict(session)}")
                
                return jsonify({
                    'success': True,
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'is_admin': bool(user['is_admin'])
                    }
                }), 200
            else:
                print(f"Direct login failed for user: {username}")
                return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
                
        except Exception as e:
            print(f"Direct login error: {e}")
            return jsonify({'success': False, 'message': 'Server error'}), 500