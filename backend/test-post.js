const axios = require('axios');

async function testPostEndpoints() {
    console.log('🧪 Testing POST endpoints...\n');
    
    const baseURL = 'http://localhost:5000';
    
    // Test data
    const testArticle = {
        title: 'Test Article',
        content: 'This is test content for the article',
        excerpt: 'Test excerpt',
        status: 'published',
        author_name: 'Test Author',
        author_email: 'test@example.com'
    };
    
    const timestamp = Date.now();
    
    const testCategory = {
        name: `Test Category ${timestamp}`,
        slug: `test-category-${timestamp}`,
        description: 'Test category description'
    };
    
    const testTag = {
        name: `Test Tag ${timestamp}`,
        slug: `test-tag-${timestamp}`,
        color: '#FF5733'
    };
    
    const testUser = {
        email: `testuser${timestamp}@example.com`,
        password_hash: '$2b$10$example.hash.for.testing.purposes.only',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
    };
    
    const endpoints = [
        { method: 'POST', url: '/api/articles', data: testArticle, name: 'Create Article' },
        { method: 'POST', url: '/api/categories', data: testCategory, name: 'Create Category' },
        { method: 'POST', url: '/api/tags', data: testTag, name: 'Create Tag' },
        { method: 'POST', url: '/api/users', data: testUser, name: 'Create User' }
    ];
    
    let successCount = 0;
    let failCount = 0;
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.method} ${endpoint.url}...`);
            
            const response = await axios({
                method: endpoint.method,
                url: `${baseURL}${endpoint.url}`,
                data: endpoint.data,
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });
            
            console.log(`✅ ${endpoint.name} - Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
            successCount++;
            
        } catch (error) {
            console.log(`❌ ${endpoint.name} - Error: ${error.response?.status || 'Network Error'}`);
            console.log(`   Details: ${error.response?.data?.error || error.message}`);
            console.log(`   Full Response: ${JSON.stringify(error.response?.data).substring(0, 200)}...\n`);
            failCount++;
        }
    }
    
    console.log(`📊 POST Test Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Success Rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
}

// Run if called directly
if (require.main === module) {
    testPostEndpoints().catch(console.error);
}

module.exports = { testPostEndpoints };
