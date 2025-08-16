from flask import Flask
from flask_restful import Api
from flask_cors import CORS
from datetime import timedelta
from database.db_init import init_db
from routes.auth_routes import AuthResource
from routes.product_routes import ProductsResource
from routes.cart_routes import CartResource
from routes.order_routes import OrdersResource
from routes.user_routes import UsersResource
from routes.debug_routes import register_debug_routes

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# Simplified CORS - like the working minimal server
CORS(app, origins="*", supports_credentials=True)

api = Api(app)

# Register API Routes with complete CRUD patterns
api.add_resource(AuthResource, '/api/auth')
api.add_resource(ProductsResource, '/api/products', '/api/products/<int:product_id>')
api.add_resource(CartResource, '/api/cart', '/api/cart/<int:cart_id>')
api.add_resource(OrdersResource, '/api/orders', '/api/orders/<int:order_id>')  # Added order_id route
api.add_resource(UsersResource, '/api/users', '/api/users/<int:user_id>')      # Added user_id route

# Register debug routes
register_debug_routes(app)

if __name__ == '__main__':
    init_db()
    print("Starting Flask server...")
    print("Backend will be available at: http://localhost:5000")
    print("Make sure to access your HTML file through a local server, not file://")
    print("\nNew CRUD endpoints available:")
    print("- GET/PUT/DELETE /api/orders/<id> - View/Update/Cancel specific orders")
    print("- GET/POST/PUT/DELETE /api/users/<id> - Complete user management")
    app.run(debug=True, host='0.0.0.0', port=5000)