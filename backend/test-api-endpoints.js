const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5000';
const REPORT_FILE = 'api-test-report.html';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  endpoints: []
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    return {
      success: response.status === expectedStatus,
      status: response.status,
      data: response.data,
      error: null,
      responseTime: response.headers['x-response-time'] || 'N/A'
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      error: error.message,
      responseTime: 'N/A'
    };
  }
}

// Test individual endpoint
async function testEndpoint(name, method, endpoint, data = null, expectedStatus = 200, description = '') {
  console.log(`Testing ${method} ${endpoint}...`);
  
  const result = await makeRequest(method, endpoint, data, expectedStatus);
  
  const testCase = {
    name,
    method,
    endpoint,
    description,
    data: data ? JSON.stringify(data, null, 2) : null,
    expectedStatus,
    actualStatus: result.status,
    success: result.success,
    response: result.data,
    error: result.error,
    responseTime: result.responseTime,
    timestamp: new Date().toISOString()
  };

  testResults.endpoints.push(testCase);
  testResults.totalTests++;
  
  if (result.success) {
    testResults.passedTests++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failedTests++;
    console.log(`❌ FAIL: ${name} - ${result.error || `Expected ${expectedStatus}, got ${result.status}`}`);
  }

  return result;
}

// Main test suite
async function runAllTests() {
  console.log('🚀 Starting FaceBlog API Test Suite...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timestamp: ${testResults.timestamp}\n`);

  // 1. Health Check
  await testEndpoint(
    'Health Check',
    'GET',
    '/health',
    null,
    200,
    'Basic server health check endpoint'
  );

  // 2. Database Connection Test
  await testEndpoint(
    'Database Connection',
    'GET',
    '/api/test-db',
    null,
    200,
    'Test connection to Supabase database'
  );

  // 3. Authentication Tests
  console.log('\n📋 Testing Authentication Endpoints...');
  
  await testEndpoint(
    'Login Info (GET)',
    'GET',
    '/api/auth/login',
    null,
    200,
    'Get login endpoint information'
  );

  await testEndpoint(
    'Valid Login',
    'POST',
    '/api/auth/login',
    {
      email: 'admin@demo.blogservice.com',
      password: 'admin123'
    },
    200,
    'Login with valid credentials'
  );

  await testEndpoint(
    'Invalid Login',
    'POST',
    '/api/auth/login',
    {
      email: 'invalid@email.com',
      password: 'wrongpassword'
    },
    401,
    'Login with invalid credentials'
  );

  // 4. Articles CRUD Tests
  console.log('\n📰 Testing Articles Endpoints...');
  
  await testEndpoint(
    'Get All Articles',
    'GET',
    '/api/articles',
    null,
    200,
    'Retrieve list of all articles'
  );

  // 5. Categories CRUD Tests
  console.log('\n📂 Testing Categories Endpoints...');
  
  await testEndpoint(
    'Get All Categories',
    'GET',
    '/api/categories',
    null,
    200,
    'Retrieve list of all categories'
  );

  let createdCategoryId = null;
  const createCategoryResult = await testEndpoint(
    'Create Category',
    'POST',
    '/api/categories',
    {
      name: 'Test Category',
      description: 'A test category created by automated testing',
      sort_order: 1
    },
    200,
    'Create a new category'
  );

  if (createCategoryResult.success && createCategoryResult.data?.data?.id) {
    createdCategoryId = createCategoryResult.data.data.id;
    
    await testEndpoint(
      'Get Single Category',
      'GET',
      `/api/categories/${createdCategoryId}`,
      null,
      200,
      'Retrieve a specific category by ID'
    );

    await testEndpoint(
      'Update Category',
      'PUT',
      `/api/categories/${createdCategoryId}`,
      {
        name: 'Updated Test Category',
        description: 'Updated description for test category'
      },
      200,
      'Update an existing category'
    );

    await testEndpoint(
      'Delete Category',
      'DELETE',
      `/api/categories/${createdCategoryId}`,
      null,
      200,
      'Delete a category'
    );
  }

  // Test invalid category operations
  await testEndpoint(
    'Create Category (Invalid)',
    'POST',
    '/api/categories',
    {
      description: 'Category without name'
    },
    400,
    'Attempt to create category without required name field'
  );

  await testEndpoint(
    'Get Non-existent Category',
    'GET',
    '/api/categories/non-existent-id',
    null,
    500,
    'Attempt to get a category that does not exist'
  );

  // 6. Tags CRUD Tests
  console.log('\n🏷️ Testing Tags Endpoints...');
  
  await testEndpoint(
    'Get All Tags',
    'GET',
    '/api/tags',
    null,
    200,
    'Retrieve list of all tags'
  );

  await testEndpoint(
    'Create Tag',
    'POST',
    '/api/tags',
    {
      name: 'Test Tag',
      color: '#ff6b6b',
      description: 'A test tag created by automated testing'
    },
    200,
    'Create a new tag'
  );

  await testEndpoint(
    'Create Tag (Invalid)',
    'POST',
    '/api/tags',
    {
      color: '#ff6b6b',
      description: 'Tag without name'
    },
    400,
    'Attempt to create tag without required name field'
  );

  // 7. Comments CRUD Tests
  console.log('\n💬 Testing Comments Endpoints...');
  
  await testEndpoint(
    'Get All Comments',
    'GET',
    '/api/comments',
    null,
    200,
    'Retrieve list of all comments'
  );

  await testEndpoint(
    'Create Comment',
    'POST',
    '/api/comments',
    {
      article_id: 'test-article-id',
      content: 'This is a test comment created by automated testing',
      author_name: 'Test User',
      author_email: 'test@example.com'
    },
    200,
    'Create a new comment'
  );

  await testEndpoint(
    'Create Comment (Invalid)',
    'POST',
    '/api/comments',
    {
      author_name: 'Test User'
    },
    400,
    'Attempt to create comment without required fields'
  );

  // 8. Tenants CRUD Tests
  console.log('\n🏢 Testing Tenants Endpoints...');
  
  await testEndpoint(
    'Get All Tenants',
    'GET',
    '/api/tenants',
    null,
    200,
    'Retrieve list of all tenants'
  );

  await testEndpoint(
    'Create Tenant',
    'POST',
    '/api/tenants',
    {
      name: 'Test Tenant',
      subdomain: 'test-tenant',
      plan: 'pro',
      settings: { theme: 'dark' }
    },
    200,
    'Create a new tenant'
  );

  await testEndpoint(
    'Create Tenant (Invalid)',
    'POST',
    '/api/tenants',
    {
      plan: 'basic'
    },
    400,
    'Attempt to create tenant without required fields'
  );

  // 9. Quizzes CRUD Tests
  console.log('\n🧠 Testing Quizzes Endpoints...');
  
  await testEndpoint(
    'Get All Quizzes',
    'GET',
    '/api/quizzes',
    null,
    200,
    'Retrieve list of all quizzes'
  );

  await testEndpoint(
    'Create Quiz',
    'POST',
    '/api/quizzes',
    {
      title: 'Test Quiz',
      description: 'A test quiz for automated testing',
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correct: 1
        }
      ],
      points: 10
    },
    200,
    'Create a new quiz'
  );

  await testEndpoint(
    'Create Quiz (Invalid)',
    'POST',
    '/api/quizzes',
    {
      description: 'Quiz without title'
    },
    400,
    'Attempt to create quiz without required fields'
  );

  // 10. Ranking/Leaderboard Tests
  console.log('\n🏆 Testing Ranking Endpoints...');
  
  await testEndpoint(
    'Get Leaderboard',
    'GET',
    '/api/leaderboard',
    null,
    200,
    'Retrieve top 10 users leaderboard'
  );

  await testEndpoint(
    'Get User Points',
    'GET',
    '/api/user/demo-user-id/points',
    null,
    200,
    'Retrieve points for specific user'
  );

  // 11. Rewards/Premiation Tests
  console.log('\n🎁 Testing Rewards Endpoints...');
  
  await testEndpoint(
    'Get All Rewards',
    'GET',
    '/api/rewards',
    null,
    200,
    'Retrieve list of all rewards'
  );

  await testEndpoint(
    'Create Reward',
    'POST',
    '/api/rewards',
    {
      title: 'Test Badge',
      description: 'A test reward badge',
      points_required: 100,
      reward_type: 'badge',
      reward_data: { icon: 'star', color: 'gold' }
    },
    200,
    'Create a new reward'
  );

  await testEndpoint(
    'Create Reward (Invalid)',
    'POST',
    '/api/rewards',
    {
      description: 'Reward without title'
    },
    400,
    'Attempt to create reward without required fields'
  );

  // 12. Social Integrations Tests
  console.log('\n📱 Testing Social Integrations Endpoints...');
  
  await testEndpoint(
    'Get Social Integrations',
    'GET',
    '/api/social-integrations',
    null,
    200,
    'Retrieve list of all social integrations'
  );

  await testEndpoint(
    'Create Social Integration',
    'POST',
    '/api/social-integrations',
    {
      platform: 'facebook',
      access_token: 'test-token-123',
      settings: { auto_post: true, page_id: 'test-page' }
    },
    200,
    'Create a new social integration'
  );

  await testEndpoint(
    'Create Social Integration (Invalid)',
    'POST',
    '/api/social-integrations',
    {
      settings: { auto_post: true }
    },
    400,
    'Attempt to create social integration without required fields'
  );

  // 13. Users CRUD Tests
  console.log('\n👥 Testing Users Endpoints...');
  
  await testEndpoint(
    'Get All Users',
    'GET',
    '/api/users',
    null,
    200,
    'Retrieve list of all users'
  );

  await testEndpoint(
    'Create User',
    'POST',
    '/api/users',
    {
      email: 'testuser@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'editor'
    },
    200,
    'Create a new user'
  );

  await testEndpoint(
    'Create User (Invalid)',
    'POST',
    '/api/users',
    {
      email: 'testuser@example.com'
    },
    400,
    'Attempt to create user without required fields'
  );

  // Generate and save report
  generateReport();
  
  console.log('\n📊 Test Summary:');
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passedTests} ✅`);
  console.log(`Failed: ${testResults.failedTests} ❌`);
  console.log(`Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);
  console.log(`\n📄 Detailed report saved to: ${REPORT_FILE}`);
}

