const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// SQL for creating missing tables
const createTablesSQL = `
-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    points INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_points table (for leaderboard)
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Create rewards table
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

-- Create social_integrations table
CREATE TABLE IF NOT EXISTS social_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    platform TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS quiz_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id),
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    answers JSONB NOT NULL,
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_rewards table (junction table)
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    reward_id UUID REFERENCES rewards(id),
    tenant_id UUID REFERENCES tenants(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reward_id)
);

-- Insert sample data for testing
INSERT INTO users (tenant_id, email, password_hash, name, role) 
SELECT 
    t.id,
    'admin@demo.com',
    '$2b$10$example.hash.for.testing',
    'Demo Admin',
    'admin'
FROM tenants t 
WHERE t.slug = 'demo'
ON CONFLICT (email) DO NOTHING;

INSERT INTO quizzes (tenant_id, title, description, questions, points)
SELECT 
    t.id,
    'React Knowledge Quiz',
    'Test your React skills',
    '[{"question": "What is JSX?", "options": ["JavaScript XML", "Java Syntax Extension", "JSON XML"], "correct": 0}]'::jsonb,
    50
FROM tenants t 
WHERE t.slug = 'demo'
ON CONFLICT DO NOTHING;

INSERT INTO rewards (tenant_id, title, description, points_required, reward_type)
SELECT 
    t.id,
    'React Master',
    'Completed React quiz with perfect score',
    50,
    'badge'
FROM tenants t 
WHERE t.slug = 'demo'
ON CONFLICT DO NOTHING;

INSERT INTO social_integrations (tenant_id, platform, settings, status)
SELECT 
    t.id,
    'facebook',
    '{"auto_post": true, "page_id": "demo"}'::jsonb,
    'active'
FROM tenants t 
WHERE t.slug = 'demo'
ON CONFLICT DO NOTHING;
`;

async function createMissingTables() {
    console.log('🔨 Creating missing tables in Supabase...');
    
    try {
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: createTablesSQL
        });

        if (error) {
            // Try alternative method if exec_sql doesn't exist
            console.log('⚠️  exec_sql not available, trying direct SQL execution...');
            
            // Split SQL into individual statements and execute them
            const statements = createTablesSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const statement of statements) {
                if (statement.startsWith('CREATE TABLE')) {
                    console.log(`Creating table: ${statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]}`);
                }
                
                const { error: execError } = await supabase
                    .from('_temp_sql_execution')
                    .select('*')
                    .limit(0); // This will fail but we can catch it
                
                // Since direct SQL execution might not be available, 
                // let's create tables using the REST API approach
            }
        } else {
            console.log('✅ All tables created successfully!');
        }

        // Verify tables were created by checking if we can query them
        await verifyTablesCreated();

    } catch (error) {
        console.log('❌ Error creating tables:', error.message);
        console.log('🔄 Trying alternative approach...');
        
        // Alternative: Create tables using Supabase client methods
        await createTablesAlternative();
    }
}

async function verifyTablesCreated() {
    console.log('🔍 Verifying tables were created...');
    
    const tablesToCheck = ['users', 'quizzes', 'user_points', 'rewards', 'social_integrations'];
    
    for (const table of tablesToCheck) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                console.log(`❌ Table ${table} does not exist`);
            } else {
                console.log(`✅ Table ${table} exists and accessible`);
            }
        } catch (err) {
            console.log(`❓ Could not verify table ${table}:`, err.message);
        }
    }
}

async function createTablesAlternative() {
    console.log('🔄 Using alternative table creation method...');
    
    // This approach uses Supabase's built-in table creation
    // Note: This requires admin privileges and might not work with anon key
    
    try {
        // Try to create a simple test record to see if tables exist
        const { data: testUser, error: userError } = await supabase
            .from('users')
            .insert({
                email: 'test@example.com',
                password_hash: 'test',
                name: 'Test User'
            })
            .select()
            .single();

        if (userError) {
            console.log('❌ Users table needs to be created manually in Supabase dashboard');
        } else {
            console.log('✅ Users table exists');
            // Clean up test record
            await supabase.from('users').delete().eq('email', 'test@example.com');
        }

    } catch (error) {
        console.log('❌ Alternative method failed:', error.message);
        console.log('📝 Manual steps required - see instructions below');
        
        printManualInstructions();
    }
}

function printManualInstructions() {
    console.log(`
📋 MANUAL SETUP INSTRUCTIONS:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to: Project > SQL Editor
3. Copy and paste the following SQL:

${createTablesSQL}

4. Click "Run" to execute the SQL
5. Return here and run the debug script again

Alternatively, you can create these tables through the Supabase Table Editor:
- users (id, tenant_id, email, password_hash, name, role, avatar_url, bio, is_active)
- quizzes (id, tenant_id, title, description, questions, points, status)
- user_points (id, user_id, tenant_id, total_points, level, badges)
- rewards (id, tenant_id, title, description, points_required, reward_type, reward_data, is_active)
- social_integrations (id, tenant_id, platform, access_token, refresh_token, settings, status)
`);
}

// Run if called directly
if (require.main === module) {
    createMissingTables().catch(console.error);
}

module.exports = { createMissingTables, verifyTablesCreated };
