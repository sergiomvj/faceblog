const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { supabase } = require('../config/database');
const { tenantAuth, requireAdmin } = require('../middleware/tenant-auth');

const router = express.Router();

// Aplicar middleware de autenticação por tenant
router.use(tenantAuth);

// =====================================================
// API KEYS CRUD - Multi-tenant
// =====================================================

// GET /api/v1/api-keys - Listar API Keys do tenant
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('api_keys')
      .select(`
        id,
        key_prefix,
        name,
        permissions,
        rate_limit_per_hour,
        is_active,
        last_used_at,
        expires_at,
        created_by,
        created_at,
        updated_at,
        creator:users!created_by(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtro por status
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: apiKeys, error, count } = await query;

    if (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }

    res.json({
      success: true,
      data: {
        api_keys: apiKeys,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
      details: error.message
    });
  }
});

// GET /api/v1/api-keys/:id - Obter API Key específica
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        key_prefix,
        name,
        permissions,
        rate_limit_per_hour,
        is_active,
        last_used_at,
        expires_at,
        created_by,
        created_at,
        updated_at,
        creator:users!created_by(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'API Key not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: apiKey
    });

  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API key',
      details: error.message
    });
  }
});

// POST /api/v1/api-keys - Criar nova API Key
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      permissions = ['read'],
      rate_limit_per_hour = 1000,
      expires_at
    } = req.body;

    // Validação
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'API Key name is required'
      });
    }

    // Gerar API Key
    const apiKeyValue = generateApiKey();
    const keyHash = await bcrypt.hash(apiKeyValue, 12);
    const keyPrefix = apiKeyValue.substring(0, 12); // fb_xxxxxxxx

    // Validar data de expiração
    let expirationDate = null;
    if (expires_at) {
      expirationDate = new Date(expires_at);
      if (expirationDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Expiration date must be in the future'
        });
      }
    }

    // Criar API Key no banco
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: req.tenant.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: name.trim(),
        permissions: JSON.stringify(permissions),
        rate_limit_per_hour: parseInt(rate_limit_per_hour),
        expires_at: expirationDate?.toISOString(),
        created_by: req.user?.id || req.tenant.id // Fallback para tenant ID
      })
      .select(`
        id,
        key_prefix,
        name,
        permissions,
        rate_limit_per_hour,
        is_active,
        expires_at,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      throw error;
    }

    // Retornar API Key completa apenas na criação (única vez)
    res.status(201).json({
      success: true,
      data: {
        ...apiKey,
        api_key: apiKeyValue // Mostrar chave completa apenas na criação
      },
      message: 'API Key created successfully. Save this key securely - it will not be shown again.'
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      details: error.message
    });
  }
});

// PUT /api/v1/api-keys/:id - Atualizar API Key
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      permissions,
      rate_limit_per_hour,
      is_active,
      expires_at
    } = req.body;

    // Preparar dados para atualização
    const updateData = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'API Key name cannot be empty'
        });
      }
      updateData.name = name.trim();
    }

    if (permissions !== undefined) {
      updateData.permissions = JSON.stringify(permissions);
    }

    if (rate_limit_per_hour !== undefined) {
      updateData.rate_limit_per_hour = parseInt(rate_limit_per_hour);
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    if (expires_at !== undefined) {
      if (expires_at) {
        const expirationDate = new Date(expires_at);
        if (expirationDate <= new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Expiration date must be in the future'
          });
        }
        updateData.expires_at = expirationDate.toISOString();
      } else {
        updateData.expires_at = null;
      }
    }

    updateData.updated_at = new Date().toISOString();

    // Atualizar no banco
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        key_prefix,
        name,
        permissions,
        rate_limit_per_hour,
        is_active,
        last_used_at,
        expires_at,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'API Key not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: apiKey,
      message: 'API Key updated successfully'
    });

  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key',
      details: error.message
    });
  }
});