// Generate HTML report
function generateReport() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FaceBlog API Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .total { color: #007bff; }
        .success-rate { color: #17a2b8; }
        .test-results { margin-top: 20px; }
        .test-item { border: 1px solid #ddd; margin-bottom: 10px; border-radius: 6px; overflow: hidden; }
        .test-header { padding: 15px; background: #f8f9fa; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .test-header:hover { background: #e9ecef; }
        .test-status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .status-pass { background: #28a745; }
        .status-fail { background: #dc3545; }
        .test-details { padding: 15px; background: #fff; display: none; }
        .test-details.show { display: block; }
        .method { padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; color: white; }
        .method-get { background: #28a745; }
        .method-post { background: #007bff; }
        .method-put { background: #ffc107; color: #000; }
        .method-delete { background: #dc3545; }
        .json { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em; white-space: pre-wrap; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 FaceBlog API Test Report</h1>
            <p class="timestamp">Generated: ${testResults.timestamp}</p>
            <p>Base URL: <code>${testResults.baseUrl}</code></p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number total">${testResults.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="number passed">${testResults.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number failed">${testResults.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="number success-rate">${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%</div>
            </div>
        </div>

        <div class="test-results">
            <h2>📋 Test Results</h2>
            ${testResults.endpoints.map((test, index) => `
                <div class="test-item">
                    <div class="test-header" onclick="toggleDetails(${index})">
                        <div>
                            <span class="method method-${test.method.toLowerCase()}">${test.method}</span>
                            <strong>${test.name}</strong>
                            <span style="color: #666; margin-left: 10px;">${test.endpoint}</span>
                        </div>
                        <div>
                            <span class="test-status status-${test.success ? 'pass' : 'fail'}">
                                ${test.success ? 'PASS' : 'FAIL'}
                            </span>
                            <span style="margin-left: 10px; color: #666;">${test.actualStatus}</span>
                        </div>
                    </div>
                    <div class="test-details" id="details-${index}">
                        <p><strong>Description:</strong> ${test.description}</p>
                        <p><strong>Expected Status:</strong> ${test.expectedStatus}</p>
                        <p><strong>Actual Status:</strong> ${test.actualStatus}</p>
                        <p><strong>Response Time:</strong> ${test.responseTime}</p>
                        ${test.data ? `<p><strong>Request Data:</strong></p><div class="json">${test.data}</div>` : ''}
                        ${test.response ? `<p><strong>Response:</strong></p><div class="json">${JSON.stringify(test.response, null, 2)}</div>` : ''}
                        ${test.error ? `<p><strong>Error:</strong> <span style="color: #dc3545;">${test.error}</span></p>` : ''}
                        <p><strong>Timestamp:</strong> ${test.timestamp}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        function toggleDetails(index) {
            const details = document.getElementById('details-' + index);
            details.classList.toggle('show');
        }
    </script>
</body>
</html>
  `;

  fs.writeFileSync(REPORT_FILE, html);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testEndpoint };
