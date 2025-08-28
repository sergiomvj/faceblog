const express = require('express');
const jwtAuth = require('../auth/jwt-auth');
const { extractTenant, verifyToken, rateLimitByUser } = require('../middleware/auth-middleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().isLength({ min: 2, max: 50 }),
  body('lastName').trim().isLength({ min: 2, max: 50 }),
  body('role').optional().isIn(['admin', 'editor', 'author', 'subscriber'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
];

// Helper function to handle validation errors
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// POST /api/auth/register - Register new user
router.post('/register', 
  extractTenant,
  rateLimitByUser(5, 15 * 60 * 1000), // 5 registrations per 15 minutes
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      const result = await jwtAuth.register(req.tenant.id, {
        email,
        password,
        firstName,
        lastName,
        role
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'User already exists with this email',
          code: 'USER_EXISTS'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }
);

// POST /api/auth/login - User login
router.post('/login',
  extractTenant,
  rateLimitByUser(10, 15 * 60 * 1000), // 10 login attempts per 15 minutes
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const result = await jwtAuth.login(req.tenant.id, email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      if (error.message.includes('deactivated')) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh',
  extractTenant,
  rateLimitByUser(20, 15 * 60 * 1000), // 20 refresh attempts per 15 minutes
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const result = await jwtAuth.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
  }
);

// GET /api/auth/profile - Get user profile
router.get('/profile',
  extractTenant,
  verifyToken,
  async (req, res) => {
    try {
      const profile = await jwtAuth.getProfile(req.user.id, req.user.tenantId);

      res.json({
        success: true,
        data: { user: profile }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        code: 'PROFILE_ERROR'
      });
    }
  }
);

// PUT /api/auth/profile - Update user profile
router.put('/profile',
  extractTenant,
  verifyToken,
  [
    body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('avatarUrl').optional().isURL()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updates = {};
      const allowedFields = ['firstName', 'lastName', 'bio', 'avatarUrl'];
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          // Convert camelCase to snake_case for database
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          updates[dbField] = req.body[field];
        }
      });

      const result = await jwtAuth.updateProfile(req.user.id, req.user.tenantId, updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: result }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        code: 'UPDATE_PROFILE_ERROR'
      });
    }
  }
);

// PUT /api/auth/change-password - Change user password
router.put('/change-password',
  extractTenant,
  verifyToken,
  changePasswordValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const result = await jwtAuth.changePassword(
        req.user.id, 
        req.user.tenantId, 
        currentPassword, 
        newPassword
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
        data: result
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('incorrect')) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'INCORRECT_PASSWORD'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        code: 'CHANGE_PASSWORD_ERROR'
      });
    }
  }
);

// POST /api/auth/logout - User logout
router.post('/logout',
  extractTenant,
  verifyToken,
  async (req, res) => {
    try {
      const result = await jwtAuth.logout(req.user.id, req.user.tenantId);

      res.json({
        success: true,
        message: 'Logged out successfully',
        data: result
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  }
);

// GET /api/auth/verify - Verify token (for frontend)
router.get('/verify',
  extractTenant,
  verifyToken,
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            permissions: req.user.permissions
          },
          tenant: {
            id: req.tenant.id,
            name: req.tenant.name,
            slug: req.tenant.slug
          }
        }
      });

    } catch (error) {
      console.error('Token verification error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_ERROR'
      });
    }
  }
);

module.exports = router;
