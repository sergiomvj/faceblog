const express = require('express');
const deploymentService = require('../services/deployment-service');
const { tenantAuth, requireAdmin } = require('../middleware/enhanced-tenant-auth');

const router = express.Router();

// =====================================================
// PUBLIC ROUTES (sem autenticação)
// =====================================================

// GET /api/deployment/templates - Listar templates disponíveis
router.get('/templates', async (req, res) => {
  try {
    const templates = deploymentService.getAvailableTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: error.message
    });
  }
});

// GET /api/deployment/status/:deploymentId - Verificar status de deployment
router.get('/status/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const status = deploymentService.getDeploymentStatus(deploymentId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment status',
      details: error.message
    });
  }
});

// POST /api/deployment/provision - Provisionar novo tenant
router.post('/provision', async (req, res) => {
  try {
    const {
      blog_name,
      subdomain,
      custom_domain,
      owner_email,
      owner_name,
      company_name,
      niche,
      theme = 'modern',
      primary_color = '#3B82F6',
      template = 'modern-blog'
    } = req.body;

    // Validações básicas
    if (!blog_name || !subdomain || !owner_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: blog_name, subdomain, owner_email'
      });
    }

    // Verificar se subdomínio já existe
    const { supabase } = require('../config/database');
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        error: 'Subdomain already exists',
        code: 'SUBDOMAIN_EXISTS'
      });
    }

    // Validar formato do subdomínio
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens (3-30 chars)',
        code: 'INVALID_SUBDOMAIN'
      });
    }

    // Iniciar provisionamento
    const result = await deploymentService.provisionTenant({
      blog_name,
      subdomain,
      custom_domain,
      owner_email,
      owner_name,
      company_name,
      niche,
      theme,
      primary_color,
      template
    });

    res.status(202).json({
      success: true,
      data: result,
      message: 'Tenant provisioning started'
    });
  } catch (error) {
    console.error('Error provisioning tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to provision tenant',
      details: error.message
    });
  }
});

// =====================================================
// AUTHENTICATED ROUTES
// =====================================================

router.use(tenantAuth);

// GET /api/v1/deployment/info - Informações do deployment atual
router.get('/info', async (req, res) => {
  try {
    const deploymentInfo = await deploymentService.getTenantDeployments(req.tenant.id);
    
    res.json({
      success: true,
      data: deploymentInfo
    });
  } catch (error) {
    console.error('Error fetching deployment info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment info',
      details: error.message
    });
  }
});

// POST /api/v1/deployment/redeploy - Redesplegar tenant
router.post('/redeploy', requireAdmin, async (req, res) => {
  try {
    const result = await deploymentService.redeployTenant(req.tenant.id);
    
    res.status(202).json({
      success: true,
      data: result,
      message: 'Tenant redeployment started'
    });
  } catch (error) {
    console.error('Error redeploying tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to redeploy tenant',
      details: error.message
    });
  }
});

// DELETE /api/v1/deployment - Deletar deployment
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (!confirm || confirm !== 'DELETE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": "DELETE" } to proceed'
      });
    }

    const result = await deploymentService.deleteTenantDeployment(req.tenant.id);
    
    res.json({
      success: true,
      data: result,
      message: 'Tenant deployment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tenant deployment',
      details: error.message
    });
  }
});

// =====================================================
// ADMIN ROUTES (super admin only)
// =====================================================

// GET /api/v1/deployment/all - Listar todos os deployments (admin only)
router.get('/all', requireAdmin, async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    const deployments = deploymentService.getAllDeployments();
    
    res.json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Error fetching all deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployments',
      details: error.message
    });
  }
});

// POST /api/v1/deployment/bulk-provision - Provisionar múltiplos tenants
router.post('/bulk-provision', requireAdmin, async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    const { tenants } = req.body;
    
    if (!Array.isArray(tenants) || tenants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tenants array is required'
      });
    }

    if (tenants.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 tenants per bulk operation'
      });
    }

    const results = [];
    const errors = [];

    for (const tenantData of tenants) {
      try {
        const result = await deploymentService.provisionTenant(tenantData);
        results.push({
          subdomain: tenantData.subdomain,
          deployment_id: result.deployment_id,
          status: 'started'
        });
      } catch (error) {
        errors.push({
          subdomain: tenantData.subdomain,
          error: error.message
        });
      }
    }

    res.status(202).json({
      success: true,
      data: {
        successful: results,
        failed: errors,
        total_requested: tenants.length,
        total_started: results.length,
        total_failed: errors.length
      },
      message: `Bulk provisioning started: ${results.length}/${tenants.length} tenants`
    });
  } catch (error) {
    console.error('Error bulk provisioning tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk provision tenants',
      details: error.message
    });
  }
});

