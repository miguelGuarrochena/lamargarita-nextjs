// Test the API endpoint directly
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  try {
    // Test without authentication first
    console.log('🔍 Testing API endpoint without authentication...');
    const response = await fetch('http://localhost:3001/api/events');
    const data = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('🔐 Authentication required - this is expected');
    }
    
  } catch (error) {
    console.error('❌ API test error:', error.message);
  }
}

testAPI();
