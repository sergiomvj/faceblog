#!/usr/bin/env node

/**
 * Simple backend startup script for Blog-as-a-Service
 * This script starts the Express server with basic configuration
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes (only the ones we have implemented)
import authRoutes from '../routes/auth';
import articleRoutes from '../routes/articles';
import tenantRoutes from '../routes/tenants';
import bigwriterRoutes from '../routes/bigwriter';

// Import middleware
import { tenantMiddleware } from '../middleware/tenant';
import { errorHandler } from '../middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Blog-as-a-Service Backend',
    version: '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/bigwriter', bigwriterRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blog-as-a-Service Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
