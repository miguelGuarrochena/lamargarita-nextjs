// Test script to create a user and test login
const testRegister = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@lamargarita.com',
        password: 'password123'
      }),
    });

    const data = await response.json();
    console.log('Register response:', data);
    return data;
  } catch (error) {
    console.error('Register error:', error);
  }
};

const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@lamargarita.com',
        password: 'password123'
      }),
    });

    const data = await response.json();
    console.log('Login response:', data);
    return data;
  } catch (error) {
    console.error('Login error:', error);
  }
};

// Run tests
(async () => {
  console.log('Testing registration...');
  await testRegister();
  
  console.log('\nTesting login...');
  await testLogin();
})();
