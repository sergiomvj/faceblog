const express = require('express');
const integrationsService = require('../services/integrations-service');
const { tenantAuth, requireAdmin } = require('../middleware/enhanced-tenant-auth');

const router = express.Router();

// =====================================================
// PUBLIC ROUTES
// =====================================================

// GET /api/integrations/providers - Listar provedores disponíveis
router.get('/providers', async (req, res) => {
  try {
    const { type } = req.query;
    const providers = type 
      ? integrationsService.getEnabledProviders(type)
      : integrationsService.getAvailableProviders();

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers',
      details: error.message
    });
  }
});

// GET /api/integrations/health - Status das integrações
router.get('/health', async (req, res) => {
  try {
    const health = await integrationsService.getIntegrationHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking integration health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check integration health',
      details: error.message
    });
  }
});

// =====================================================
// AUTHENTICATED ROUTES
// =====================================================

router.use(tenantAuth);

// GET /api/v1/integrations - Obter integrações do tenant
router.get('/', async (req, res) => {
  try {
    const { data: tenant, error } = await require('../config/database').supabase
      .from('tenants')
      .select('integrations, integrations_configured_at')
      .eq('id', req.tenant.id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        integrations: tenant.integrations || {},
        configured_at: tenant.integrations_configured_at,
        available_providers: integrationsService.getEnabledProviders()
      }
    });
  } catch (error) {
    console.error('Error fetching tenant integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations',
      details: error.message
    });
  }
});

// POST /api/v1/integrations/setup - Configurar integrações do tenant
router.post('/setup', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      tenant_id: req.tenant.id,
      subdomain: req.tenant.subdomain,
      custom_domain: req.tenant.custom_domain,
      blog_name: req.tenant.name,
      owner_email: req.tenant.owner_email,
      theme: req.tenant.settings?.theme || 'modern',
      primary_color: req.tenant.settings?.primary_color || '#3B82F6'
    };

    const integrations = await integrationsService.setupTenantIntegrations(
      req.tenant.id,
      tenantData
    );

    res.json({
      success: true,
      data: integrations,
      message: 'Integrations configured successfully'
    });
  } catch (error) {
    console.error('Error setting up integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup integrations',
      details: error.message
    });
  }
});

// =====================================================
// DEPLOYMENT INTEGRATIONS
// =====================================================

// POST /api/v1/integrations/deploy/vercel - Deploy para Vercel
router.post('/deploy/vercel', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      tenant_id: req.tenant.id,
      subdomain: req.tenant.subdomain,
      blog_name: req.tenant.name,
      ...req.body
    };

    const result = await integrationsService.deployToVercel(null, tenantData);

    res.json({
      success: true,
      data: result,
      message: 'Vercel deployment initiated'
    });
  } catch (error) {
    console.error('Error deploying to Vercel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy to Vercel',
      details: error.message
    });
  }
});

// POST /api/v1/integrations/deploy/netlify - Deploy para Netlify
router.post('/deploy/netlify', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      tenant_id: req.tenant.id,
      subdomain: req.tenant.subdomain,
      blog_name: req.tenant.name,
      ...req.body
    };

    const result = await integrationsService.deployToNetlify(null, tenantData);

    res.json({
      success: true,
      data: result,
      message: 'Netlify deployment initiated'
    });
  } catch (error) {
    console.error('Error deploying to Netlify:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy to Netlify',
      details: error.message
    });
  }
});

// =====================================================
// DNS INTEGRATIONS
// =====================================================

// POST /api/v1/integrations/dns/cloudflare - Configurar DNS Cloudflare
router.post('/dns/cloudflare', requireAdmin, async (req, res) => {
  try {
    const { domain, subdomain, target_url } = req.body;

    if (!domain || !target_url) {
      return res.status(400).json({
        success: false,
        error: 'Domain and target_url are required'
      });
    }

    const result = await integrationsService.setupCloudflareRecord(
      domain,
      subdomain,
      target_url
    );

    res.json({
      success: true,
      data: result,
      message: 'DNS record configured successfully'
    });
  } catch (error) {
    console.error('Error configuring Cloudflare DNS:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure DNS',
      details: error.message
    });
  }
});

// GET /api/v1/integrations/dns/verify/:domain - Verificar SSL do domínio
router.get('/dns/verify/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await integrationsService.verifyDomainSSL(domain);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error verifying domain SSL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify domain SSL',
      details: error.message
    });
  }
});

// =====================================================
// EMAIL INTEGRATIONS
// =====================================================

// POST /api/v1/integrations/email/welcome - Enviar email de boas-vindas
router.post('/email/welcome', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      owner_email: req.tenant.owner_email,
      blog_name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      custom_domain: req.tenant.custom_domain,
      owner_name: req.body.owner_name || 'Admin'
    };

    const deploymentData = {
      url: req.body.blog_url || `https://${req.tenant.subdomain}.faceblog.com`
    };

    const result = await integrationsService.sendWelcomeEmail(tenantData, deploymentData);

    res.json({
      success: true,
      data: result,
      message: result.sent ? 'Welcome email sent successfully' : 'Failed to send welcome email'
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email',
      details: error.message
    });
  }
});

