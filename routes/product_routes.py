from flask import request, jsonify, session
from flask_restful import Resource
from database.db_init import get_products_db_connection

class ProductsResource(Resource):
    def options(self, product_id=None):
        return jsonify({'status': 'OK'})
    
    def get(self, product_id=None):
        conn = get_products_db_connection()
        
        if product_id:
            product = conn.execute(
                'SELECT * FROM products WHERE id = ?', (product_id,)
            ).fetchone()
            conn.close()
            
            if product:
                return dict(product)
            return {'message': 'Product not found'}, 404
        
        # Handle search parameters
        search_query = request.args.get('search', '').strip()
        category = request.args.get('category', '').strip()
        brand = request.args.get('brand', '').strip()
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        featured = request.args.get('featured', type=bool)
        sort_by = request.args.get('sort', 'name')  # name, price_asc, price_desc, newest
        
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        if per_page > 50:  # Limit max per page
            per_page = 50
        offset = (page - 1) * per_page
        
        # Build dynamic query
        where_conditions = []
        params = []
        
        if search_query:
            where_conditions.append('''
                (name LIKE ? OR description LIKE ? OR category LIKE ? OR brand LIKE ? OR tags LIKE ?)
            ''')
            search_param = f'%{search_query}%'
            params.extend([search_param] * 5)
        
        if category:
            where_conditions.append('category = ?')
            params.append(category)
            
        if brand:
            where_conditions.append('brand = ?')
            params.append(brand)
            
        if min_price is not None:
            where_conditions.append('price >= ?')
            params.append(min_price)
            
        if max_price is not None:
            where_conditions.append('price <= ?')
            params.append(max_price)
            
        if featured is not None:
            where_conditions.append('featured = ?')
            params.append(1 if featured else 0)
        
        # Build WHERE clause
        where_clause = ''
        if where_conditions:
            where_clause = 'WHERE ' + ' AND '.join(where_conditions)
        
        # Build ORDER BY clause
        order_clause = {
            'name': 'ORDER BY name ASC',
            'price_asc': 'ORDER BY price ASC',
            'price_desc': 'ORDER BY price DESC',
            'newest': 'ORDER BY created_at DESC',
            'featured': 'ORDER BY featured DESC, name ASC'
        }.get(sort_by, 'ORDER BY name ASC')
        
        # Execute query with pagination
        query = f'SELECT * FROM products {where_clause} {order_clause} LIMIT ? OFFSET ?'
        params.append(per_page)
        params.append(offset)
        products = conn.execute(query, params).fetchall()
        
        # Get total count for pagination
        count_query = f'SELECT COUNT(*) FROM products {where_clause}'
        total_products = conn.execute(count_query, params[:-2]).fetchone()[0]  # Remove LIMIT and OFFSET params
        
        # Get filter options for frontend
        categories = conn.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').fetchall()
        brands = conn.execute('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand').fetchall()
        
        conn.close()
        
        result = {
            'products': [dict(product) for product in products],
            'filters': {
                'categories': [cat['category'] for cat in categories],
                'brands': [brand['brand'] for brand in brands]
            },
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_products,
                'total_pages': (total_products + per_page - 1) // per_page  # Ceiling division
            }
        }
        
        return result
    
    def post(self):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        data = request.json
        if not data:
            return {'message': 'No data provided'}, 400
            
        # Validate required fields
        required_fields = ['name', 'price', 'stock']
        for field in required_fields:
            if field not in data:
                return {'message': f'{field} is required'}, 400
        
        conn = get_products_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO products (name, description, price, stock, category, brand, tags, image_url, featured, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ''', (
            data['name'],
            data.get('description', ''),
            data['price'],
            data['stock'],
            data.get('category', ''),
            data.get('brand', ''),
            data.get('tags', ''),
            data.get('image_url', ''),
            data.get('featured', 0)
        ))
        
        product_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {'success': True, 'id': product_id, 'message': 'Product created successfully'}
    
    def put(self, product_id):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        data = request.json
        if not data:
            return {'message': 'No data provided'}, 400
        
        conn = get_products_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        existing = cursor.execute('SELECT id FROM products WHERE id = ?', (product_id,)).fetchone()
        if not existing:
            conn.close()
            return {'message': 'Product not found'}, 404
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        updatable_fields = ['name', 'description', 'price', 'stock', 'category', 'brand', 'tags', 'image_url', 'featured']
        for field in updatable_fields:
            if field in data:
                update_fields.append(f'{field} = ?')
                update_values.append(data[field])
        
        if not update_fields:
            conn.close()
            return {'message': 'No valid fields to update'}, 400
        
        update_fields.append('updated_at = datetime("now")')
        update_values.append(product_id)
        
        cursor.execute(
            f'UPDATE products SET {", ".join(update_fields)} WHERE id = ?',
            update_values
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Product updated successfully'}
    
    def delete(self, product_id):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        conn = get_products_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        existing = cursor.execute('SELECT id FROM products WHERE id = ?', (product_id,)).fetchone()
        if not existing:
            conn.close()
            return {'message': 'Product not found'}, 404
        
        cursor.execute('DELETE FROM products WHERE id = ?', (product_id,))
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Product deleted successfully'}