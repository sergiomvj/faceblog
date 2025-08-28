const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const xss = require('xss');

/**
 * Security Middleware
 * Implementa headers de segurança avançados e sanitização de input
 */

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limits por tipo de endpoint
const rateLimits = {
  // Limite geral - 1000 requests por 15 minutos
  general: createRateLimit(15 * 60 * 1000, 1000, 'Too many requests, please try again later'),
  
  // Limite para login - 5 tentativas por 15 minutos
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later'),
  
  // Limite para SEO - 100 requests por hora (APIs externas são caras)
  seo: createRateLimit(60 * 60 * 1000, 100, 'SEO API rate limit exceeded'),
  
  // Limite para criação de conteúdo - 50 por hora
  create: createRateLimit(60 * 60 * 1000, 50, 'Content creation rate limit exceeded')
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.supabase.co", "wss://realtime.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Input sanitization functions
const sanitizeInput = {
  /**
   * Sanitiza string removendo XSS e caracteres perigosos
   */
  string: (input, maxLength = 1000) => {
    if (typeof input !== 'string') return '';
    
    // Remove XSS
    let sanitized = xss(input, {
      whiteList: {}, // Remove todas as tags HTML
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Limita tamanho
    sanitized = sanitized.substring(0, maxLength);
    
    // Remove caracteres de controle
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return sanitized.trim();
  },

  /**
   * Sanitiza email
   */
  email: (input) => {
    if (typeof input !== 'string') return '';
    const email = input.toLowerCase().trim();
    return validator.isEmail(email) ? email : '';
  },

  /**
   * Sanitiza URL
   */
  url: (input) => {
    if (typeof input !== 'string') return '';
    const url = input.trim();
    return validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true 
    }) ? url : '';
  },

  /**
   * Sanitiza número inteiro
   */
  integer: (input, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const num = parseInt(input);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  },

  /**
   * Sanitiza slug (URL-friendly)
   */
  slug: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  },

  /**
   * Sanitiza HTML content (permite tags seguras)
   */
  html: (input) => {
    if (typeof input !== 'string') return '';
    
    return xss(input, {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        b: [],
        em: [],
        i: [],
        u: [],
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
        ul: [],
        ol: [],
        li: [],
        a: ['href', 'title'],
        blockquote: [],
        code: [],
        pre: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }
};

// Middleware para sanitização automática de body
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(req.body)) {
      switch (key) {
        case 'email':
          sanitized[key] = sanitizeInput.email(value);
          break;
        case 'url':
        case 'website':
          sanitized[key] = sanitizeInput.url(value);
          break;
        case 'slug':
          sanitized[key] = sanitizeInput.slug(value);
          break;
        case 'content':
        case 'description':
        case 'bio':
          sanitized[key] = sanitizeInput.html(value);
          break;
        case 'title':
        case 'name':
        case 'first_name':
        case 'last_name':
          sanitized[key] = sanitizeInput.string(value, 200);
          break;
        case 'id':
        case 'user_id':
        case 'tenant_id':
        case 'category_id':
          sanitized[key] = sanitizeInput.integer(value, 1);
          break;
        default:
          if (typeof value === 'string') {
            sanitized[key] = sanitizeInput.string(value);
          } else {
            sanitized[key] = value;
          }
      }
    }
    
    req.body = sanitized;
  }
  
  next();
};

// Middleware para validação de API Key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key required'
    });
  }
  
  // Validar formato da API Key
  if (!/^fb_[a-f0-9]{64}$/.test(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API Key format'
    });
  }
  
  next();
};

// Middleware para logging de segurança
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`🔒 Security Log: ${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')?.substring(0, 100)}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    if (statusCode >= 400) {
      console.log(`🚨 Security Alert: ${req.method} ${req.originalUrl} - Status: ${statusCode} - Duration: ${duration}ms - IP: ${req.ip}`);
    }
  });
  
  next();
};

// Middleware para detectar ataques comuns
const attackDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const url = req.originalUrl.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  
  // Detectar SQL Injection
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b)|(\binsert\b.*\binto\b)|(\bdelete\b.*\bfrom\b)|(\bdrop\b.*\btable\b)/i,
    /(\bor\b.*=.*)|(\band\b.*=.*)|('.*or.*'.*=.*')/i
  ];
  
  // Detectar XSS
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i
  ];
  
  // Detectar Path Traversal
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i
  ];
  
  const suspiciousPatterns = [...sqlPatterns, ...xssPatterns, ...pathTraversalPatterns];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(userAgent)) {
      console.log(`🚨 ATTACK DETECTED: ${pattern} - IP: ${req.ip} - URL: ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        error: 'Suspicious activity detected'
      });
    }
  }
  
  next();
};

module.exports = {
  rateLimits,
  securityHeaders,
  sanitizeInput,
  sanitizeBody,
  validateApiKey,
  securityLogger,
  attackDetection
};
