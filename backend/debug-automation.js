const axios = require('axios');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Debug results storage
const debugResults = {
  timestamp: new Date().toISOString(),
  environment: {
    supabaseUrl: SUPABASE_URL,
    supabaseKeyPresent: !!SUPABASE_KEY,
    baseUrl: BASE_URL
  },
  databaseTables: [],
  missingTables: [],
  workingEndpoints: [],
  failingEndpoints: [],
  fixes: []
};

// Expected tables for FaceBlog
const EXPECTED_TABLES = [
  'tenants', 'users', 'articles', 'categories', 'tags', 'comments',
  'quizzes', 'user_points', 'rewards', 'social_integrations',
  'article_tags', 'user_rewards', 'quiz_responses'
];

// Check database schema
async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Get list of all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Could not fetch table list:', error.message);
      return;
    }

    const existingTables = tables.map(t => t.table_name);
    debugResults.databaseTables = existingTables;

    console.log('✅ Existing tables:', existingTables.join(', '));

    // Check for missing tables
    const missingTables = EXPECTED_TABLES.filter(table => !existingTables.includes(table));
    debugResults.missingTables = missingTables;

    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
    } else {
      console.log('✅ All expected tables exist');
    }

  } catch (error) {
    console.log('❌ Database schema check failed:', error.message);
  }
}

// Test individual endpoint
async function testEndpoint(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    };

    if (data) config.data = data;

    const response = await axios(config);
    
    debugResults.workingEndpoints.push({
      method,
      endpoint,
      status: response.status,
      success: true
    });

    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    debugResults.failingEndpoints.push({
      method,
      endpoint,
      status: error.response?.status || 0,
      error: error.message,
      details: error.response?.data
    });

    return { success: false, error: error.message, status: error.response?.status };
  }
}

// Quick health check of all endpoints
async function quickHealthCheck() {
  console.log('\n🏥 Running quick health check...');

  const endpoints = [
    ['GET', '/health'],
    ['GET', '/api/test-db'],
    ['GET', '/api/articles'],
    ['GET', '/api/categories'],
    ['GET', '/api/tags'],
    ['GET', '/api/comments'],
    ['GET', '/api/tenants'],
    ['GET', '/api/users'],
    ['GET', '/api/quizzes'],
    ['GET', '/api/rewards'],
    ['GET', '/api/leaderboard'],
    ['GET', '/api/social-integrations']
  ];

  for (const [method, endpoint] of endpoints) {
    const result = await testEndpoint(method, endpoint);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${method} ${endpoint} - ${result.status || 'FAIL'}`);
  }
}

// Auto-fix common issues
async function autoFixIssues() {
  console.log('\n🔧 Attempting auto-fixes...');

  // Check if missing tables can be created
  for (const table of debugResults.missingTables) {
    try {
      await createMissingTable(table);
    } catch (error) {
      console.log(`❌ Could not create table ${table}:`, error.message);
    }
  }
}

// Create missing tables with basic structure
async function createMissingTable(tableName) {
  const tableSchemas = {
    quizzes: `
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        title TEXT NOT NULL,
        description TEXT,
        questions JSONB NOT NULL,
        points INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    user_points: `
      CREATE TABLE IF NOT EXISTS user_points (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        tenant_id UUID REFERENCES tenants(id),
        total_points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    rewards: `
      CREATE TABLE IF NOT EXISTS rewards (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        title TEXT NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        reward_type TEXT DEFAULT 'badge',
        reward_data JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    social_integrations: `
      CREATE TABLE IF NOT EXISTS social_integrations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        platform TEXT NOT NULL,
        access_token TEXT NOT NULL,
        settings JSONB DEFAULT '{}',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  };

  if (tableSchemas[tableName]) {
    console.log(`🔨 Creating table: ${tableName}`);
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: tableSchemas[tableName]
    });

    if (error) {
      throw error;
    }

    debugResults.fixes.push(`Created table: ${tableName}`);
    console.log(`✅ Created table: ${tableName}`);
  }
}

// Generate debug report
function generateDebugReport() {
  const report = `
# FaceBlog Debug Report
Generated: ${debugResults.timestamp}

## Environment Status
- Supabase URL: ${debugResults.environment.supabaseUrl}
- Supabase Key: ${debugResults.environment.supabaseKeyPresent ? 'Present' : 'Missing'}
- Base URL: ${debugResults.environment.baseUrl}

## Database Schema
### Existing Tables (${debugResults.databaseTables.length})
${debugResults.databaseTables.map(t => `- ${t}`).join('\n')}

### Missing Tables (${debugResults.missingTables.length})
${debugResults.missingTables.map(t => `- ${t}`).join('\n')}

## API Endpoints Status
### Working Endpoints (${debugResults.workingEndpoints.length})
${debugResults.workingEndpoints.map(e => `✅ ${e.method} ${e.endpoint} - ${e.status}`).join('\n')}

### Failing Endpoints (${debugResults.failingEndpoints.length})
${debugResults.failingEndpoints.map(e => `❌ ${e.method} ${e.endpoint} - ${e.status} - ${e.error}`).join('\n')}

## Auto-Fixes Applied (${debugResults.fixes.length})
${debugResults.fixes.map(f => `🔧 ${f}`).join('\n')}

## Recommendations
${debugResults.missingTables.length > 0 ? '- Create missing database tables' : '- Database schema is complete'}
${debugResults.failingEndpoints.length > 0 ? '- Fix failing endpoints' : '- All endpoints working'}
${debugResults.workingEndpoints.length < 10 ? '- Implement remaining endpoints' : '- API coverage is good'}
`;

  fs.writeFileSync('debug-report.md', report);
  console.log('\n📄 Debug report saved to: debug-report.md');
}

// Watch mode - continuous monitoring
async function watchMode() {
  console.log('👁️  Starting watch mode - monitoring every 30 seconds...');
  
  setInterval(async () => {
    console.log('\n🔄 Running automated health check...');
    await quickHealthCheck();
    
    const failingCount = debugResults.failingEndpoints.length;
    const workingCount = debugResults.workingEndpoints.length;
    const successRate = ((workingCount / (workingCount + failingCount)) * 100).toFixed(1);
    
    console.log(`📊 Success Rate: ${successRate}% (${workingCount}/${workingCount + failingCount})`);
    
    // Reset for next check
    debugResults.workingEndpoints = [];
    debugResults.failingEndpoints = [];
  }, 30000);
}

// Main debug function
async function runDebugAutomation() {
  console.log('🚀 Starting FaceBlog Debug Automation...\n');

  // Step 1: Check database schema
  await checkDatabaseSchema();

  // Step 2: Quick health check
  await quickHealthCheck();

  // Step 3: Auto-fix issues
  await autoFixIssues();

  // Step 4: Generate report
  generateDebugReport();

  // Step 5: Ask for watch mode
  console.log('\n🎯 Debug automation complete!');
  console.log('📊 Success Rate:', ((debugResults.workingEndpoints.length / (debugResults.workingEndpoints.length + debugResults.failingEndpoints.length)) * 100).toFixed(1) + '%');
  
  // Check if user wants watch mode
  const args = process.argv.slice(2);
  if (args.includes('--watch')) {
    await watchMode();
  } else {
    console.log('\n💡 Run with --watch flag for continuous monitoring');
    console.log('Example: node debug-automation.js --watch');
  }
}

// Run if called directly
if (require.main === module) {
  runDebugAutomation().catch(console.error);
}

module.exports = { runDebugAutomation, checkDatabaseSchema, quickHealthCheck };
