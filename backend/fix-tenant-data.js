const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createDemoTenant() {
  console.log('🏢 Creating demo tenant...');
  
  try {
    // First, check if demo tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .single();

    if (existingTenant) {
      console.log('✅ Demo tenant already exists:', existingTenant.id);
      return existingTenant.id;
    }

    // Create demo tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name: 'Demo Blog',
        slug: 'demo',
        subdomain: 'demo',
        plan: 'pro',
        status: 'active',
        settings: {
          theme: 'default',
          features: {
            comments: true,
            social_sharing: true,
            newsletter: true,
            analytics: true,
            seo_tools: true,
            custom_domain: true
          }
        }
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Demo tenant created:', tenant.id);
    return tenant.id;

  } catch (error) {
    console.log('❌ Error creating demo tenant:', error.message);
    return null;
  }
}

async function updateServerWithRealTenantId(tenantId) {
  console.log('🔧 Updating server with real tenant ID...');
  
  const fs = require('fs');
  const serverPath = 'src/simple-server.js';
  
  try {
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Replace all instances of 'demo-tenant-id' with the real tenant ID
    serverContent = serverContent.replace(/demo-tenant-id/g, tenantId);
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✅ Server updated with real tenant ID');
    
  } catch (error) {
    console.log('❌ Error updating server:', error.message);
  }
}

async function createSampleData(tenantId) {
  console.log('📝 Creating sample data...');
  
  try {
    // Create sample category
    const { data: category } = await supabase
      .from('categories')
      .insert({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech articles and tutorials',
        tenant_id: tenantId
      })
      .select()
      .single();

    // Create sample tags
    const { data: tags } = await supabase
      .from('tags')
      .insert([
        { name: 'React', slug: 'react', color: '#61DAFB', tenant_id: tenantId },
        { name: 'JavaScript', slug: 'javascript', color: '#F7DF1E', tenant_id: tenantId },
        { name: 'Tutorial', slug: 'tutorial', color: '#45B7D1', tenant_id: tenantId }
      ])
      .select();

    // Create sample article
    const { data: article } = await supabase
      .from('articles')
      .insert({
        title: 'Getting Started with React Hooks',
        slug: 'getting-started-react-hooks',
        content: 'React Hooks are a powerful feature that allows you to use state and other React features without writing a class...',
        excerpt: 'Learn the basics of React Hooks and how to use them in your applications.',
        status: 'published',
        category_id: category?.id,
        tenant_id: tenantId,
        author_name: 'Demo Author',
        author_email: 'author@demo.com',
        reading_time: 5,
        view_count: 156,
        like_count: 23
      })
      .select()
      .single();

    console.log('✅ Sample data created successfully');
    
  } catch (error) {
    console.log('❌ Error creating sample data:', error.message);
  }
}

async function fixTenantData() {
  console.log('🚀 Fixing tenant data and server configuration...\n');
  
  // Step 1: Create demo tenant
  const tenantId = await createDemoTenant();
  
  if (!tenantId) {
    console.log('❌ Could not create/find demo tenant. Aborting.');
    return;
  }
  
  // Step 2: Update server with real tenant ID
  await updateServerWithRealTenantId(tenantId);
  
  // Step 3: Create sample data
  await createSampleData(tenantId);
  
  console.log('\n🎯 Tenant data fix complete!');
  console.log('📋 Next steps:');
  console.log('1. Restart the server: npm start');
  console.log('2. Run debug automation: npm run debug');
  console.log('3. Check API endpoints are working');
}

// Run if called directly
if (require.main === module) {
  fixTenantData().catch(console.error);
}

module.exports = { fixTenantData, createDemoTenant };
