const { pool } = require('../config/database-vps');

/**
 * Middleware to resolve tenant from subdomain or custom domain
 */
async function resolveTenant(req, res, next) {
  try {
    const host = req.get('host') || req.headers.host;
    let tenant = null;
    let tenantData = null;

    console.log(`[TENANT-RESOLVER] Resolving host: ${host}`);

    // Priority 1: Check for custom domain first (blog.lifewayusa.app)
    const customDomainResult = await pool.query(
      'SELECT * FROM tenants WHERE custom_domain = $1 AND status = $2',
      [host, 'active']
    );
    
    if (customDomainResult.rows.length > 0) {
      tenantData = customDomainResult.rows[0];
      tenant = tenantData.slug;
      console.log(`[TENANT-RESOLVER] Found custom domain: ${host} -> ${tenant}`);
    } else {
      // Priority 2: Extract subdomain (cliente1.faceblog.com.br -> cliente1)
      const subdomainMatch = host.match(/^([^.]+)\.faceblog\.com\.br$/);
      
      if (subdomainMatch) {
        const subdomain = subdomainMatch[1];
        
        // Skip system subdomains
        if (['api', 'admin', 'www'].includes(subdomain)) {
          console.log(`[TENANT-RESOLVER] System subdomain detected: ${subdomain}`);
          return next();
        }
        
        // Find tenant by subdomain
        const result = await pool.query(
          'SELECT * FROM tenants WHERE subdomain = $1 AND status = $2',
          [subdomain, 'active']
        );
        
        if (result.rows.length > 0) {
          tenantData = result.rows[0];
          tenant = tenantData.slug;
          console.log(`[TENANT-RESOLVER] Found subdomain: ${subdomain} -> ${tenant}`);
        }
      }
    }

    // If no tenant found, use default or return error
    if (!tenant) {
      if (host.includes('faceblog.com.br')) {
        // Main domain - redirect to admin
        return res.redirect('https://admin.faceblog.com.br');
      } else {
        return res.status(404).json({
          error: 'Tenant not found',
          message: 'No active tenant found for this domain',
          domain: host
        });
      }
    }

    // Add tenant info to request
    req.tenant = {
      id: tenantData.id,
      slug: tenant,
      name: tenantData.name,
      subdomain: tenantData.subdomain,
      custom_domain: tenantData.custom_domain,
      settings: tenantData.settings || {},
      plan: tenantData.plan || 'basic'
    };

    // Add tenant_id to all database queries
    req.tenantId = tenantData.id;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({
      error: 'Tenant resolution failed',
      message: error.message
    });
  }
}

/**
 * Middleware for API routes that require tenant context
 */
async function requireTenant(req, res, next) {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant required',
      message: 'This endpoint requires a valid tenant context'
    });
  }
  next();
}

/**
 * Get tenant by API key (for API access)
 */
async function getTenantByApiKey(apiKey) {
  try {
    const result = await pool.query(
      'SELECT * FROM tenants WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('API key lookup error:', error);
    return null;
  }
}

module.exports = {
  resolveTenant,
  requireTenant,
  getTenantByApiKey
};
