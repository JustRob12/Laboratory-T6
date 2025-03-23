const axios = require('axios');

async function testApiLogin() {
  try {
    console.log('Testing login to API...');
    const response = await axios.post('http://localhost:3000/login', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
    
    // Test notes endpoint with token
    if (response.data.token) {
      console.log('\nTesting notes endpoint with token...');
      const notesResponse = await axios.get('http://localhost:3000/notes', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('Notes retrieved successfully!');
      console.log('Notes:', notesResponse.data);
    }
  } catch (error) {
    console.error('API test failed:', error.message);
    if (error.response) {
      console.log('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.log('No response received');
    }
  }
}

testApiLogin(); 