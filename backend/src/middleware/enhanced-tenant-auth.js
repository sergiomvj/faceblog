const { supabase } = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware melhorado para autenticação por API Key e isolamento de tenant
 * Com rate limiting persistente e validação robusta
 */
class EnhancedTenantAuth {
  constructor() {
    this.rateLimitCache = new Map(); // Cache em memória para rate limiting
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 60000); // Cleanup a cada minuto
  }

  /**
   * Middleware principal de autenticação
   */
  authenticate = async (req, res, next) => {
    try {
      // Extrair API Key do header
      const apiKey = this.extractAPIKey(req);
      
      if (!apiKey) {
        return this.sendError(res, 401, 'API Key required', 'MISSING_API_KEY');
      }

      // Validar formato da API Key
      if (!this.isValidAPIKeyFormat(apiKey)) {
        return this.sendError(res, 401, 'Invalid API Key format', 'INVALID_FORMAT');
      }

      // Hash da API key para busca segura
      const keyHash = this.hashAPIKey(apiKey);
      
      // Validar API Key no banco
      const validationResult = await this.validateAPIKey(keyHash);
      
      if (!validationResult.isValid) {
        return this.sendError(res, 401, validationResult.error || 'Invalid API Key', 'INVALID_KEY');
      }

      const { tenant, apiKeyData } = validationResult;

      // Verificar rate limiting
      const rateLimitResult = await this.checkRateLimit(apiKeyData, req);
      
      if (!rateLimitResult.allowed) {
        return this.sendError(res, 429, 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });
      }

      // Definir contexto do tenant no banco
      await this.setTenantContext(tenant.id);

      // Log da utilização da API
      await this.logAPIUsage(apiKeyData.id, req);

      // Adicionar dados ao request
      req.tenant = tenant;
      req.apiKey = apiKeyData;
      req.rateLimitInfo = rateLimitResult;

      next();

    } catch (error) {
      console.error('Authentication error:', error);
      return this.sendError(res, 500, 'Authentication service error', 'INTERNAL_ERROR');
    }
  };

  /**
   * Extrair API Key dos headers
   */
  extractAPIKey(req) {
    return req.headers['x-api-key'] || 
           req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
           req.query.api_key;
  }

  /**
   * Validar formato da API Key
   */
  isValidAPIKeyFormat(apiKey) {
    // Formato esperado: fb_[tenant]_[hash64]
    const pattern = /^fb_[a-zA-Z0-9_-]+_[a-fA-F0-9]{64}$/;
    return pattern.test(apiKey);
  }

  /**
   * Hash seguro da API Key
   */
  hashAPIKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Validar API Key no banco de dados
   */
  async validateAPIKey(keyHash) {
    try {
      const { data, error } = await supabase
        .rpc('validate_api_key', { api_key_input: keyHash });

      if (error) {
        console.error('Database validation error:', error);
        return { isValid: false, error: 'Database error' };
      }

      if (!data || data.length === 0 || !data[0].is_valid) {
        return { isValid: false, error: 'Invalid or expired API Key' };
      }

      const result = data[0];
      
      return {
        isValid: true,
        tenant: {
          id: result.tenant_id,
          name: result.tenant_name
        },
        apiKeyData: {
          id: result.api_key_id,
          permissions: result.permissions,
          rateLimit: result.rate_limit_per_hour
        }
      };

    } catch (error) {
      console.error('API Key validation error:', error);
      return { isValid: false, error: 'Validation error' };
    }
  }

  /**
   * Verificar rate limiting com persistência
   */
  async checkRateLimit(apiKeyData, req) {
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const cacheKey = `${apiKeyData.id}_${windowStart.getTime()}`;

    try {
      // Verificar cache em memória primeiro
      let usage = this.rateLimitCache.get(cacheKey);
      
      if (!usage) {
        // Buscar do banco de dados
        const { data, error } = await supabase
          .from('api_usage_tracking')
          .select('request_count')
          .eq('api_key_id', apiKeyData.id)
          .gte('window_start', windowStart.toISOString())
          .lt('window_start', new Date(windowStart.getTime() + 3600000).toISOString()) // +1 hora
          .single();

        usage = data ? data.request_count : 0;
        this.rateLimitCache.set(cacheKey, usage);
      }

      const limit = apiKeyData.rateLimit || 1000;
      const remaining = Math.max(0, limit - usage - 1);
      const allowed = usage < limit;

      if (allowed) {
        // Incrementar contador
        await this.incrementUsageCounter(apiKeyData.id, windowStart, req);
        this.rateLimitCache.set(cacheKey, usage + 1);
      }

      return {
        allowed,
        limit,
        remaining,
        resetTime: new Date(windowStart.getTime() + 3600000), // +1 hora
        current: usage + (allowed ? 1 : 0)
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      // Em caso de erro, permitir a requisição (fail-open)
      return {
        allowed: true,
        limit: apiKeyData.rateLimit || 1000,
        remaining: 999,
        resetTime: new Date(windowStart.getTime() + 3600000)
      };
    }
  }

  /**
   * Incrementar contador de uso no banco
   */
  async incrementUsageCounter(apiKeyId, windowStart, req) {
    try {
      const { error } = await supabase
        .rpc('increment_api_usage', {
          p_api_key_id: apiKeyId,
          p_window_start: windowStart.toISOString(),
          p_endpoint: req.path,
          p_method: req.method,
          p_ip_address: req.ip,
          p_user_agent: req.get('User-Agent') || 'Unknown'
        });

      if (error) {
        console.error('Usage counter increment error:', error);
      }
    } catch (error) {
      console.error('Usage counter error:', error);
    }
  }

  /**
   * Definir contexto do tenant no banco
   */
  async setTenantContext(tenantId) {
    try {
      const { error } = await supabase
        .rpc('set_tenant_context', { tenant_uuid: tenantId });

      if (error) {
        console.error('Tenant context error:', error);
      }
    } catch (error) {
      console.error('Set tenant context error:', error);
    }
  }

  /**
   * Log de utilização da API
   */
  async logAPIUsage(apiKeyId, req) {
    try {
      // Log assíncrono para não bloquear a requisição
      setImmediate(async () => {
        const { error } = await supabase
          .from('api_usage_logs')
          .insert({
            api_key_id: apiKeyId,
            endpoint: req.path,
            method: req.method,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            query_params: JSON.stringify(req.query),
            timestamp: new Date().toISOString()
          });

        if (error) {
          console.error('API usage log error:', error);
        }
      });
    } catch (error) {
      console.error('Log API usage error:', error);
    }
  }

  /**
   * Cleanup do cache de rate limiting
   */
  cleanupCache() {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hora atrás

    for (const [key, value] of this.rateLimitCache.entries()) {
      const [, timestamp] = key.split('_');
      if (parseInt(timestamp) < oneHourAgo) {
        this.rateLimitCache.delete(key);
      }
    }
  }

  /**
   * Middleware para verificar permissões específicas
   */
  requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.apiKey || !req.apiKey.permissions) {
        return this.sendError(res, 403, 'No permissions data', 'NO_PERMISSIONS');
      }

      const permissions = Array.isArray(req.apiKey.permissions) 
        ? req.apiKey.permissions 
        : req.apiKey.permissions.permissions || [];

      if (!permissions.includes(permission) && !permissions.includes('admin')) {
        return this.sendError(res, 403, `Permission '${permission}' required`, 'INSUFFICIENT_PERMISSIONS');
      }

      next();
    };
  };

  /**
   * Middleware para operações de escrita
   */
  requireWrite = this.requirePermission('write');

  /**
   * Middleware para operações de admin
   */
  requireAdmin = this.requirePermission('admin');

  /**
   * Enviar resposta de erro padronizada
   */
  sendError(res, status, message, code, extra = {}) {
    return res.status(status).json({
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
        ...extra
      }
    });
  }

  /**
   * Middleware para adicionar headers de rate limiting
   */
  addRateLimitHeaders = (req, res, next) => {
    if (req.rateLimitInfo) {
      res.set({
        'X-RateLimit-Limit': req.rateLimitInfo.limit,
        'X-RateLimit-Remaining': req.rateLimitInfo.remaining,
        'X-RateLimit-Reset': Math.ceil(req.rateLimitInfo.resetTime.getTime() / 1000)
      });
    }
    next();
  };

  /**
   * Destructor para cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Instância singleton
const enhancedAuth = new EnhancedTenantAuth();

module.exports = {
  authenticate: enhancedAuth.authenticate,
  requireWrite: enhancedAuth.requireWrite,
  requireAdmin: enhancedAuth.requireAdmin,
  requirePermission: enhancedAuth.requirePermission,
  addRateLimitHeaders: enhancedAuth.addRateLimitHeaders,
  EnhancedTenantAuth
};
