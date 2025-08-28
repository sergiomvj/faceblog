const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

const endpoints = [
  { method: 'GET', url: '/health', name: 'Health Check' },
  { method: 'GET', url: '/api/test-db', name: 'Database Test' },
  { method: 'GET', url: '/api/articles', name: 'Articles List' },
  { method: 'GET', url: '/api/categories', name: 'Categories List' },
  { method: 'GET', url: '/api/tags', name: 'Tags List' },
  { method: 'GET', url: '/api/comments', name: 'Comments List' },
  { method: 'GET', url: '/api/users', name: 'Users List' },
  { method: 'GET', url: '/api/tenants', name: 'Tenants List' },
  { method: 'GET', url: '/api/quizzes', name: 'Quizzes List' },
  { method: 'GET', url: '/api/leaderboards', name: 'Leaderboards' },
  { method: 'GET', url: '/api/rewards', name: 'Rewards List' },
  { method: 'GET', url: '/api/social-integrations', name: 'Social Integrations' },
  { method: 'GET', url: '/api/v1/deployment/all', name: 'Deployments' },
  { method: 'GET', url: '/api/v1/deployment/analytics', name: 'Analytics' }
];

async function testEndpoints() {
  console.log('🧪 Testing FaceBlog API Endpoints...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.url}`,
        timeout: 5000
      });
      
      console.log(`✅ ${endpoint.name}: ${response.status} - ${response.data?.data?.length || 'OK'}`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${endpoints.length} endpoints working`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All endpoints are working correctly!');
  } else {
    console.log('\n⚠️ Some endpoints need attention.');
  }
}

testEndpoints().catch(console.error);
