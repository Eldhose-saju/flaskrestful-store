A full-featured ecommerce web application built with Flask REST API backend and vanilla JavaScript frontend, featuring user authentication, shopping cart functionality, order management, and comprehensive admin controls.
Features
🛍️ Customer Features

User Registration & Authentication - Secure user registration and login system
Product Browsing - Browse products with search, filtering, and sorting capabilities
Shopping Cart - Add, update, and remove items from cart
Order Management - Place orders, view order history, and track order status
Product Search & Filters - Search by name, filter by category/brand, price range, and featured products

👨‍💼 Admin Features

Product Management - Add, edit, delete products with detailed information
Order Management - View all orders, update order status, cancel orders
User Management - View all users, create new users, manage user roles
Dashboard Analytics - View statistics for products, orders, and users
Advanced Admin Controls - Complete CRUD operations for all entities

🔧 Technical Features

RESTful API - Clean API design with proper HTTP methods
Session-based Authentication - Secure session management
Role-based Access Control - Separate admin and customer interfaces
Real-time Cart Updates - Dynamic cart count and total updates
Responsive Design - Works on desktop and mobile devices
Error Handling - Comprehensive error handling and user feedback

Technology Stack
Backend

Flask - Python web framework
Flask-RESTful - REST API extension for Flask
Flask-CORS - Cross-Origin Resource Sharing support
SQLite - Lightweight database for data persistence

Frontend

HTML5 - Modern semantic markup
CSS3 - Responsive styling with modern features
Vanilla JavaScript - No frameworks, pure JavaScript for functionality
AJAX/Fetch API - Asynchronous communication with backend

Project Structure
FLASKRESTFUL-STORE/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── index.html             # Main HTML file
├── static/
│   ├── css/
│   │   └── styles.css     # Application styles
│   └── js/
│       ├── config.js      # Configuration settings
│       ├── api.js         # API communication functions
│       ├── auth.js        # Authentication functions
│       ├── products.js    # Product management functions
│       ├── cart.js        # Shopping cart functions
│       ├── orders.js      # Order management functions
│       ├── admin.js       # Admin panel functions
│       └── app.js         # Main application logic
├── routes/
│   ├── auth_routes.py     # Authentication API endpoints
│   ├── product_routes.py  # Product API endpoints
│   ├── cart_routes.py     # Shopping cart API endpoints
│   ├── order_routes.py    # Order management API endpoints
│   ├── user_routes.py     # User management API endpoints
│   └── debug_routes.py    # Debug and testing endpoints
├── database/
│   ├── db_init.py         # Database initialization
│   ├── ecommerce.db       # Main SQLite database
│   └── products.db        # Products SQLite database
└── README.md              # This file
Installation & Setup
Prerequisites


Step 1: Clone the Repository
bashgit clone <repository-url>
cd ecommerce-store
Step 2: Create Virtual Environment (Recommended)
bash# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
Step 3: Install Dependencies
bashpip install -r requirements.txt
Step 4: Initialize Database
The database will be automatically initialized when you first run the application. The app creates:

User accounts (including default admin account)
Product catalog with sample data
Cart and order tables
Proper relationships between tables

Step 5: Run the Application
bashpython app.py
The application will start on http://localhost:5000
Step 6: Access the Application

Open your web browser
Navigate to http://localhost:5000
You should see the ecommerce store homepage

Default Admin Account
For testing purposes, a default admin account is created:



Username: admin
Password: admin123




For Customers

Registration/Login

Click "Login" to access the authentication page
Register a new account or login with existing credentials
After login, you'll have access to cart and order features


Shopping

Browse products on the home page
Use search and filters to find specific products
Click "Add to Cart" to add items to your shopping cart
View cart by clicking the cart button in navigation


Checkout

Review items in your cart
Click "Checkout" to place your order
View your orders in "My Orders" section



For Administrators

Login

Use admin credentials to login
Admin users are automatically redirected to the admin panel


Product Management

Add new products with detailed information
Edit existing products
Delete products (affects existing orders)
Manage product categories, brands, and stock


Order Management

View all customer orders
Update order status (pending → processing → shipped → delivered)
Cancel pending orders
View detailed order information


User Management

View all registered users
Create new user accounts
Promote users to admin status
Delete user accounts



API Endpoints
Authentication

POST /api/auth - Login, register, logout, check authentication status

Products

GET /api/products - Get all products with optional filters
GET /api/products/<id> - Get specific product
POST /api/products - Create new product (Admin only)
PUT /api/products/<id> - Update product (Admin only)
DELETE /api/products/<id> - Delete product (Admin only)

Cart

GET /api/cart - Get user's cart
POST /api/cart - Add item to cart
PUT /api/cart/<id> - Update cart item quantity
DELETE /api/cart/<id> - Remove item from cart

Orders

GET /api/orders - Get user's orders (or all orders for admin)
GET /api/orders/<id> - Get specific order details
POST /api/orders - Place new order
PUT /api/orders/<id> - Update order status (Admin only)
DELETE /api/orders/<id> - Cancel order

Users

GET /api/users - Get all users (Admin only)
GET /api/users/<id> - Get specific user (Admin only)
POST /api/users - Create new user (Admin only)
PUT /api/users/<id> - Update user (Admin only)
DELETE /api/users/<id> - Delete user (Admin only)

Debug/Testing

GET /api/test - Test backend connectivity
GET /api/debug/users - Debug user information
POST /api/login - Alternative login endpoint

Configuration
Database Configuration
The application uses SQLite databases:

ecommerce.db - Main database (users, cart, orders)
products.db - Products database
