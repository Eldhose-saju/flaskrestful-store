from flask import request, jsonify, session
from flask_restful import Resource
from database.db_init import get_db_connection

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