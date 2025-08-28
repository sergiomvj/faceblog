const billingService = require('../services/billing-service');

// Cache para evitar consultas excessivas ao banco
const limitsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class BillingLimitsMiddleware {
  // =====================================================
  // MIDDLEWARE PRINCIPAL
  // =====================================================

  static checkLimits(resource) {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: 'Tenant not authenticated'
          });
        }

        // Verificar cache
        const cacheKey = `${tenantId}:${resource}`;
        const cached = limitsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
          if (cached.exceeded) {
            return BillingLimitsMiddleware.sendLimitExceededResponse(res, cached.data, resource);
          }
          return next();
        }

        // Verificar limites no banco
        const limits = await billingService.checkTenantLimits(tenantId);
        
        // Verificar se o recurso específico excedeu o limite
        const resourceViolation = limits.violations?.find(v => v.type === resource);
        const exceeded = !!resourceViolation;

        // Atualizar cache
        limitsCache.set(cacheKey, {
          exceeded,
          data: limits,
          timestamp: Date.now()
        });

        if (exceeded) {
          return BillingLimitsMiddleware.sendLimitExceededResponse(res, limits, resource);
        }

        // Adicionar informações de limite ao request para uso posterior
        req.billing = {
          limits: limits,
          usage: limits.current_usage,
          plan: limits.plan_limits
        };

        next();
      } catch (error) {
        console.error('Error checking billing limits:', error);
        // Em caso de erro, permitir a operação mas logar o erro
        next();
      }
    };
  }

  // =====================================================
  // MIDDLEWARES ESPECÍFICOS POR RECURSO
  // =====================================================

  static checkArticleLimit() {
    return BillingLimitsMiddleware.checkLimits('articles');
  }

  static checkCategoryLimit() {
    return BillingLimitsMiddleware.checkLimits('categories');
  }

  static checkTagLimit() {
    return BillingLimitsMiddleware.checkLimits('tags');
  }

  static checkUserLimit() {
    return BillingLimitsMiddleware.checkLimits('users');
  }

  static checkApiKeyLimit() {
    return BillingLimitsMiddleware.checkLimits('api_keys');
  }

  static checkApiRequestLimit() {
    return BillingLimitsMiddleware.checkLimits('api_requests');
  }

  // =====================================================
  // MIDDLEWARE PARA FEATURES PREMIUM
  // =====================================================

  static requireFeature(feature) {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: 'Tenant not authenticated'
          });
        }

        const subscription = await billingService.getTenantSubscription(tenantId);
        
        if (!subscription) {
          return res.status(402).json({
            success: false,
            error: 'No active subscription found',
            code: 'NO_SUBSCRIPTION',
            upgrade_required: true
          });
        }

        const hasFeature = billingService.isFeatureAvailable(subscription, feature);
        
        if (!hasFeature) {
          return res.status(402).json({
            success: false,
            error: `Feature '${feature}' not available in your current plan`,
            code: 'FEATURE_NOT_AVAILABLE',
            current_plan: subscription.plan?.name,
            feature_required: feature,
            upgrade_required: true
          });
        }

        next();
      } catch (error) {
        console.error('Error checking feature availability:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to check feature availability',
          details: error.message
        });
      }
    };
  }

  // =====================================================
  // MIDDLEWARES ESPECÍFICOS POR FEATURE
  // =====================================================

  static requireCustomDomain() {
    return BillingLimitsMiddleware.requireFeature('custom_domain');
  }

  static requireAdvancedAnalytics() {
    return BillingLimitsMiddleware.requireFeature('analytics_advanced');
  }

  static requireSEOTools() {
    return BillingLimitsMiddleware.requireFeature('seo_tools');
  }

  static requireImageWizard() {
    return BillingLimitsMiddleware.requireFeature('image_wizard');
  }

  static requireSocialIntegrations() {
    return BillingLimitsMiddleware.requireFeature('social_integrations');
  }

  static requireWhiteLabel() {
    return BillingLimitsMiddleware.requireFeature('white_label');
  }

  // =====================================================
  // MIDDLEWARE PARA VERIFICAÇÃO DE ASSINATURA ATIVA
  // =====================================================

  static requireActiveSubscription() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: 'Tenant not authenticated'
          });
        }

        const subscription = await billingService.getTenantSubscription(tenantId);
        
        if (!subscription) {
          return res.status(402).json({
            success: false,
            error: 'No subscription found',
            code: 'NO_SUBSCRIPTION',
            upgrade_required: true
          });
        }

        const activeStatuses = ['active', 'trialing'];
        if (!activeStatuses.includes(subscription.status)) {
          return res.status(402).json({
            success: false,
            error: 'Subscription is not active',
            code: 'SUBSCRIPTION_INACTIVE',
            status: subscription.status,
            upgrade_required: true
          });
        }

        // Verificar se não está expirada
        if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
          return res.status(402).json({
            success: false,
            error: 'Subscription has expired',
            code: 'SUBSCRIPTION_EXPIRED',
            expired_at: subscription.current_period_end,
            upgrade_required: true
          });
        }

        req.subscription = subscription;
        next();
      } catch (error) {
        console.error('Error checking subscription status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to check subscription status',
          details: error.message
        });
      }
    };
  }

  // =====================================================
  // MIDDLEWARE PARA TRIAL
  // =====================================================

  static allowTrial(resource, trialLimit = 5) {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
          return res.status(401).json({
            success: false,
            error: 'Tenant not authenticated'
          });
        }

        const subscription = await billingService.getTenantSubscription(tenantId);
        
        // Se tem assinatura ativa, usar o middleware normal
        if (subscription && subscription.status === 'active') {
          return BillingLimitsMiddleware.checkLimits(resource)(req, res, next);
        }

        // Se não tem assinatura, verificar limite de trial
        const usage = await billingService.calculateTenantUsage(tenantId);
        const currentUsage = usage[`${resource}_count`] || 0;

        if (currentUsage >= trialLimit) {
          return res.status(402).json({
            success: false,
            error: `Trial limit reached for ${resource}`,
            code: 'TRIAL_LIMIT_EXCEEDED',
            current_usage: currentUsage,
            trial_limit: trialLimit,
            upgrade_required: true
          });
        }

        req.billing = {
          trial_mode: true,
          usage: usage,
          trial_limit: trialLimit
        };

        next();
      } catch (error) {
        console.error('Error checking trial limits:', error);
        next(); // Permitir em caso de erro
      }
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  static sendLimitExceededResponse(res, limits, resource) {
    const violation = limits.violations?.find(v => v.type === resource);
    
    return res.status(402).json({
      success: false,
      error: `${resource} limit exceeded`,
      code: 'LIMIT_EXCEEDED',
      current_usage: violation?.current || 0,
      limit: violation?.limit || 0,
      plan: limits.plan_limits?.name,
      upgrade_required: true,
      all_violations: limits.violations
    });
  }

  static clearCache(tenantId = null) {
    if (tenantId) {
      // Limpar cache específico do tenant
      for (const key of limitsCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          limitsCache.delete(key);
        }
      }
    } else {
      // Limpar todo o cache
      limitsCache.clear();
    }
  }

  static getCacheStats() {
    return {
      size: limitsCache.size,
      keys: Array.from(limitsCache.keys())
    };
  }

  // =====================================================
  // MIDDLEWARE PARA LOGGING DE USO
  // =====================================================

  static logUsage(resource) {
    return async (req, res, next) => {
      // Interceptar resposta para logar uso apenas em caso de sucesso
      const originalSend = res.send;
      
      res.send = function(data) {
        // Logar uso apenas se a operação foi bem-sucedida (status 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          BillingLimitsMiddleware.recordResourceUsage(req.tenant?.id, resource)
            .catch(error => console.error('Error recording usage:', error));
        }
        
        originalSend.call(this, data);
      };

      next();
    };
  }

  static async recordResourceUsage(tenantId, resource) {
    if (!tenantId) return;

    try {
      // Invalidar cache para forçar recálculo na próxima verificação
      BillingLimitsMiddleware.clearCache(tenantId);

      // Registrar uso no banco (implementação futura)
      // Aqui poderia incrementar contadores específicos ou registrar eventos
      console.log(`Resource usage recorded: ${tenantId} used ${resource}`);
    } catch (error) {
      console.error('Error recording resource usage:', error);
    }
  }

  // =====================================================
  // MIDDLEWARE PARA SOFT LIMITS (AVISOS)
  // =====================================================

  static warnNearLimit(resource, warningThreshold = 0.8) {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return next();

        const limits = await billingService.checkTenantLimits(tenantId);
        const plan = limits.plan_limits;
        const usage = limits.current_usage;

        const limit = plan[`max_${resource}`];
        if (limit === -1) return next(); // Ilimitado

        const currentUsage = usage[`${resource}_count`] || 0;
        const usagePercentage = currentUsage / limit;

        if (usagePercentage >= warningThreshold) {
          // Adicionar header de aviso
          res.set('X-Usage-Warning', `${resource} usage at ${Math.round(usagePercentage * 100)}%`);
          res.set('X-Usage-Current', currentUsage.toString());
          res.set('X-Usage-Limit', limit.toString());
        }

        next();
      } catch (error) {
        console.error('Error checking usage warning:', error);
        next();
      }
    };
  }
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of limitsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      limitsCache.delete(key);
    }
  }
}, CACHE_TTL);

module.exports = BillingLimitsMiddleware;
