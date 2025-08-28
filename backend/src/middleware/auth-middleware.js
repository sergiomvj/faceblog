const jwtAuth = require('../auth/jwt-auth');
const { query } = require('../config/database-vps');

// Extract tenant from API key
async function extractTenant(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        code: 'MISSING_API_KEY'
      });
    }

    // Get tenant by API key
    const result = await query(
      'SELECT id, name, slug, status FROM tenants WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key',
        code: 'INVALID_API_KEY'
      });
    }

    const tenant = result.rows[0];
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status
    };

    next();
  } catch (error) {
    console.error('Tenant extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'TENANT_EXTRACTION_ERROR'
    });
  }
}

// Verify JWT token
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwtAuth.verifyToken(token);

    // Verify tenant matches
    if (req.tenant && decoded.tenantId !== req.tenant.id) {
      return res.status(403).json({
        success: false,
        error: 'Token does not match tenant',
        code: 'TENANT_MISMATCH'
      });
    }

    req.user = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

// Check user permissions
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = req.user.permissions || [];
    const userRole = req.user.role;

    // Admin has all permissions
    if (userRole === 'admin' || userPermissions.includes('*')) {
      return next();
    }

    // Check specific permission
    if (userPermissions.includes(permission)) {
      return next();
    }

    // Role-based permissions
    const rolePermissions = {
      editor: ['articles:read', 'articles:write', 'articles:update', 'categories:read', 'tags:read'],
      author: ['articles:read', 'articles:write', 'articles:update:own'],
      subscriber: ['articles:read']
    };

    if (rolePermissions[userRole] && rolePermissions[userRole].includes(permission)) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: permission,
      userRole,
      userPermissions
    });
  };
}

// Check if user owns resource
function requireOwnership(resourceType) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required',
          code: 'MISSING_RESOURCE_ID'
        });
      }

      let ownershipQuery;
      switch (resourceType) {
        case 'article':
          ownershipQuery = 'SELECT author_id FROM articles WHERE id = $1 AND tenant_id = $2';
          break;
        case 'comment':
          ownershipQuery = 'SELECT author_email FROM comments WHERE id = $1 AND tenant_id = $2';
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }

      const result = await query(ownershipQuery, [resourceId, req.user.tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      const resource = result.rows[0];
      
      // Check ownership
      if (resourceType === 'article' && resource.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only modify your own articles',
          code: 'NOT_OWNER'
        });
      }

      if (resourceType === 'comment' && resource.author_email !== req.user.email) {
        return res.status(403).json({
          success: false,
          error: 'You can only modify your own comments',
          code: 'NOT_OWNER'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
}

// Optional authentication (for public endpoints that can benefit from user context)
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwtAuth.verifyToken(token);

    req.user = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
}

// Rate limiting by user
const userRateLimit = {};

function rateLimitByUser(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!userRateLimit[userId]) {
      userRateLimit[userId] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    const userLimit = userRateLimit[userId];
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    userLimit.count++;
    next();
  };
}

module.exports = {
  extractTenant,
  verifyToken,
  requirePermission,
  requireOwnership,
  optionalAuth,
  rateLimitByUser
};
