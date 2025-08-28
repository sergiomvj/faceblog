import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { knex } from '@/config/database';
import { redisConfig } from '@/config/redis';
import { logger } from '@/utils/logger';
import { User, AuthRequest, Tenant } from '@/types';
import { getCurrentTenant } from './tenant';

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
      return;
    }

    // Get user from database
    const user = await getUserById(decoded.userId, decoded.tenantId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'User account is not active',
      });
      return;
    }

    // Verify tenant context matches
    const currentTenant = getCurrentTenant(req);
    if (currentTenant && user.tenant_id !== currentTenant.id) {
      res.status(403).json({
        success: false,
        message: 'User does not belong to this tenant',
      });
      return;
    }

    // Add user to request
    (req as AuthRequest).user = user;

    // Update last login timestamp
    await updateLastLogin(user.id);

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
      return;
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasPermission = await checkUserPermission(user.id, permission);
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`,
      });
      return;
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await getUserById(decoded.userId, decoded.tenantId);
      
      if (user && user.status === 'active') {
        (req as AuthRequest).user = user;
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Helper functions
function extractToken(req: Request): string | null {
  const authHeader = req.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

async function getUserById(userId: string, tenantId: string): Promise<User | null> {
  const cacheKey = `user:${tenantId}:${userId}`;
  
  // Try cache first
  const cached = await redisConfig.get<User>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const user = await knex('users')
    .where('id', userId)
    .where('tenant_id', tenantId)
    .first();

  if (user) {
    // Cache for 30 minutes
    await redisConfig.set(cacheKey, user, 1800);
  }

  return user || null;
}

async function isTokenBlacklisted(token: string): Promise<boolean> {
  const cacheKey = `blacklist:${token}`;
  return await redisConfig.exists(cacheKey);
}

async function updateLastLogin(userId: string): Promise<void> {
  try {
    await knex('users')
      .where('id', userId)
      .update({ last_login_at: new Date() });
  } catch (error) {
    logger.error('Failed to update last login:', error);
  }
}

async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  // This is a simplified permission check
  // In a real system, you might have a more complex RBAC system
  const user = await knex('users').where('id', userId).first();
  
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Define role-based permissions
  const rolePermissions: { [key: string]: string[] } = {
    admin: [
      'articles.create', 'articles.read', 'articles.update', 'articles.delete',
      'categories.create', 'categories.read', 'categories.update', 'categories.delete',
      'tags.create', 'tags.read', 'tags.update', 'tags.delete',
      'comments.read', 'comments.update', 'comments.delete',
      'users.create', 'users.read', 'users.update', 'users.delete',
      'settings.read', 'settings.update',
      'analytics.read',
    ],
    editor: [
      'articles.create', 'articles.read', 'articles.update', 'articles.delete',
      'categories.read', 'categories.update',
      'tags.read', 'tags.update',
      'comments.read', 'comments.update',
      'users.read',
    ],
    author: [
      'articles.create', 'articles.read', 'articles.update',
      'categories.read',
      'tags.read',
      'comments.read',
    ],
    reviewer: [
      'articles.read', 'articles.update',
      'categories.read',
      'tags.read',
      'comments.read', 'comments.update',
    ],
  };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
}

// Token generation utilities
export const generateTokens = (user: User): { accessToken: string; refreshToken: string } => {
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return await bcrypt.hash(password, rounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Token blacklisting
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisConfig.set(`blacklist:${token}`, true, ttl);
      }
    }
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
  }
};

// Get current user helper
export const getCurrentUser = (req: Request): User | null => {
  return (req as AuthRequest).user || null;
};
