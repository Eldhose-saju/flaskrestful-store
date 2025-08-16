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

# Register API Routes
api.add_resource(AuthResource, '/api/auth')
api.add_resource(ProductsResource, '/api/products', '/api/products/<int:product_id>')
api.add_resource(CartResource, '/api/cart', '/api/cart/<int:cart_id>')
api.add_resource(OrdersResource, '/api/orders')
api.add_resource(UsersResource, '/api/users')

# Register debug routes
register_debug_routes(app)

if __name__ == '__main__':
    init_db()
    print("Starting Flask server...")
    print("Backend will be available at: http://localhost:5000")
    print("Make sure to access your HTML file through a local server, not file://")
    app.run(debug=True, host='0.0.0.0', port=5000)