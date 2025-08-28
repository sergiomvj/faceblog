/**
 * SEO Services Index
 * Exporta todos os serviços de SEO para facilitar importação
 */

const seoIntelligence = require('./seo-intelligence');
const trendsApi = require('./trends-api');
const externalLinks = require('./external-links');
const contentDiscovery = require('./content-discovery');
const competitorAnalysis = require('./competitor-analysis');

module.exports = {
  seoIntelligence,
  trendsApi,
  externalLinks,
  contentDiscovery,
  competitorAnalysis
};
