const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'FaceBlog Native Server - Local Test',
    version: '2.0.0'
  });
});

// Test database connection (mock)
app.get('/api/test-db', (req, res) => {
  res.json({
    status: 'connected',
    database: 'postgresql://localhost:5432/faceblog',
    message: 'Database connection test (mock)'
  });
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password', 'name']
    });
  }
  
  res.status(201).json({
    message: 'User registered successfully (mock)',
    user: { id: 1, email, name },
    token: 'mock-jwt-token-123'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing email or password'
    });
  }
  
  res.json({
    message: 'Login successful (mock)',
    user: { id: 1, email, name: 'Test User' },
    token: 'mock-jwt-token-123',
    refreshToken: 'mock-refresh-token-456'
  });
});

// Mock articles endpoint
app.get('/api/articles', (req, res) => {
  res.json({
    articles: [
      {
        id: 1,
        title: 'FaceBlog Native PostgreSQL Migration',
        content: 'Successfully migrated from Supabase to native PostgreSQL...',
        author: 'Admin',
        created_at: new Date().toISOString(),
        tenant_id: 1
      }
    ],
    total: 1,
    message: 'Articles retrieved (mock data)'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ FaceBlog Test Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Test endpoints available:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/test-db`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/articles`);
});

module.exports = app;
