import { Request, Response, NextFunction } from 'express';
import { knex } from '@/config/database';
import { redisConfig } from '@/config/redis';
import { logger } from '@/utils/logger';
import { Tenant, AuthRequest } from '@/types';

/**
 * Multi-tenant middleware that identifies and validates tenants
 * Supports identification by:
 * 1. Subdomain (subdomain.blogservice.com)
 * 2. Custom domain (blog.company.com)
 * 3. API Key header (X-API-Key)
 * 4. Tenant ID header (X-Tenant-ID)
 */

interface TenantRequest extends AuthRequest {
  tenant: Tenant;
  tenantSchema: string;
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let tenant: Tenant | null = null;
    const host = req.get('host') || '';
    const apiKey = req.get('X-API-Key');
    const tenantId = req.get('X-Tenant-ID');

    // Method 1: Identify by API Key
    if (apiKey) {
      tenant = await getTenantByApiKey(apiKey);
      if (!tenant) {
        res.status(401).json({
          success: false,
          message: 'Invalid API key',
        });
        return;
      }
    }
    
    // Method 2: Identify by Tenant ID header
    else if (tenantId) {
      tenant = await getTenantById(tenantId);
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
        return;
      }
    }
    
    // Method 3: Identify by custom domain
    else if (host && !host.includes('blogservice.com')) {
      tenant = await getTenantByCustomDomain(host);
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Domain not configured',
        });
        return;
      }
    }
    
    // Method 4: Identify by subdomain
    else if (host.includes('blogservice.com')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenant = await getTenantBySubdomain(subdomain);
        if (!tenant) {
          res.status(404).json({
            success: false,
            message: 'Subdomain not found',
          });
          return;
        }
      }
    }

    // If no tenant identified and not a system route, return error
    if (!tenant && !isSystemRoute(req.path)) {
      res.status(400).json({
        success: false,
        message: 'Tenant identification required',
      });
      return;
    }

    // Validate tenant status
    if (tenant) {
      if (tenant.status === 'suspended') {
        res.status(403).json({
          success: false,
          message: 'Tenant account suspended',
        });
        return;
      }

      if (tenant.status === 'expired') {
        res.status(402).json({
          success: false,
          message: 'Tenant subscription expired',
        });
        return;
      }

      // Set tenant context in request
      (req as TenantRequest).tenant = tenant;
      (req as TenantRequest).tenantSchema = tenant.schema_name;

      // Set database schema for this request
      await setTenantSchema(tenant.schema_name);
    }

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

async function getTenantByApiKey(apiKey: string): Promise<Tenant | null> {
  const cacheKey = `tenant:api_key:${apiKey}`;
  
  // Try cache first
  const cached = await redisConfig.get<Tenant>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await knex('tenants as t')
    .join('api_keys as ak', 't.id', 'ak.tenant_id')
    .where('ak.key_hash', apiKey)
    .where('ak.expires_at', '>', new Date())
    .where('t.status', '!=', 'deleted')
    .select('t.*')
    .first();

  if (result) {
    // Cache for 1 hour
    await redisConfig.set(cacheKey, result, 3600);
    
    // Update last used timestamp for API key
    await knex('api_keys')
      .where('key_hash', apiKey)
      .update({ last_used_at: new Date() });
  }

  return result || null;
}

async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const cacheKey = `tenant:id:${tenantId}`;
  
  // Try cache first
  const cached = await redisConfig.get<Tenant>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await knex('tenants')
    .where('id', tenantId)
    .where('status', '!=', 'deleted')
    .first();

  if (result) {
    // Cache for 1 hour
    await redisConfig.set(cacheKey, result, 3600);
  }

  return result || null;
}

async function getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
  const cacheKey = `tenant:domain:${domain}`;
  
  // Try cache first
  const cached = await redisConfig.get<Tenant>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await knex('tenants')
    .whereRaw("settings->>'custom_domain' = ?", [domain])
    .where('status', '!=', 'deleted')
    .first();

  if (result) {
    // Cache for 1 hour
    await redisConfig.set(cacheKey, result, 3600);
  }

  return result || null;
}

async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const cacheKey = `tenant:subdomain:${subdomain}`;
  
  // Try cache first
  const cached = await redisConfig.get<Tenant>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await knex('tenants')
    .where('subdomain', subdomain)
    .where('status', '!=', 'deleted')
    .first();

  if (result) {
    // Cache for 1 hour
    await redisConfig.set(cacheKey, result, 3600);
  }

  return result || null;
}

async function setTenantSchema(schemaName: string): Promise<void> {
  try {
    // Set the search_path for this connection to the tenant's schema
    await knex.raw(`SET search_path TO "${schemaName}", public`);
  } catch (error) {
    logger.error(`Failed to set schema to ${schemaName}:`, error);
    throw error;
  }
}

function isSystemRoute(path: string): boolean {
  const systemRoutes = [
    '/health',
    '/metrics',
    '/api/system',
    '/api/auth/system',
    '/api/tenants/create',
    '/api/webhooks',
  ];
  
  return systemRoutes.some(route => path.startsWith(route));
}

// Middleware to ensure tenant context exists
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const tenantReq = req as TenantRequest;
  
  if (!tenantReq.tenant) {
    res.status(400).json({
      success: false,
      message: 'Tenant context required',
    });
    return;
  }
  
  next();
};

// Helper function to get current tenant from request
export const getCurrentTenant = (req: Request): Tenant | null => {
  return (req as TenantRequest).tenant || null;
};

// Helper function to get current tenant schema from request
export const getCurrentTenantSchema = (req: Request): string | null => {
  return (req as TenantRequest).tenantSchema || null;
};
