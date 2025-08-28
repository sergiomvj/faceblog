import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from '@/utils/logger';
import { tenantMiddleware } from '@/middleware/tenant';
import { errorHandler } from '@/middleware/errorHandler';

// Import routes
import authRoutes from '@/routes/auth';
import articleRoutes from '@/routes/articles';
import tenantRoutes from '@/routes/tenants';
import bigwriterRoutes from '@/routes/bigwriter';
// TODO: Import other routes when they are created
// import categoryRoutes from '@/routes/categories';
// import tagRoutes from '@/routes/tags';
// import commentRoutes from '@/routes/comments';
// import userRoutes from '@/routes/users';
// import mediaRoutes from '@/routes/media';
// import analyticsRoutes from '@/routes/analytics';
// import webhookRoutes from '@/routes/webhooks';
// import systemRoutes from '@/routes/system';

// Load environment variables
dotenv.config();

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Allow any subdomain of blogservice.com
        if (origin.endsWith('.blogservice.com')) {
          return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Tenant-ID',
      ],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.http(message.trim());
        },
      },
    }));

    // Health check endpoint (before tenant middleware)
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Blog Service API is healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // Tenant identification middleware
    this.app.use(tenantMiddleware);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tenant: (req as any).tenant?.subdomain,
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/articles', articleRoutes);
    this.app.use('/api/tenants', tenantRoutes);
    this.app.use('/api/bigwriter', bigwriterRoutes);
    
    // TODO: Add other routes when they are implemented
    // this.app.use('/api/categories', categoryRoutes);
    // this.app.use('/api/tags', tagRoutes);
    // this.app.use('/api/comments', commentRoutes);
    // this.app.use('/api/users', userRoutes);
    // this.app.use('/api/media', mediaRoutes);
    // this.app.use('/api/analytics', analyticsRoutes);
    // this.app.use('/api/webhooks', webhookRoutes);
    // this.app.use('/api/system', systemRoutes);

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'Blog-as-a-Service API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          articles: '/api/articles',
          categories: '/api/categories',
          tags: '/api/tags',
          comments: '/api/comments',
          users: '/api/users',
          tenants: '/api/tenants',
          media: '/api/media',
          analytics: '/api/analytics',
          bigwriter: '/api/bigwriter',
          webhooks: '/api/webhooks',
          system: '/api/system',
        },
      });
    });

    // Serve static files
    this.app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Welcome to Blog-as-a-Service API',
        version: '1.0.0',
        api: '/api',
        health: '/health',
      });
    });
  }

  private initializeErrorHandling(): void {
    // Error handling middleware (must be last)
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // TODO: Initialize Redis connection when implemented
      // await redisConfig.connect();
      // logger.info('Redis connected successfully');

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`🚀 Blog Service API running on port ${this.port}`);
        logger.info(`📖 API Documentation: http://localhost:${this.port}/api`);
        logger.info(`💚 Health Check: http://localhost:${this.port}/health`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, closing server gracefully...');
    
    try {
      // TODO: Close Redis connection when implemented
      // await redisConfig.disconnect();
      // logger.info('Redis disconnected');

      // Close database connections would go here
      
      logger.info('Server closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

export default Server;
