const { supabase } = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * Middleware para autenticação por API Key e isolamento de tenant
 */
const tenantAuth = async (req, res, next) => {
  try {
    // Extrair API Key do header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key required. Provide via X-API-Key header or Authorization Bearer token.'
      });
    }

    // Hash da API key para busca no banco
    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    
    // Validar API Key usando a função do banco
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_api_key', { api_key_hash: apiKeyHash });

    if (validationError) {
      console.error('Error validating API key:', validationError);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }

    if (!validationResult || validationResult.length === 0 || !validationResult[0].is_valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API Key'
      });
    }

    const tenant = validationResult[0];

    // Definir contexto do tenant no banco
    const { error: contextError } = await supabase
      .rpc('set_tenant_context', { tenant_uuid: tenant.tenant_id });

    if (contextError) {
      console.error('Error setting tenant context:', contextError);
      return res.status(500).json({
        success: false,
        error: 'Failed to set tenant context'
      });
    }

    // Verificar rate limiting
    const rateLimitResult = await checkRateLimit(apiKey, req.path, req.method, tenant.rate_limit);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        limit: tenant.rate_limit,
        reset_at: rateLimitResult.reset_at
      });
    }

    // Verificar permissões para a operação
    const hasPermission = checkPermissions(req.method, req.path, tenant.permissions);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for this operation'
      });
    }

    console.log(`Setting tenant context: ${tenant.tenant_slug} (${tenant.tenant_id})`);

    // Adicionar informações do tenant ao request
    req.tenant = {
      id: tenant.tenant_id,
      slug: tenant.tenant_slug,
      schema: 'public', // Usando public com RLS por enquanto
      permissions: tenant.permissions,
      apiKey: apiKey
    };

    // Log API usage
    await logApiUsage(apiKeyHash, req.path, req.method, req.ip, req.get('User-Agent'));

    next();
  } catch (error) {
    console.error('Tenant auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Verificar rate limiting (simplificado)
 */
const checkRateLimit = async (apiKey, endpoint, method, limit) => {
  // Implementação simplificada - em produção usar Redis
  // Por enquanto, sempre permitir
  return {
    allowed: true,
    remaining: limit - 1,
    reset_at: new Date(Date.now() + 3600000) // 1 hora
  };
};

/**
 * Verificar permissões baseadas no método HTTP e endpoint
 */
const checkPermissions = (method, path, permissions) => {
  const userPermissions = Array.isArray(permissions) ? permissions : [];

  // Mapear operações HTTP para permissões
  const operationMap = {
    'GET': 'read',
    'POST': 'write',
    'PUT': 'write',
    'PATCH': 'write',
    'DELETE': 'admin'
  };

  const requiredPermission = operationMap[method] || 'read';

  // Verificar se o usuário tem a permissão necessária
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin');
};

/**
 * Log API usage usando a função do banco
 */
const logApiUsage = async (apiKeyHash, endpoint, method, ipAddress, userAgent) => {
  try {
    await supabase.rpc('log_api_usage', {
      p_api_key_hash: apiKeyHash,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: 200, // Will be updated later if needed
      p_response_time_ms: null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Não falhar a requisição por causa deste erro
  }
};

/**
 * Middleware para operações que requerem permissão de admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.tenant || !req.tenant.permissions.includes('admin')) {
    return res.status(403).json({
      success: false,
      error: 'Admin permission required'
    });
  }
  next();
};

/**
 * Middleware para operações que requerem permissão de escrita
 */
const requireWrite = (req, res, next) => {
  const writePermissions = ['write', 'admin'];
  const hasWritePermission = req.tenant?.permissions?.some(p => writePermissions.includes(p));
  
  if (!hasWritePermission) {
    return res.status(403).json({
      success: false,
      error: 'Write permission required'
    });
  }
  next();
};

/**
 * Utilitário para executar queries no schema do tenant
 */
const withTenantSchema = (schema) => {
  return {
    from: (table) => supabase.from(`${schema}.${table}`),
    rpc: (fn, params) => supabase.rpc(fn, { ...params, schema_name: schema })
  };
};

module.exports = {
  tenantAuth,
  requireAdmin,
  requireWrite,
  withTenantSchema,
  checkRateLimit,
  checkPermissions
};
