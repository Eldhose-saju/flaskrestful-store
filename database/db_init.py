import sqlite3
import hashlib
import os

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    conn = sqlite3.connect('store.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_products_db_connection():
    conn = sqlite3.connect('products.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    print("Initializing databases...")
    
    # Initialize main store database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
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
    
    # Create cart table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id, product_id)
        )
    ''')
    
    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Create order_items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        )
    ''')
    
    # Check if admin user exists
    admin_exists = cursor.execute(
        'SELECT COUNT(*) FROM users WHERE username = ?', ('admin',)
    ).fetchone()[0]
    
    if admin_exists == 0:
        print("Creating admin user...")
        cursor.execute(
            'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
            ('admin', 'admin@store.com', hash_password('admin123'), 1)
        )
        print("Admin user created - username: admin, password: admin123")
    
    conn.commit()
    conn.close()
    print("Main database initialized successfully")
    
    # Initialize products database with complete schema
    products_conn = get_products_db_connection()
    products_cursor = products_conn.cursor()
    
    # Drop existing products table if it exists (to rebuild with correct schema)
    products_cursor.execute('DROP TABLE IF EXISTS products')
    
    # Create products table with all required columns
    products_cursor.execute('''
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            category TEXT DEFAULT '',
            brand TEXT DEFAULT '',
            tags TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            featured INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert sample products with all fields
    sample_products = [
        # Electronics
        ('Gaming Laptop Pro', 'High-performance gaming laptop with RTX 4070, Intel i7, and 16GB RAM. Perfect for gaming and content creation.', 1299.99, 15, 'Electronics', 'TechBrand', 'laptop,gaming,rtx,intel', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', 1),
        ('Wireless Gaming Mouse', 'Ergonomic wireless gaming mouse with RGB lighting and precision sensor.', 79.99, 50, 'Electronics', 'TechBrand', 'mouse,gaming,wireless,rgb', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', 0),
        ('4K Monitor 27inch', 'Ultra-sharp 4K display with HDR support and USB-C connectivity.', 329.99, 25, 'Electronics', 'DisplayCorp', 'monitor,4k,hdr,usb-c', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 1),
        ('Mechanical Keyboard', 'Premium mechanical keyboard with customizable RGB backlighting.', 149.99, 30, 'Electronics', 'TechBrand', 'keyboard,mechanical,rgb,custom', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400', 0),
        ('Smartphone Pro Max', 'Latest flagship smartphone with advanced camera system and 5G.', 999.99, 20, 'Electronics', 'PhoneCorp', 'smartphone,5g,camera,flagship', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 1),
        ('Wireless Earbuds', 'Premium wireless earbuds with noise cancellation and wireless charging.', 199.99, 75, 'Electronics', 'AudioTech', 'earbuds,wireless,noise-cancellation', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', 1),
        ('Smart Watch Series X', 'Advanced smartwatch with health tracking and GPS.', 299.99, 40, 'Electronics', 'WearTech', 'smartwatch,health,gps,fitness', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400', 0),
        ('Gaming Headset', 'Professional gaming headset with 7.1 surround sound.', 89.99, 45, 'Electronics', 'AudioTech', 'headset,gaming,surround,microphone', 'https://images.unsplash.com/photo-1599669454699-248893623440?w=400', 0),
        ('Portable SSD 1TB', 'Ultra-fast portable SSD for data storage and backup.', 129.99, 35, 'Electronics', 'StoragePlus', 'ssd,portable,storage,backup', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400', 0),
        
        # Clothing
        ('Premium Hoodie', 'Comfortable cotton blend hoodie perfect for casual wear.', 59.99, 100, 'Clothing', 'ComfortWear', 'hoodie,cotton,casual,comfortable', 'https://images.unsplash.com/photo-1556821840-3a9c6ee2b553?w=400', 0),
        ('Designer Jeans', 'Premium denim jeans with perfect fit and durability.', 89.99, 60, 'Clothing', 'DenimCo', 'jeans,denim,premium,casual', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', 1),
        ('Running Shoes', 'Lightweight running shoes with advanced cushioning technology.', 129.99, 80, 'Clothing', 'SportsFit', 'shoes,running,lightweight,cushioning', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', 1),
        ('Casual T-Shirt', 'Soft organic cotton t-shirt in multiple colors.', 24.99, 150, 'Clothing', 'ComfortWear', 'tshirt,cotton,organic,casual', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 0),
        ('Winter Jacket', 'Warm and waterproof winter jacket for outdoor adventures.', 179.99, 25, 'Clothing', 'OutdoorGear', 'jacket,winter,waterproof,outdoor', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 0),
        ('Sports Leggings', 'High-performance leggings for yoga and fitness activities.', 49.99, 70, 'Clothing', 'SportsFit', 'leggings,yoga,fitness,performance', 'https://images.unsplash.com/photo-1506629905607-0b8c3b57e23d?w=400', 0),
        
        # Home & Kitchen
        ('Coffee Maker Deluxe', 'Premium coffee maker with programmable settings and thermal carafe.', 199.99, 30, 'Home & Kitchen', 'KitchenPro', 'coffee,maker,programmable,thermal', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 1),
        ('Air Fryer XL', 'Large capacity air fryer for healthy cooking without oil.', 129.99, 40, 'Home & Kitchen', 'KitchenPro', 'airfryer,healthy,oil-free,cooking', 'https://images.unsplash.com/photo-1585515656522-926b4d76aca3?w=400', 0),
        ('Smart Thermostat', 'WiFi-enabled smart thermostat with energy-saving features.', 249.99, 20, 'Home & Kitchen', 'SmartHome', 'thermostat,smart,wifi,energy-saving', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 1),
        ('Robot Vacuum', 'Intelligent robot vacuum with mapping and app control.', 399.99, 15, 'Home & Kitchen', 'CleanBot', 'vacuum,robot,smart,mapping', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 1),
        ('Blender Pro', 'High-speed blender perfect for smoothies and food preparation.', 89.99, 35, 'Home & Kitchen', 'KitchenPro', 'blender,smoothies,high-speed,food-prep', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400', 0),
        
        # Sports & Outdoors
        ('Yoga Mat Premium', 'Non-slip eco-friendly yoga mat with alignment guides.', 39.99, 60, 'Sports & Outdoors', 'FitLife', 'yoga,mat,eco-friendly,non-slip', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400', 0),
        ('Mountain Bike', 'All-terrain mountain bike with 21-speed transmission.', 599.99, 10, 'Sports & Outdoors', 'BikeWorks', 'bike,mountain,21-speed,terrain', 'https://images.unsplash.com/photo-1544191696-15693e1c0ccb?w=400', 1),
        ('Camping Tent 4-Person', 'Waterproof camping tent for 4 people with easy setup.', 149.99, 25, 'Sports & Outdoors', 'OutdoorGear', 'tent,camping,waterproof,4-person', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400', 0),
        ('Fitness Tracker', 'Advanced fitness tracker with heart rate monitoring.', 79.99, 55, 'Sports & Outdoors', 'FitLife', 'fitness,tracker,heart-rate,monitoring', 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400', 0),
        ('Basketball Official', 'Official size and weight basketball for indoor/outdoor play.', 29.99, 40, 'Sports & Outdoors', 'SportsPro', 'basketball,official,indoor,outdoor', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400', 0),
    ]
    
    print("Inserting sample products...")
    for product in sample_products:
        products_cursor.execute('''
            INSERT INTO products (name, description, price, stock, category, brand, tags, image_url, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', product)
    
    products_conn.commit()
    products_conn.close()
    
    print(f"Products database initialized successfully with {len(sample_products)} products")
    print("\n=== DATABASE INITIALIZATION COMPLETE ===")
    print("Available test accounts:")
    print("  Admin: username=admin, password=admin123")
    print("\nSample products added across categories:")
    print("  - Electronics (9 products, 4 featured)")
    print("  - Clothing (6 products, 2 featured)")  
    print("  - Home & Kitchen (5 products, 3 featured)")
    print("  - Sports & Outdoors (5 products, 1 featured)")
    print("\nTotal: 25 products with proper featured flags and complete data")

if __name__ == '__main__':
    init_db()