// GET /api/v1/deployment/analytics - Analytics de deployment
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    const { supabase } = require('../config/database');
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Buscar dados de analytics
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (tenantsError) throw tenantsError;

    // Processar estatísticas
    const analytics = {
      total_tenants: tenants.length,
      active_tenants: tenants.filter(t => t.status === 'active').length,
      provisioning_tenants: tenants.filter(t => t.status === 'provisioning').length,
      inactive_tenants: tenants.filter(t => t.status === 'inactive').length,
      tenants_by_theme: {},
      tenants_by_niche: {},
      deployments_by_day: {},
      custom_domains: tenants.filter(t => t.custom_domain).length,
      success_rate: 0
    };

    // Agrupar por tema
    tenants.forEach(tenant => {
      const theme = tenant.settings?.theme || 'unknown';
      analytics.tenants_by_theme[theme] = (analytics.tenants_by_theme[theme] || 0) + 1;
    });

    // Agrupar por nicho
    tenants.forEach(tenant => {
      const niche = tenant.settings?.niche || 'general';
      analytics.tenants_by_niche[niche] = (analytics.tenants_by_niche[niche] || 0) + 1;
    });

    // Agrupar por dia
    tenants.forEach(tenant => {
      const day = new Date(tenant.created_at).toISOString().split('T')[0];
      analytics.deployments_by_day[day] = (analytics.deployments_by_day[day] || 0) + 1;
    });

    // Calcular taxa de sucesso
    const completedTenants = tenants.filter(t => ['active', 'inactive'].includes(t.status)).length;
    analytics.success_rate = tenants.length > 0 ? (analytics.active_tenants / completedTenants * 100).toFixed(2) : 0;

    // Deployments em andamento
    const activeDeployments = deploymentService.getAllDeployments()
      .filter(d => ['initializing', 'running'].includes(d.status));

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        analytics,
        active_deployments: activeDeployments.length,
        deployment_queue_size: deploymentService.getAllDeployments().length
      }
    });
  } catch (error) {
    console.error('Error fetching deployment analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment analytics',
      details: error.message
    });
  }
});

// POST /api/v1/deployment/cleanup - Limpar deployments antigos
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    const beforeCount = deploymentService.getAllDeployments().length;
    deploymentService.cleanup();
    const afterCount = deploymentService.getAllDeployments().length;
    
    res.json({
      success: true,
      data: {
        cleaned_deployments: beforeCount - afterCount,
        remaining_deployments: afterCount
      },
      message: 'Deployment cleanup completed'
    });
  } catch (error) {
    console.error('Error cleaning up deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup deployments',
      details: error.message
    });
  }
});

// =====================================================
// WEBHOOK ROUTES (para integrações externas)
// =====================================================

// POST /api/deployment/webhook/domain - Webhook para confirmação de domínio
router.post('/webhook/domain', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { domain, status, tenant_id } = req.body;
    
    if (status === 'verified') {
      const { supabase } = require('../config/database');
      await supabase
        .from('tenants')
        .update({
          domain_verified: true,
          domain_verified_at: new Date()
        })
        .eq('id', tenant_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing domain webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process domain webhook'
    });
  }
});

// POST /api/deployment/webhook/deploy - Webhook para status de deploy
router.post('/webhook/deploy', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { deployment_id, status, url, error } = req.body;
    
    const deployment = deploymentService.getDeploymentStatus(deployment_id);
    if (deployment) {
      if (status === 'success') {
        deploymentService.updateDeploymentStatus(deployment_id, 'completed', null, 100);
        deployment.deploy_url = url;
      } else if (status === 'failed') {
        deploymentService.updateDeploymentStatus(deployment_id, 'failed', error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing deploy webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deploy webhook'
    });
  }
});

module.exports = router;
