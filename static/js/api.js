// API Utility Functions
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`API call to ${url}:`, data);
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Test connection function
async function testConnection() {
    try {
        console.log('Testing connection to:', `${API_BASE}/test`);
        const response = await fetch(`${API_BASE}/test`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            alert('✅ Backend connection successful!\n' + data.message);
        } else {
            alert('❌ Backend responded but with error:\n' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        alert('❌ Connection failed:\n' + error.message + '\n\nMake sure Flask server is running on http://localhost:5000');
    }
}