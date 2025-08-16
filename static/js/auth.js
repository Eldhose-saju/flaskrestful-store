// Auth Functions
async function checkAuthStatus() {
    try {
        const result = await apiCall('/auth', {
            method: 'POST',
            body: JSON.stringify({
                action: 'check'
            })
        });
        
        if (result.success) {
            currentUser = result.user;
            updateUI();
        } else {
            currentUser = null;
            showSection('auth');
            updateUI();
        }
    } catch (error) {
        console.log('Not authenticated');
        currentUser = null;
        showSection('auth');
        updateUI();
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    console.log('Login attempt:', { username, password: '***' });
    
    if (!username || !password) {
        document.getElementById('login-error').textContent = 'Please enter both username and password';
        return;
    }
    
    try {
        console.log('Making login request to:', `${API_BASE}/auth`);
        
        const response = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });
        
        console.log('Login response status:', response.status);
        console.log('Login response headers:', [...response.headers.entries()]);
        
        const result = await response.json();
        console.log('Login result:', result);
        
        if (result.success) {
            currentUser = result.user;
            console.log('Login successful, user:', currentUser);
            updateUI();
            document.getElementById('login-error').textContent = '';
            // Clear form
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
        } else {
            console.log('Login failed:', result.message);
            document.getElementById('login-error').textContent = result.message || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('login-error').textContent = 'Network error. Please try again.';
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    const result = await apiCall('/auth', {
        method: 'POST',
        body: JSON.stringify({
            action: 'register',
            username: username,
            email: email,
            password: password
        })
    });
    
    if (result.success) {
        document.getElementById('register-success').textContent = 'Registration successful! Please login.';
        document.getElementById('register-error').textContent = '';
        setTimeout(() => switchAuthTab('login'), 2000);
    } else {
        document.getElementById('register-error').textContent = result.message;
        document.getElementById('register-success').textContent = '';
    }
}

async function logout() {
    await apiCall('/auth', {
        method: 'POST',
        body: JSON.stringify({
            action: 'logout'
        })
    });
    
    currentUser = null;
    currentCart = [];
    showSection('auth');
    updateUI();
}