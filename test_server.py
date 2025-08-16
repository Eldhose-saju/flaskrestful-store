from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*")

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/api/test')
def test():
    return jsonify({
        'success': True,
        'message': 'Minimal server working!',
        'port': 5000
    })

@app.route('/api/simple-login', methods=['POST'])
def simple_login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if username == 'admin' and password == 'admin123':
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'})

if __name__ == '__main__':
    print("Starting minimal Flask server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)