// POST /api/v1/integrations/email/test - Testar configuração de email
router.post('/email/test', requireAdmin, async (req, res) => {
  try {
    const { provider = 'auto', to_email } = req.body;
    
    const testEmail = {
      to: to_email || req.tenant.owner_email,
      subject: 'Teste de Integração - FaceBlog',
      template: 'test',
      data: {
        blog_name: req.tenant.name,
        test_time: new Date().toISOString()
      }
    };

    let result;
    if (provider === 'sendgrid') {
      result = await integrationsService.sendEmailViaSendGrid(testEmail);
    } else if (provider === 'mailgun') {
      result = await integrationsService.sendEmailViaMailgun(testEmail);
    } else {
      // Auto-detect
      const preferredProvider = integrationsService.getPreferredEmailProvider();
      if (preferredProvider === 'sendgrid') {
        result = await integrationsService.sendEmailViaSendGrid(testEmail);
      } else if (preferredProvider === 'mailgun') {
        result = await integrationsService.sendEmailViaMailgun(testEmail);
      } else {
        throw new Error('No email provider configured');
      }
    }

    res.json({
      success: true,
      data: result,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// =====================================================
// ANALYTICS INTEGRATIONS
// =====================================================

// POST /api/v1/integrations/analytics/google - Configurar Google Analytics
router.post('/analytics/google', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      blog_name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      custom_domain: req.tenant.custom_domain
    };

    const result = await integrationsService.setupGoogleAnalytics(tenantData);

    res.json({
      success: true,
      data: result,
      message: result.configured ? 'Google Analytics configured' : 'Google Analytics configuration failed'
    });
  } catch (error) {
    console.error('Error configuring Google Analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure Google Analytics',
      details: error.message
    });
  }
});

// POST /api/v1/integrations/analytics/plausible - Configurar Plausible
router.post('/analytics/plausible', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      blog_name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      custom_domain: req.tenant.custom_domain
    };

    const result = await integrationsService.setupPlausibleAnalytics(tenantData);

    res.json({
      success: true,
      data: result,
      message: result.configured ? 'Plausible Analytics configured' : 'Plausible configuration failed'
    });
  } catch (error) {
    console.error('Error configuring Plausible:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure Plausible',
      details: error.message
    });
  }
});

// =====================================================
// STORAGE INTEGRATIONS
// =====================================================

// POST /api/v1/integrations/storage/cloudinary - Configurar Cloudinary
router.post('/storage/cloudinary', requireAdmin, async (req, res) => {
  try {
    const tenantData = {
      subdomain: req.tenant.subdomain
    };

    const result = await integrationsService.setupCloudinaryStorage(tenantData);

    res.json({
      success: true,
      data: result,
      message: result.configured ? 'Cloudinary storage configured' : 'Cloudinary configuration failed'
    });
  } catch (error) {
    console.error('Error configuring Cloudinary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure Cloudinary',
      details: error.message
    });
  }
});

// =====================================================
// ADMIN ROUTES
// =====================================================

// POST /api/v1/integrations/test/:provider - Testar integração específica
router.post('/test/:provider', requireAdmin, async (req, res) => {
  try {
    const { provider } = req.params;
    const config = req.body;

    const result = await integrationsService.testIntegration(provider, config);

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      message: result.success ? `${provider} integration test passed` : `${provider} integration test failed`
    });
  } catch (error) {
    console.error(`Error testing ${req.params.provider} integration:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to test ${req.params.provider} integration`,
      details: error.message
    });
  }
});

// GET /api/v1/integrations/logs - Logs de integrações (admin only)
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, provider, level = 'all' } = req.query;

    // Implementar sistema de logs de integrações
    // Por enquanto, retornar logs simulados
    const logs = [
      {
        id: 1,
        timestamp: new Date(),
        provider: 'vercel',
        level: 'info',
        message: 'Deployment successful',
        tenant_id: req.tenant.id,
        metadata: { deployment_id: 'dep_123' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000),
        provider: 'cloudflare',
        level: 'info',
        message: 'DNS record created',
        tenant_id: req.tenant.id,
        metadata: { record_id: 'rec_456' }
      }
    ];

    res.json({
      success: true,
      data: {
        logs: logs.slice(0, parseInt(limit)),
        total: logs.length,
        filters: { provider, level }
      }
    });
  } catch (error) {
    console.error('Error fetching integration logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration logs',
      details: error.message
    });
  }
});

// =====================================================
// WEBHOOK ROUTES
// =====================================================

// POST /api/integrations/webhook/vercel - Webhook do Vercel
router.post('/webhook/vercel', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;
    
    // Processar webhook do Vercel
    if (event.type === 'deployment.succeeded') {
      const { supabase } = require('../config/database');
      
      // Atualizar status do deployment
      await supabase
        .from('tenants')
        .update({
          deployment_status: 'active',
          deployment_url: event.payload.url,
          deployed_at: new Date()
        })
        .eq('subdomain', event.payload.name.replace('faceblog-', ''));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing Vercel webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

// POST /api/integrations/webhook/netlify - Webhook do Netlify
router.post('/webhook/netlify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;
    
    // Processar webhook do Netlify
    if (event.state === 'ready') {
      const { supabase } = require('../config/database');
      
      // Atualizar status do deployment
      await supabase
        .from('tenants')
        .update({
          deployment_status: 'active',
          deployment_url: event.ssl_url || event.url,
          deployed_at: new Date()
        })
        .eq('subdomain', event.name.replace('faceblog-', ''));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing Netlify webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

// POST /api/integrations/webhook/cloudflare - Webhook do Cloudflare
router.post('/webhook/cloudflare', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;
    
    // Processar webhook do Cloudflare (SSL, DNS changes, etc.)
    console.log('Cloudflare webhook received:', event);

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing Cloudflare webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

module.exports = router;
