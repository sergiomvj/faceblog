const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../config/database-vps');

class JWTAuth {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiresIn,
      issuer: 'faceblog-api',
      audience: 'faceblog-client'
    });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, { 
      expiresIn: this.refreshExpiresIn,
      issuer: 'faceblog-api',
      audience: 'faceblog-client'
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'faceblog-api',
        audience: 'faceblog-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: 'faceblog-api',
        audience: 'faceblog-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.bcryptRounds);
  }

  // Compare password
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Register new user
  async register(tenantId, userData) {
    const { email, password, firstName, lastName, role = 'author' } = userData;

    try {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
        [tenantId, email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new user
      const result = await query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true, false)
        RETURNING id, email, first_name, last_name, role, created_at
      `, [tenantId, email, passwordHash, firstName, lastName, role]);

      const user = result.rows[0];

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        tenantId,
        email: user.email,
        role: user.role
      };

      const accessToken = this.generateToken(tokenPayload);
      const refreshToken = this.generateRefreshToken({ userId: user.id, tenantId });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          createdAt: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtExpiresIn
        }
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(tenantId, email, password) {
    try {
      // Get user with password hash
      const result = await query(`
        SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified, permissions
        FROM users 
        WHERE tenant_id = $1 AND email = $2
      `, [tenantId, email]);

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        tenantId,
        email: user.email,
        role: user.role,
        permissions: user.permissions || []
      };

      const accessToken = this.generateToken(tokenPayload);
      const refreshToken = this.generateRefreshToken({ userId: user.id, tenantId });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          permissions: user.permissions || [],
          emailVerified: user.email_verified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtExpiresIn
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Get current user data
      const result = await query(`
        SELECT id, email, role, tenant_id, is_active, permissions
        FROM users 
        WHERE id = $1 AND tenant_id = $2
      `, [decoded.userId, decoded.tenantId]);

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new Error('User not found or inactive');
      }

      const user = result.rows[0];

      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || []
      };

      const accessToken = this.generateToken(tokenPayload);

      return {
        accessToken,
        expiresIn: this.jwtExpiresIn
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId, tenantId) {
    try {
      const result = await query(`
        SELECT id, email, first_name, last_name, role, permissions, avatar_url, bio, 
               is_active, email_verified, last_login_at, created_at
        FROM users 
        WHERE id = $1 AND tenant_id = $2
      `, [userId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        permissions: user.permissions || [],
        avatarUrl: user.avatar_url,
        bio: user.bio,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      };

    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, tenantId, updates) {
    try {
      const allowedFields = ['first_name', 'last_name', 'bio', 'avatar_url'];
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(userId, tenantId);
      
      const result = await query(`
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
        RETURNING id, email, first_name, last_name, role, avatar_url, bio
      `, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, tenantId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.comparePassword(currentPassword, result.rows[0].password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [newPasswordHash, userId, tenantId]
      );

      return { success: true, message: 'Password updated successfully' };

    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Logout (invalidate tokens - in a real app, you'd maintain a blacklist)
  async logout(userId, tenantId) {
    try {
      // Update last logout time (optional)
      await query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

module.exports = new JWTAuth();
