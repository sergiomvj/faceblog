const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/database');

const router = express.Router();

/**
 * Tenant Onboarding Routes
 * Handles automated tenant registration and setup
 */

// Generate a random API key with prefix
const generateApiKey = () => {
  const randomString = require('crypto').randomBytes(32).toString('hex');
  return `fb_${randomString}`;
};

// Generate a unique subdomain
const generateSubdomain = (name) => {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}${randomSuffix}`;
};

// POST /api/onboarding/register - Register new tenant
router.post('/register', async (req, res) => {
  try {
    const {
      // Tenant info
      tenantName,
      ownerEmail,
      ownerPassword,
      ownerFirstName,
      ownerLastName,
      
      // Optional customization
      subdomain,
      plan = 'starter',
      industry,
      companySize,
      
      // Contact info
      phone,
      website
    } = req.body;

    // Validation
    if (!tenantName || !ownerEmail || !ownerPassword || !ownerFirstName || !ownerLastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantName, ownerEmail, ownerPassword, ownerFirstName, ownerLastName'
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', ownerEmail)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Generate unique subdomain if not provided
    const finalSubdomain = subdomain || generateSubdomain(tenantName);

    // Check if subdomain is available
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', finalSubdomain)
      .single();

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        error: 'Subdomain already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ownerPassword, 12);

    // Start transaction-like operations
    const tenantId = uuidv4();
    const userId = uuidv4();
    const apiKeyId = uuidv4();

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: tenantName,
        slug: finalSubdomain,
        subdomain: finalSubdomain,
        plan: plan,
        status: 'active',
        industry: industry,
        company_size: companySize,
        website: website,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create tenant'
      });
    }

    // Create owner user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenantId,
        email: ownerEmail,
        password_hash: hashedPassword,
        first_name: ownerFirstName,
        last_name: ownerLastName,
        name: `${ownerFirstName} ${ownerLastName}`,
        role: 'admin',
        status: 'active',
        phone: phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      // Rollback tenant creation
      await supabase.from('tenants').delete().eq('id', tenantId);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = await bcrypt.hash(apiKey, 12);

    const { data: apiKeyRecord, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert({
        id: apiKeyId,
        tenant_id: tenantId,
        name: 'Default API Key',
        key_hash: apiKeyHash,
        key_prefix: apiKey.substring(0, 8),
        permissions: ['read', 'write'],
        rate_limit: 1000,
        is_active: true,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('API Key creation error:', apiKeyError);
      // Rollback previous creations
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('tenants').delete().eq('id', tenantId);
      return res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      });
    }

    // Create default category
    await supabase
      .from('categories')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        name: 'General',
        slug: 'general',
        description: 'General blog posts',
        color: '#3B82F6',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Create welcome article
    await supabase
      .from('articles')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        title: `Welcome to ${tenantName}!`,
        slug: 'welcome-to-your-blog',
        content: `# Welcome to your new blog!

Congratulations on setting up your blog with FaceBlog! This is your first article.

## Getting Started

Here are some things you can do:

1. **Write your first post** - Share your thoughts with the world
2. **Customize your categories** - Organize your content
3. **Manage your API keys** - Integrate with external services
4. **Invite team members** - Collaborate with others

## API Integration

Your blog comes with a powerful API. Use this API key to get started:

\`\`\`
API Key: ${apiKey.substring(0, 12)}...
\`\`\`

Visit your admin panel to manage everything!

Happy blogging! 🎉`,
        excerpt: 'Welcome to your new blog powered by FaceBlog! Get started with these simple steps.',
        status: 'published',
        author_id: userId,
        view_count: 0,
        like_count: 0,
        reading_time: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      });

    // Log the onboarding event
    await supabase
      .from('api_key_usage')
      .insert({
        id: uuidv4(),
        api_key_id: apiKeyId,
        endpoint: '/onboarding/register',
        method: 'POST',
        status_code: 201,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        created_at: new Date().toISOString()
      });

    // Return success response with credentials
    res.status(201).json({
      success: true,
      message: 'Tenant onboarded successfully!',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
          status: tenant.status
        },
        owner: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        credentials: {
          apiKey: apiKey,
          adminUrl: `http://localhost:3000`, // In production: https://${tenant.subdomain}.yourdomain.com
          loginEmail: user.email
        },
        nextSteps: [
          'Save your API key in a secure location',
          'Log in to your admin panel',
          'Customize your blog settings',
          'Write your first blog post'
        ]
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during onboarding'
    });
  }
});

// GET /api/onboarding/check-availability - Check subdomain availability
router.get('/check-availability/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Validate subdomain format
    if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      return res.status(400).json({
        success: false,
        available: false,
        error: 'Subdomain must be 3-30 characters, lowercase letters, numbers, and hyphens only'
      });
    }

    // Check if subdomain exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    res.json({
      success: true,
      available: !existingTenant,
      subdomain: subdomain
    });

  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// GET /api/onboarding/stats - Get onboarding statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    // Get total tenants
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // Get tenants created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get tenants by plan
    const { data: planStats } = await supabase
      .from('tenants')
      .select('plan')
      .then(result => {
        const stats = {};
        result.data?.forEach(tenant => {
          stats[tenant.plan] = (stats[tenant.plan] || 0) + 1;
        });
        return { data: stats };
      });

    res.json({
      success: true,
      data: {
        totalTenants: totalTenants || 0,
        recentTenants: recentTenants || 0,
        planDistribution: planStats || {},
        growthRate: totalTenants > 0 ? ((recentTenants / totalTenants) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding stats'
    });
  }
});

module.exports = router;
