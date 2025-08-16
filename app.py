from flask import Flask, request, jsonify, session
from flask_restful import Api, Resource
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime, timedelta
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# Simplified CORS - like the working minimal server
CORS(app, origins="*", supports_credentials=True)

api = Api(app)

# Database initialization
def init_db():
    conn = sqlite3.connect('ecommerce.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Cart table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')
    
    # Orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Order items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')
    
    # Create default admin user
    cursor.execute('SELECT * FROM users WHERE username = "admin"')
    if not cursor.fetchone():
        admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
        cursor.execute('''
            INSERT INTO users (username, email, password, is_admin) 
            VALUES (?, ?, ?, ?)
        ''', ('admin', 'admin@store.com', admin_password, 1))
    
    # Add sample products
    cursor.execute('SELECT COUNT(*) FROM products')
    if cursor.fetchone()[0] == 0:
        sample_products = [
            ('Laptop', 'High performance laptop', 999.99, 10, 'Electronics'),
            ('Mouse', 'Wireless mouse', 29.99, 50, 'Electronics'),
            ('Keyboard', 'Mechanical keyboard', 79.99, 25, 'Electronics'),
            ('T-Shirt', 'Cotton t-shirt', 19.99, 100, 'Clothing'),
            ('Jeans', 'Denim jeans', 49.99, 75, 'Clothing')
        ]
        cursor.executemany('''
            INSERT INTO products (name, description, price, stock, category) 
            VALUES (?, ?, ?, ?, ?)
        ''', sample_products)
    
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    conn = sqlite3.connect('ecommerce.db')
    conn.row_factory = sqlite3.Row
    return conn

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

class ProductsResource(Resource):
    def options(self, product_id=None):
        return jsonify({'status': 'OK'})
    
    def get(self, product_id=None):
        conn = get_db_connection()
        
        if product_id:
            product = conn.execute(
                'SELECT * FROM products WHERE id = ?', (product_id,)
            ).fetchone()
            conn.close()
            
            if product:
                return dict(product)
            return {'message': 'Product not found'}, 404
        
        products = conn.execute('SELECT * FROM products').fetchall()
        conn.close()
        return [dict(product) for product in products]
    
    def post(self):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO products (name, description, price, stock, category)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['name'], data['description'], data['price'], data['stock'], data['category']))
        
        product_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {'success': True, 'id': product_id, 'message': 'Product created'}
    
    def put(self, product_id):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        data = request.json
        conn = get_db_connection()
        conn.execute('''
            UPDATE products SET name=?, description=?, price=?, stock=?, category=?
            WHERE id=?
        ''', (data['name'], data['description'], data['price'], data['stock'], data['category'], product_id))
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Product updated'}
    
    def delete(self, product_id):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        conn = get_db_connection()
        conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Product deleted'}

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

class UsersResource(Resource):
    def get(self):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        conn = get_db_connection()
        users = conn.execute('SELECT id, username, email, is_admin, created_at FROM users').fetchall()
        conn.close()
        
        return [dict(user) for user in users]

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

# API Routes
api.add_resource(AuthResource, '/api/auth')
api.add_resource(ProductsResource, '/api/products', '/api/products/<int:product_id>')
api.add_resource(CartResource, '/api/cart', '/api/cart/<int:cart_id>')
api.add_resource(OrdersResource, '/api/orders')
api.add_resource(UsersResource, '/api/users')

if __name__ == '__main__':
    init_db()
    print("Starting Flask server...")
    print("Backend will be available at: http://localhost:5000")
    print("Make sure to access your HTML file through a local server, not file://")
    app.run(debug=True, host='0.0.0.0', port=5000)