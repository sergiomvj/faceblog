import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/database';
// TODO: Import proper middleware when implemented
// import { authenticate, requireWrite, requireAdmin } from '../middleware/enhanced-tenant-auth';

// Temporary mock middleware
const authenticate = (req: any, res: any, next: any) => next();
const requireWrite = (req: any, res: any, next: any) => next();
const requireAdmin = (req: any, res: any, next: any) => next();
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Interfaces
interface AuthenticatedRequest extends Request {
  tenant?: {
    id: string;
    name: string;
  };
  apiKey?: {
    id: string;
    permissions: string[];
  };
}

// Login endpoint (simplified for demo)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password } = req.body;

    // Find user (simplified - in production use proper tenant isolation)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (userError || !user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Verify password (simplified - in production use proper hashing)
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
    
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate simple token (in production use proper JWT)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '24h' }
    );

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        user: userResponse,
        token: token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: (error as Error).message
    });
  }
});

// Register endpoint (simplified for demo)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').isLength({ min: 2 }),
  body('last_name').isLength({ min: 2 }),
  body('role').isIn(['admin', 'editor', 'author', 'reviewer']).optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, first_name, last_name, role = 'author' } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (simplified for demo)
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        role,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: createError.message
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password_hash, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token: token
      },
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: (error as Error).message
    });
  }
});

// Logout endpoint (simplified)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // In a real implementation, you would blacklist the token
    // For now, just return success
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: (error as Error).message
    });
  }
});

// Get current user profile (simplified)
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, avatar_url, created_at')
      .eq('id', req.tenant?.id || 'demo-user-id')
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      details: (error as Error).message
    });
  }
});

// Update user profile (simplified)
router.put('/me', [
  authenticate,
  body('first_name').isLength({ min: 2 }).optional(),
  body('last_name').isLength({ min: 2 }).optional(),
  body('avatar_url').isURL().optional(),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { first_name, last_name, avatar_url } = req.body;

    const updateData: any = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (avatar_url) updateData.avatar_url = avatar_url;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.tenant?.id || 'demo-user-id')
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        details: (error as Error).message
      });
    }

    // Remove password from response
    const { password_hash, ...userResponse } = updatedUser;

    res.json({
      success: true,
      data: userResponse,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: (error as Error).message
    });
  }
});

// Change password (simplified)
router.put('/password', [
  authenticate,
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 8 }),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.tenant?.id || 'demo-user-id')
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash || '');
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.tenant?.id || 'demo-user-id');

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password',
        details: updateError.message
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      details: (error as Error).message
    });
  }
});

// Refresh token endpoint (simplified)
router.post('/refresh', [
  body('refreshToken').notEmpty(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // For now, just return a message that refresh is not implemented
    res.json({
      success: false,
      message: 'Token refresh not implemented yet'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Refresh token failed',
      details: (error as Error).message
    });
  }
});

export default router;
