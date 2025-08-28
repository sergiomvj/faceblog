const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up FaceBlog Development Environment...\n');

// Check if Docker is installed
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker-compose --version', { stdio: 'pipe' });
    console.log('✅ Docker and Docker Compose found');
    return true;
  } catch (error) {
    console.log('❌ Docker not found. Please install Docker Desktop first.');
    console.log('   Download: https://www.docker.com/products/docker-desktop');
    return false;
  }
}

// Setup environment file
function setupEnv() {
  const envDev = path.join(__dirname, '..', '.env.development');
  const envTarget = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envTarget)) {
    fs.copyFileSync(envDev, envTarget);
    console.log('✅ Environment file created (.env)');
  } else {
    console.log('⚠️  Environment file already exists (.env)');
  }
}

// Start PostgreSQL with Docker
function startDatabase() {
  try {
    console.log('🐳 Starting PostgreSQL container...');
    execSync('docker-compose -f docker-compose.dev.yml up -d postgres', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Wait for database to be ready
    console.log('⏳ Waiting for database to be ready...');
    let retries = 30;
    while (retries > 0) {
      try {
        execSync('docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U faceblog_user -d faceblog_development', {
          stdio: 'pipe',
          cwd: path.join(__dirname, '..')
        });
        console.log('✅ PostgreSQL is ready!');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Database failed to start');
        }
        process.stdout.write('.');
        require('child_process').execSync('sleep 1', { stdio: 'pipe' });
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Failed to start database:', error.message);
    return false;
  }
}

// Install dependencies
function installDependencies() {
  try {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Dependencies installed');
    return true;
  } catch (error) {
    console.log('❌ Failed to install dependencies:', error.message);
    return false;
  }
}

// Test database connection
function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const { testConnection } = require('../src/config/database-vps');
    
    // Give it a moment to connect
    setTimeout(async () => {
      try {
        const connected = await testConnection();
        if (connected) {
          console.log('✅ Database connection successful!');
          console.log('\n🎉 Development environment ready!');
          console.log('\n📋 Next steps:');
          console.log('   npm start              # Start the server');
          console.log('   npm run dev            # Start with nodemon');
          console.log('   docker-compose -f docker-compose.dev.yml logs postgres  # View DB logs');
          console.log('\n🌐 Server will be available at: http://localhost:5000');
          console.log('🗄️  Database available at: localhost:5432');
        } else {
          console.log('❌ Database connection failed');
        }
      } catch (error) {
        console.log('❌ Database connection test failed:', error.message);
      }
    }, 2000);
    
  } catch (error) {
    console.log('⚠️  Could not test connection immediately. Try running npm start');
  }
}

// Main setup function
async function main() {
  console.log('FaceBlog Development Setup');
  console.log('==========================\n');
  
  // Check prerequisites
  if (!checkDocker()) {
    process.exit(1);
  }
  
  // Setup steps
  setupEnv();
  
  if (!installDependencies()) {
    process.exit(1);
  }
  
  if (!startDatabase()) {
    process.exit(1);
  }
  
  testConnection();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🔄 Cleaning up...');
  try {
    execSync('docker-compose -f docker-compose.dev.yml down', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});
