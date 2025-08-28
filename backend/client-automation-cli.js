#!/usr/bin/env node

// =====================================================
// CLIENT AUTOMATION CLI - FaceBlog Tenant Setup
// =====================================================

const axios = require('axios');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const API_BASE = process.env.FACEBLOG_API || 'https://api.faceblog.top';
const ADMIN_KEY = process.env.FACEBLOG_ADMIN_KEY || 'your-admin-api-key';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// =====================================================
// Interactive Client Setup
// =====================================================
async function createClientInteractive() {
  console.log('\n🚀 FaceBlog - Automated Client Setup\n');

  try {
    // Collect client information
    const name = await question('Client Name: ');
    const slug = await question('Slug (URL identifier): ');
    const customDomain = await question('Custom Domain (optional, e.g., blog.client.com): ');
    const adminName = await question('Admin Name: ');
    const adminEmail = await question('Admin Email: ');
    const plan = await question('Plan (starter/pro/enterprise) [pro]: ') || 'pro';

    console.log('\n⚙️ Creating tenant...\n');

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      subdomain: slug.trim().toLowerCase(),
      custom_domain: customDomain.trim() || null,
      plan,
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      company_info: {
        name: name.trim()
      },
      features: {
        seo_tools: true,
        analytics: true,
        custom_domain: !!customDomain.trim(),
        social_integration: true,
        newsletter: true,
        comments: true
      }
    };

    const response = await axios.post(`${API_BASE}/api/admin/tenants`, payload, {
      headers: {
        'Authorization': `Bearer ${ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;

    console.log('✅ Client created successfully!\n');
    console.log('📋 Client Details:');
    console.log(`   Name: ${result.tenant.name}`);
    console.log(`   Slug: ${result.tenant.slug}`);
    console.log(`   API Key: ${result.tenant.api_key}`);
    console.log(`   Status: ${result.tenant.status}`);
    console.log(`   Plan: ${result.tenant.plan}\n`);

    console.log('🌐 URLs:');
    console.log(`   Blog: ${result.tenant.urls.blog}`);
    console.log(`   Admin: ${result.tenant.urls.admin}`);
    console.log(`   API: ${result.tenant.urls.api}\n`);

    console.log('👤 Admin User:');
    console.log(`   Email: ${result.admin_user.email}`);
    console.log(`   Name: ${result.admin_user.name}`);
    if (result.admin_user.temporary_password) {
      console.log(`   Password: ${result.admin_user.temporary_password}`);
    }
    console.log('');

    console.log('⚙️ Setup Instructions:');
    result.setup_instructions.dns.forEach(instruction => {
      console.log(`   DNS: ${instruction}`);
    });
    console.log('');
    result.setup_instructions.admin_access.forEach(instruction => {
      console.log(`   ${instruction}`);
    });

    // Save to file
    const filename = `client-${slug.trim().toLowerCase()}-setup.json`;
    await fs.writeFile(filename, JSON.stringify(result, null, 2));
    console.log(`\n💾 Setup details saved to: ${filename}`);

  } catch (error) {
    console.error('❌ Error creating client:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
}

// =====================================================
// Batch Client Creation from CSV
// =====================================================
async function createClientsBatch(csvFile) {
  console.log(`\n📁 Processing batch file: ${csvFile}\n`);

  try {
    const csvContent = await fs.readFile(csvFile, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const client = {};
      
      headers.forEach((header, index) => {
        client[header] = values[index] || '';
      });

      console.log(`⚙️ Creating client: ${client.name}`);

      const payload = {
        name: client.name,
        slug: client.slug,
        subdomain: client.slug,
        custom_domain: client.custom_domain || null,
        plan: client.plan || 'pro',
        admin_name: client.admin_name,
        admin_email: client.admin_email,
        company_info: {
          name: client.name,
          website: client.website || '',
          phone: client.phone || ''
        }
      };

      try {
        const response = await axios.post(`${API_BASE}/api/admin/tenants`, payload, {
          headers: {
            'Authorization': `Bearer ${ADMIN_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        results.push({
          success: true,
          client: client.name,
          data: response.data
        });

        console.log(`✅ ${client.name} created successfully`);

      } catch (error) {
        results.push({
          success: false,
          client: client.name,
          error: error.response?.data || error.message
        });

        console.log(`❌ ${client.name} failed: ${error.response?.data?.message || error.message}`);
      }

      // Wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `batch-results-${timestamp}.json`;
    await fs.writeFile(resultFile, JSON.stringify(results, null, 2));

    console.log(`\n📊 Batch processing complete!`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    console.log(`   Results saved to: ${resultFile}`);

  } catch (error) {
    console.error('❌ Error processing batch file:', error.message);
  }
}

// =====================================================
// List Clients
// =====================================================
async function listClients() {
  try {
    const response = await axios.get(`${API_BASE}/api/admin/tenants`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_KEY}`
      }
    });

    const { tenants, pagination } = response.data;

    console.log('\n📋 FaceBlog Clients:\n');
    
    tenants.forEach(tenant => {
      console.log(`🏢 ${tenant.name}`);
      console.log(`   Slug: ${tenant.slug}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Plan: ${tenant.plan}`);
      console.log(`   Users: ${tenant.user_count}`);
      console.log(`   Articles: ${tenant.article_count}`);
      console.log(`   Created: ${new Date(tenant.created_at).toLocaleDateString()}`);
      if (tenant.custom_domain) {
        console.log(`   Domain: ${tenant.custom_domain}`);
      }
      console.log('');
    });

    console.log(`📊 Total: ${pagination.total} clients (Page ${pagination.page}/${pagination.pages})`);

  } catch (error) {
    console.error('❌ Error listing clients:', error.response?.data || error.message);
  }
}

// =====================================================
// CLI Interface
// =====================================================
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
      await createClientInteractive();
      break;

    case 'batch':
      const csvFile = process.argv[3];
      if (!csvFile) {
        console.log('Usage: node client-automation-cli.js batch <csv-file>');
        process.exit(1);
      }
      await createClientsBatch(csvFile);
      break;

    case 'list':
      await listClients();
      break;

    case 'help':
    default:
      console.log(`
🚀 FaceBlog Client Automation CLI

Commands:
  create                 - Interactive client creation
  batch <csv-file>       - Batch create clients from CSV
  list                   - List all clients
  help                   - Show this help

Environment Variables:
  FACEBLOG_API          - API base URL (default: https://api.faceblog.top)
  FACEBLOG_ADMIN_KEY    - Admin API key for authentication

CSV Format for batch creation:
  name,slug,admin_name,admin_email,custom_domain,plan,website,phone

Example:
  node client-automation-cli.js create
  node client-automation-cli.js batch clients.csv
  node client-automation-cli.js list
`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createClientInteractive,
  createClientsBatch,
  listClients
};
