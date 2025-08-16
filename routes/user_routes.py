from flask import session
from flask_restful import Resource
from database.db_init import get_db_connection

class UsersResource(Resource):
    def get(self):
        if not session.get('is_admin'):
            return {'message': 'Admin access required'}, 403
        
        conn = get_db_connection()
        users = conn.execute('SELECT id, username, email, is_admin, created_at FROM users').fetchall()
        conn.close()
        
        return [dict(user) for user in users]