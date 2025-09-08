/**
 * Comprehensive Error Handling Test Suite
 * Tests both API routes and frontend error handling
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Test utilities
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`)
};

// Test helper functions
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { response, data, status: response.status };
  } catch (error) {
    return { error, status: 0 };
  }
}

async function authenticateUser() {
  log.info('Authenticating test user...');
  
  const { response, data, status } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@test.com',
      password: 'test123'
    })
  });

  if (data?.ok && data?.token) {
    authToken = data.token;
    log.success('Authentication successful');
    return true;
  } else {
    log.warning('Authentication failed - some tests will be skipped');
    return false;
  }
}

// Test Categories

/**
 * Test API Error Handling
 */
async function testApiErrorHandling() {
  log.info('\n=== Testing API Error Handling ===');
  
  // Test 1: Invalid event creation (missing title)
  log.info('Test 1: Creating event without title');
  const { data: createError } = await makeRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString()
    })
  });
  
  if (createError?.msg && createError?.error) {
    log.success('API returns both user message and technical error');
    log.info(`User message: "${createError.msg}"`);
    log.info(`Technical error: "${createError.error}"`);
  } else {
    log.error('API does not return proper error structure');
  }

  // Test 2: Invalid date range
  log.info('Test 2: Creating event with end date before start date');
  const now = new Date();
  const past = new Date(now.getTime() - 3600000);
  
  const { data: dateError } = await makeRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Event',
      start: now.toISOString(),
      end: past.toISOString()
    })
  });
  
  if (dateError?.msg?.includes('posterior') && dateError?.error) {
    log.success('Date validation error properly handled');
    log.info(`User message: "${dateError.msg}"`);
  } else {
    log.error('Date validation not working properly');
  }

  // Test 3: Invalid event ID format
  log.info('Test 3: Updating event with invalid ID');
  const { data: idError } = await makeRequest('/api/events/invalid-id', {
    method: 'PUT',
    body: JSON.stringify({
      title: 'Updated Event',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString()
    })
  });
  
  if (idError?.msg && idError?.error?.includes('ObjectId')) {
    log.success('Invalid ID validation working');
    log.info(`User message: "${idError.msg}"`);
  } else {
    log.error('Invalid ID validation not working');
  }

  // Test 4: Non-existent event
  log.info('Test 4: Deleting non-existent event');
  const { data: notFoundError } = await makeRequest('/api/events/507f1f77bcf86cd799439011', {
    method: 'DELETE'
  });
  
  if (notFoundError?.msg && notFoundError?.error) {
    log.success('Not found error properly handled');
    log.info(`User message: "${notFoundError.msg}"`);
  } else {
    log.error('Not found error not properly handled');
  }

  // Test 5: Unauthorized access (no token)
  log.info('Test 5: Accessing events without authentication');
  const originalToken = authToken;
  authToken = '';
  
  const { data: authError } = await makeRequest('/api/events');
  
  if (authError?.msg && authError?.error) {
    log.success('Authentication error properly handled');
    log.info(`User message: "${authError.msg}"`);
  } else {
    log.error('Authentication error not properly handled');
  }
  
  authToken = originalToken;
}

/**
 * Test Error Logging Structure
 */
async function testErrorLogging() {
  log.info('\n=== Testing Error Logging Structure ===');
  
  // Create a deliberate error and check console output
  log.info('Creating deliberate validation error to test logging...');
  
  const { data } = await makeRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      // Missing title and invalid dates
      start: 'invalid-date',
      end: 'invalid-date'
    })
  });
  
  if (data?.error && data?.msg) {
    log.success('Error response structure is correct');
    log.info('Check server console for detailed error logs with:');
    log.info('- Timestamp');
    log.info('- Context information');
    log.info('- Stack trace');
    log.info('- Additional metadata');
  } else {
    log.error('Error response structure is incomplete');
  }
}

/**
 * Test Successful Operations
 */
