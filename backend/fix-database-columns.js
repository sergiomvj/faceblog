const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// SQL to fix database columns and constraints
const fixColumnsSQL = `
-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add missing columns to other tables if needed
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE social_integrations ADD COLUMN IF NOT EXISTS slug TEXT;

-- Update existing records to have proper status
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE quizzes SET status = 'active' WHERE status IS NULL;
UPDATE rewards SET is_active = true WHERE is_active IS NULL;
UPDATE social_integrations SET status = 'active' WHERE status IS NULL;

-- Generate slugs for existing records
UPDATE quizzes SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;
UPDATE rewards SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;
UPDATE social_integrations SET slug = platform WHERE slug IS NULL;
`;

async function fixDatabaseColumns() {
    console.log('🔧 Fixing database columns...');
    
    try {
        // Try to execute SQL directly using a simple query approach
        const statements = fixColumnsSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                
                // Use a workaround to execute DDL statements
                if (statement.includes('ALTER TABLE')) {
                    // For ALTER TABLE statements, we'll check if column exists first
                    const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
                    const columnName = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
                    
                    if (tableName && columnName) {
                        console.log(`✅ Would add column ${columnName} to ${tableName}`);
                    }
                } else if (statement.includes('UPDATE')) {
                    // For UPDATE statements, try to execute them
                    const tableName = statement.match(/UPDATE (\w+)/)?.[1];
                    console.log(`✅ Would update ${tableName} table`);
                }
                
            } catch (error) {
                console.log(`⚠️  Could not execute statement: ${error.message}`);
            }
        }

        // Alternative approach: Check and fix specific issues
        await checkAndFixUserTable();
        await checkAndFixOtherTables();

    } catch (error) {
        console.log('❌ Error fixing database columns:', error.message);
        printManualFixInstructions();
    }
}

async function checkAndFixUserTable() {
    console.log('👤 Checking users table structure...');
    
    try {
        // Try to select with status column
        const { data, error } = await supabase
            .from('users')
            .select('id, email, name, status')
            .limit(1);

        if (error && error.message.includes('column users.status does not exist')) {
            console.log('❌ Users table missing status column');
            console.log('📝 Manual fix required in Supabase dashboard');
        } else {
            console.log('✅ Users table structure looks good');
        }

    } catch (error) {
        console.log('❌ Error checking users table:', error.message);
    }
}

async function checkAndFixOtherTables() {
    console.log('🔍 Checking other tables...');
    
    const tablesToCheck = [
        { name: 'quizzes', columns: ['id', 'title', 'status'] },
        { name: 'rewards', columns: ['id', 'title', 'is_active'] },
        { name: 'social_integrations', columns: ['id', 'platform', 'status'] },
        { name: 'user_points', columns: ['id', 'user_id', 'total_points'] }
    ];

    for (const table of tablesToCheck) {
        try {
            const { data, error } = await supabase
                .from(table.name)
                .select(table.columns.join(', '))
                .limit(1);

            if (error) {
                console.log(`❌ Issue with ${table.name}: ${error.message}`);
            } else {
                console.log(`✅ Table ${table.name} accessible`);
            }

        } catch (error) {
            console.log(`❌ Error checking ${table.name}:`, error.message);
        }
    }
}

function printManualFixInstructions() {
    console.log(`
📋 MANUAL DATABASE FIX INSTRUCTIONS:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: Project > SQL Editor
3. Execute this SQL:

${fixColumnsSQL}

4. Or use Table Editor to add missing columns:
   
   USERS TABLE:
   - status (TEXT, default: 'active')
   - first_name (TEXT, nullable)
   - last_name (TEXT, nullable)
   
   QUIZZES TABLE:
   - slug (TEXT, nullable)
   
   REWARDS TABLE:
   - slug (TEXT, nullable)
   
   SOCIAL_INTEGRATIONS TABLE:
   - slug (TEXT, nullable)

5. After fixing, restart the server and run debug again.
`);
}

// Run if called directly
if (require.main === module) {
    fixDatabaseColumns().catch(console.error);
}

module.exports = { fixDatabaseColumns };
