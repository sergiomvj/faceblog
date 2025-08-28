const NodeCache = require('node-cache');

/**
 * Cache Service
 * Sistema de cache em memória para otimização de performance
 */
class CacheService {
  constructor() {
    // Cache principal com TTL de 1 hora
    this.cache = new NodeCache({ 
      stdTTL: 3600, // 1 hora
      checkperiod: 600, // Verificar expiração a cada 10 minutos
      useClones: false
    });

    // Cache de SEO com TTL de 24 horas
    this.seoCache = new NodeCache({ 
      stdTTL: 86400, // 24 horas
      checkperiod: 3600, // Verificar a cada 1 hora
      useClones: false
    });

    // Cache de queries com TTL de 30 minutos
    this.queryCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutos
      checkperiod: 300, // Verificar a cada 5 minutos
      useClones: false
    });

    // Estatísticas de cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    console.log('🚀 Cache Service initialized');
  }

  /**
   * Get from main cache
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set to main cache
   */
  set(key, value, ttl = null) {
    this.stats.sets++;
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Get from SEO cache
   */
  getSEO(key) {
    const value = this.seoCache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set to SEO cache
   */
  setSEO(key, value, ttl = null) {
    this.stats.sets++;
    if (ttl) {
      return this.seoCache.set(key, value, ttl);
    }
    return this.seoCache.set(key, value);
  }

  /**
   * Get from query cache
   */
  getQuery(key) {
    const value = this.queryCache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set to query cache
   */
  setQuery(key, value, ttl = null) {
    this.stats.sets++;
    if (ttl) {
      return this.queryCache.set(key, value, ttl);
    }
    return this.queryCache.set(key, value);
  }

  /**
   * Delete from all caches
   */
  delete(key) {
    this.cache.del(key);
    this.seoCache.del(key);
    this.queryCache.del(key);
  }

  /**
   * Clear specific cache
   */
  clear(cacheType = 'all') {
    switch (cacheType) {
      case 'main':
        this.cache.flushAll();
        break;
      case 'seo':
        this.seoCache.flushAll();
        break;
      case 'query':
        this.queryCache.flushAll();
        break;
      case 'all':
      default:
        this.cache.flushAll();
        this.seoCache.flushAll();
        this.queryCache.flushAll();
        break;
    }
    console.log(`🧹 Cache cleared: ${cacheType}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      mainCache: {
        keys: this.cache.keys().length,
        stats: this.cache.getStats()
      },
      seoCache: {
        keys: this.seoCache.keys().length,
        stats: this.seoCache.getStats()
      },
      queryCache: {
        keys: this.queryCache.keys().length,
        stats: this.queryCache.getStats()
      }
    };
  }

  /**
   * Generate cache key for articles
   */
  generateArticleKey(tenantId, filters = {}) {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `articles:${tenantId}:${filterStr}`;
  }

  /**
   * Generate cache key for SEO analysis
   */
  generateSEOKey(title, content) {
    const hash = require('crypto')
      .createHash('md5')
      .update(`${title}:${content}`)
      .digest('hex');
    return `seo:${hash}`;
  }

  /**
   * Generate cache key for trends
   */
  generateTrendsKey(topic, niche, geo) {
    return `trends:${topic}:${niche}:${geo}`;
  }

  /**
   * Cache middleware for Express
   */
  middleware(cacheType = 'main', ttl = null) {
    return (req, res, next) => {
      const key = `${req.method}:${req.originalUrl}`;
      
      let cachedData;
      switch (cacheType) {
        case 'seo':
          cachedData = this.getSEO(key);
          break;
        case 'query':
          cachedData = this.getQuery(key);
          break;
        default:
          cachedData = this.get(key);
          break;
      }

      if (cachedData) {
        return res.json(cachedData);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = (data) => {
        switch (cacheType) {
          case 'seo':
            this.setSEO(key, data, ttl);
            break;
          case 'query':
            this.setQuery(key, data, ttl);
            break;
          default:
            this.set(key, data, ttl);
            break;
        }
        return originalJson.call(res, data);
      };

      next();
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(supabase) {
    try {
      console.log('🔥 Warming up cache...');

      // Cache popular articles
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(50);

      if (articles) {
        articles.forEach(article => {
          const key = `article:${article.id}`;
          this.set(key, article, 7200); // 2 horas
        });
      }

      // Cache categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*');

      if (categories) {
        this.set('categories:all', categories, 3600); // 1 hora
      }

      // Cache tags
      const { data: tags } = await supabase
        .from('tags')
        .select('*');

      if (tags) {
        this.set('tags:all', tags, 3600); // 1 hora
      }

      console.log('✅ Cache warmed up successfully');
    } catch (error) {
      console.error('❌ Error warming up cache:', error);
    }
  }

  /**
   * Invalidate cache for specific patterns
   */
  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      this.delete(key);
    });

    console.log(`🗑️ Invalidated ${matchingKeys.length} cache entries for pattern: ${pattern}`);
  }

  /**
   * Schedule cache cleanup
   */
  scheduleCleanup() {
    // Limpeza a cada 6 horas
    setInterval(() => {
      const stats = this.getStats();
      console.log('🧹 Scheduled cache cleanup', stats);
      
      // Se o hit rate estiver muito baixo, limpar cache
      if (parseFloat(stats.hitRate) < 30) {
        this.clear('main');
        console.log('🗑️ Cache cleared due to low hit rate');
      }
    }, 6 * 60 * 60 * 1000); // 6 horas
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