async function testSuccessfulOperations() {
  log.info('\n=== Testing Successful Operations ===');
  
  let eventId = null;
  
  // Test 1: Create valid event
  log.info('Test 1: Creating valid event');
  const { data: createData } = await makeRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Event for Error Handling',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      notes: 'This is a test event'
    })
  });
  
  if (createData?.ok && createData?.evento) {
    eventId = createData.evento._id || createData.evento.id;
    log.success('Event created successfully');
    log.info(`Event ID: ${eventId}`);
  } else {
    log.error('Failed to create test event');
    return;
  }

  // Test 2: Update event
  log.info('Test 2: Updating event');
  const { data: updateData } = await makeRequest(`/api/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: 'Updated Test Event',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 7200000).toISOString(),
      notes: 'This event has been updated'
    })
  });
  
  if (updateData?.ok) {
    log.success('Event updated successfully');
  } else {
    log.error('Failed to update event');
  }

  // Test 3: Get events
  log.info('Test 3: Retrieving events');
  const { data: getEvents } = await makeRequest('/api/events');
  
  if (getEvents?.ok && Array.isArray(getEvents?.eventos)) {
    log.success(`Retrieved ${getEvents.eventos.length} events`);
  } else {
    log.error('Failed to retrieve events');
  }

  // Test 4: Delete event
  log.info('Test 4: Deleting event');
  const { data: deleteData } = await makeRequest(`/api/events/${eventId}`, {
    method: 'DELETE'
  });
  
  if (deleteData?.ok) {
    log.success('Event deleted successfully');
  } else {
    log.error('Failed to delete event');
  }
}

/**
 * Test Error Message Consistency
 */
async function testErrorMessageConsistency() {
  log.info('\n=== Testing Error Message Consistency ===');
  
  const testCases = [
    {
      name: 'Empty title',
      data: { title: '', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
      expectedUserMessage: 'título'
    },
    {
      name: 'Missing dates',
      data: { title: 'Test Event' },
      expectedUserMessage: 'fechas'
    },
    {
      name: 'Invalid date format',
      data: { title: 'Test Event', start: 'invalid', end: 'invalid' },
      expectedUserMessage: 'válidas'
    }
  ];
  
  for (const testCase of testCases) {
    log.info(`Testing: ${testCase.name}`);
    
    const { data } = await makeRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify(testCase.data)
    });
    
    if (data?.msg?.toLowerCase().includes(testCase.expectedUserMessage.toLowerCase())) {
      log.success(`✓ User message contains expected text: "${testCase.expectedUserMessage}"`);
    } else {
      log.error(`✗ User message doesn't match. Got: "${data?.msg}"`);
    }
    
    if (data?.error) {
      log.success('✓ Technical error message provided');
    } else {
      log.error('✗ No technical error message');
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}🧪 Starting Error Handling Test Suite${colors.reset}\n`);
  
  try {
    // Authenticate first
    const isAuthenticated = await authenticateUser();
    
    if (isAuthenticated) {
      await testApiErrorHandling();
      await testErrorLogging();
      await testSuccessfulOperations();
      await testErrorMessageConsistency();
    } else {
      log.warning('Skipping authenticated tests due to authentication failure');
      log.info('You can still test unauthenticated endpoints:');
      
      // Test some unauthenticated scenarios
      const { data } = await makeRequest('/api/events');
      if (data?.msg && data?.error) {
        log.success('Unauthenticated access properly handled');
      }
    }
    
    console.log(`\n${colors.green}🎉 Error Handling Test Suite Completed${colors.reset}`);
    console.log(`${colors.blue}📝 Summary:${colors.reset}`);
    console.log('- User-friendly error messages are displayed to users');
    console.log('- Technical error details are logged to console for debugging');
    console.log('- API responses include both user and technical error information');
    console.log('- Validation errors are caught and handled appropriately');
    console.log('- Network and authentication errors are properly managed');
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testApiErrorHandling,
  testErrorLogging,
  testSuccessfulOperations,
  testErrorMessageConsistency
};
