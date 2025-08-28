const http = require('http');

// Test endpoints
const endpoints = [
  { path: '/api/health', method: 'GET' },
  { path: '/api/auth/register', method: 'POST', data: {
    email: 'test@demo.com',
    password: 'test123',
    name: 'Test User'
  }},
  { path: '/api/auth/login', method: 'POST', data: {
    email: 'test@demo.com',
    password: 'test123'
  }}
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'fb_demo_key_123'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n✅ ${endpoint.method} ${endpoint.path}`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`\n❌ ${endpoint.method} ${endpoint.path}`);
      console.log('Error:', err.message);
      resolve();
    });

    if (endpoint.data) {
      req.write(JSON.stringify(endpoint.data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing FaceBlog Native Server...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✨ Tests completed!');
}

runTests();