// DELETE /api/v1/api-keys/:id - Deletar API Key
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe
    const { data: existingKey, error: checkError } = await supabase
      .from('api_keys')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'API Key not found'
        });
      }
      throw checkError;
    }

    // Deletar (soft delete seria melhor, mas por simplicidade usar hard delete)
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `API Key "${existingKey.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key',
      details: error.message
    });
  }
});

// POST /api/v1/api-keys/:id/regenerate - Regenerar API Key
router.post('/:id/regenerate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe
    const { data: existingKey, error: checkError } = await supabase
      .from('api_keys')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'API Key not found'
        });
      }
      throw checkError;
    }

    // Gerar nova API Key
    const newApiKeyValue = generateApiKey();
    const newKeyHash = await bcrypt.hash(newApiKeyValue, 12);
    const newKeyPrefix = newApiKeyValue.substring(0, 12);

    // Atualizar no banco
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update({
        key_hash: newKeyHash,
        key_prefix: newKeyPrefix,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        key_prefix,
        name,
        permissions,
        rate_limit_per_hour,
        is_active,
        expires_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        ...apiKey,
        api_key: newApiKeyValue // Mostrar nova chave apenas uma vez
      },
      message: 'API Key regenerated successfully. Save this key securely - it will not be shown again.'
    });

  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate API key',
      details: error.message
    });
  }
});

// GET /api/v1/api-keys/:id/usage - Obter estatísticas de uso
router.get('/:id/usage', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;

    // Verificar se API Key existe
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id, name')
      .eq('id', id)
      .single();

    if (keyError) {
      if (keyError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'API Key not found'
        });
      }
      throw keyError;
    }

    // Buscar estatísticas de uso
    const { data: usage, error: usageError } = await supabase
      .from('api_key_usage')
      .select('endpoint, method, status_code, created_at')
      .eq('api_key_id', id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (usageError) {
      throw usageError;
    }

    // Processar estatísticas
    const stats = {
      total_requests: usage.length,
      requests_by_day: {},
      requests_by_endpoint: {},
      requests_by_status: {},
      recent_requests: usage.slice(0, 10)
    };

    usage.forEach(req => {
      const day = req.created_at.split('T')[0];
      stats.requests_by_day[day] = (stats.requests_by_day[day] || 0) + 1;
      
      stats.requests_by_endpoint[req.endpoint] = (stats.requests_by_endpoint[req.endpoint] || 0) + 1;
      
      const statusGroup = Math.floor(req.status_code / 100) * 100;
      stats.requests_by_status[`${statusGroup}xx`] = (stats.requests_by_status[`${statusGroup}xx`] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        api_key: apiKey,
        period_days: parseInt(days),
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Error fetching API key usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API key usage',
      details: error.message
    });
  }
});

// POST /api/v1/api-keys/bulk-create - Criar múltiplas API Keys
router.post('/bulk-create', requireAdmin, async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keys array is required and must not be empty'
      });
    }
    
    if (keys.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 keys can be created at once'
      });
    }
    
    const createdKeys = [];
    const errors = [];
    
    for (let i = 0; i < keys.length; i++) {
      const keyData = keys[i];
      try {
        const apiKeyValue = generateApiKey();
        const keyHash = await bcrypt.hash(apiKeyValue, 12);
        const keyPrefix = apiKeyValue.substring(0, 12);
        
        let expirationDate = null;
        if (keyData.expires_at) {
          expirationDate = new Date(keyData.expires_at);
          if (expirationDate <= new Date()) {
            errors.push({ index: i, error: 'Expiration date must be in the future' });
            continue;
          }
        }
        
        const { data: apiKey, error } = await supabase
          .from('api_keys')
          .insert({
            tenant_id: req.tenant.id,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            name: keyData.name || `API Key ${i + 1}`,
            permissions: JSON.stringify(keyData.permissions || ['read']),
            rate_limit_per_hour: parseInt(keyData.rate_limit_per_hour || 1000),
            expires_at: expirationDate?.toISOString(),
            created_by: req.user?.id || req.tenant.id
          })
          .select('id, key_prefix, name, permissions, rate_limit_per_hour, expires_at')
          .single();
          
        if (error) {
          errors.push({ index: i, error: error.message });
        } else {
          createdKeys.push({
            ...apiKey,
            api_key: apiKeyValue
          });
        }
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        created_keys: createdKeys,
        errors: errors
      },
      message: `${createdKeys.length} API Keys created successfully. ${errors.length} errors occurred.`
    });
    
  } catch (error) {
    console.error('Error bulk creating API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create API keys',
      details: error.message
    });
  }
});

// GET /api/v1/api-keys/analytics/overview - Analytics gerais
router.get('/analytics/overview', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Estatísticas básicas
    const { data: totalKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, is_active, created_at, last_used_at, expires_at')
      .gte('created_at', startDate.toISOString());
      
    if (keysError) throw keysError;
    
    // Uso total da API
    const { data: totalUsage, error: usageError } = await supabase
      .from('api_usage_tracking')
      .select('api_key_id, endpoint, status_code, created_at')
      .gte('created_at', startDate.toISOString());
      
    if (usageError) throw usageError;
    
    // Processar estatísticas
    const stats = {
      total_keys: totalKeys.length,
      active_keys: totalKeys.filter(k => k.is_active).length,
      inactive_keys: totalKeys.filter(k => !k.is_active).length,
      expired_keys: totalKeys.filter(k => k.expires_at && new Date(k.expires_at) < new Date()).length,
      recently_used: totalKeys.filter(k => k.last_used_at && new Date(k.last_used_at) > startDate).length,
      total_requests: totalUsage.length,
      requests_by_day: {},
      top_endpoints: {},
      status_distribution: {},
      most_active_keys: {}
    };
    
    // Processar uso por dia
    totalUsage.forEach(usage => {
      const day = usage.created_at.split('T')[0];
      stats.requests_by_day[day] = (stats.requests_by_day[day] || 0) + 1;
      
      stats.top_endpoints[usage.endpoint] = (stats.top_endpoints[usage.endpoint] || 0) + 1;
      
      const statusGroup = Math.floor(usage.status_code / 100) * 100;
      stats.status_distribution[`${statusGroup}xx`] = (stats.status_distribution[`${statusGroup}xx`] || 0) + 1;
      
      stats.most_active_keys[usage.api_key_id] = (stats.most_active_keys[usage.api_key_id] || 0) + 1;
    });
    
    // Converter para arrays ordenados
    stats.top_endpoints = Object.entries(stats.top_endpoints)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
      
    stats.most_active_keys = Object.entries(stats.most_active_keys)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key_id, count]) => ({ key_id, count }));
    
    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        overview: stats
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

// GET /api/v1/api-keys/health-check - Health check das API Keys
router.get('/health-check', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const warningDays = 7; // Avisar 7 dias antes da expiração
    const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);
    
    // Buscar todas as chaves
    const { data: allKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, is_active, expires_at, last_used_at, created_at');
      
    if (error) throw error;
    
    const health = {
      total_keys: allKeys.length,
      active_keys: allKeys.filter(k => k.is_active).length,
      inactive_keys: allKeys.filter(k => !k.is_active).length,
      expired_keys: allKeys.filter(k => k.expires_at && new Date(k.expires_at) < now),
      expiring_soon: allKeys.filter(k => k.expires_at && new Date(k.expires_at) > now && new Date(k.expires_at) < warningDate),
      never_used: allKeys.filter(k => !k.last_used_at),
      unused_30_days: allKeys.filter(k => k.last_used_at && new Date(k.last_used_at) < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
      issues: []
    };
    
    // Identificar problemas
    if (health.expired_keys.length > 0) {
      health.issues.push({
        type: 'expired_keys',
        severity: 'high',
        count: health.expired_keys.length,
        message: `${health.expired_keys.length} API keys have expired`
      });
    }
    
    if (health.expiring_soon.length > 0) {
      health.issues.push({
        type: 'expiring_soon',
        severity: 'medium',
        count: health.expiring_soon.length,
        message: `${health.expiring_soon.length} API keys will expire within ${warningDays} days`
      });
    }
    
    if (health.unused_30_days.length > 0) {
      health.issues.push({
        type: 'unused_keys',
        severity: 'low',
        count: health.unused_30_days.length,
        message: `${health.unused_30_days.length} API keys haven't been used in 30 days`
      });
    }
    
    const healthScore = Math.max(0, 100 - (health.issues.length * 10) - (health.expired_keys.length * 5));
    
    res.json({
      success: true,
      data: {
        health_score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
        summary: health,
        recommendations: generateRecommendations(health)
      }
    });
    
  } catch (error) {
    console.error('Error checking API keys health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API keys health',
      details: error.message
    });
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Gerar API Key segura
 */
function generateApiKey() {
  const prefix = 'fb_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
}

/**
 * Gerar recomendações baseadas no health check
 */
function generateRecommendations(health) {
  const recommendations = [];
  
  if (health.expired_keys.length > 0) {
    recommendations.push({
      type: 'cleanup',
      priority: 'high',
      action: 'Remove expired API keys',
      description: `Clean up ${health.expired_keys.length} expired API keys to improve security`
    });
  }
  
  if (health.expiring_soon.length > 0) {
    recommendations.push({
      type: 'renewal',
      priority: 'medium',
      action: 'Renew expiring API keys',
      description: `${health.expiring_soon.length} API keys will expire soon. Consider extending or regenerating them`
    });
  }
  
  if (health.unused_30_days.length > 0) {
    recommendations.push({
      type: 'optimization',
      priority: 'low',
      action: 'Review unused API keys',
      description: `${health.unused_30_days.length} API keys haven't been used recently. Consider deactivating them`
    });
  }
  
  if (health.active_keys === 0) {
    recommendations.push({
      type: 'setup',
      priority: 'high',
      action: 'Create API keys',
      description: 'No active API keys found. Create at least one API key to enable API access'
    });
  }
  
  return recommendations;
}

module.exports = router;
