const axios = require('axios');
const { supabase } = require('../config/database');

class IntegrationsService {
  constructor() {
    this.providers = {
      // Deploy Providers
      vercel: {
        name: 'Vercel',
        type: 'deployment',
        api_url: 'https://api.vercel.com',
        enabled: !!process.env.VERCEL_TOKEN
      },
      netlify: {
        name: 'Netlify',
        type: 'deployment', 
        api_url: 'https://api.netlify.com/api/v1',
        enabled: !!process.env.NETLIFY_TOKEN
      },
      
      // DNS Providers
      cloudflare: {
        name: 'Cloudflare',
        type: 'dns',
        api_url: 'https://api.cloudflare.com/client/v4',
        enabled: !!(process.env.CLOUDFLARE_TOKEN && process.env.CLOUDFLARE_ZONE_ID)
      },
      
      // Email Providers
      sendgrid: {
        name: 'SendGrid',
        type: 'email',
        api_url: 'https://api.sendgrid.com/v3',
        enabled: !!process.env.SENDGRID_API_KEY
      },
      mailgun: {
        name: 'Mailgun',
        type: 'email',
        api_url: 'https://api.mailgun.net/v3',
        enabled: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
      },
      
      // Analytics Providers
      google_analytics: {
        name: 'Google Analytics',
        type: 'analytics',
        enabled: !!process.env.GA_MEASUREMENT_ID
      },
      plausible: {
        name: 'Plausible',
        type: 'analytics',
        api_url: 'https://plausible.io/api/v1',
        enabled: !!process.env.PLAUSIBLE_API_KEY
      },
      
      // Storage Providers
      aws_s3: {
        name: 'AWS S3',
        type: 'storage',
        enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      },
      cloudinary: {
        name: 'Cloudinary',
        type: 'storage',
        api_url: 'https://api.cloudinary.com/v1_1',
        enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
      }
    };
  }

  // =====================================================
  // DEPLOYMENT INTEGRATIONS
  // =====================================================

  async deployToVercel(appPath, tenantData) {
    try {
      if (!this.providers.vercel.enabled) {
        throw new Error('Vercel integration not configured');
      }

      const projectName = `faceblog-${tenantData.subdomain}`;
      
      // Criar projeto no Vercel
      const createResponse = await axios.post(
        `${this.providers.vercel.api_url}/v10/projects`,
        {
          name: projectName,
          framework: 'nextjs',
          environmentVariables: [
            { key: 'NEXT_PUBLIC_TENANT_ID', value: tenantData.tenant_id },
            { key: 'NEXT_PUBLIC_SUBDOMAIN', value: tenantData.subdomain },
            { key: 'NEXT_PUBLIC_BLOG_NAME', value: tenantData.blog_name },
            { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.SUPABASE_URL },
            { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const project = createResponse.data;

      // Fazer deploy
      const deployResponse = await axios.post(
        `${this.providers.vercel.api_url}/v13/deployments`,
        {
          name: projectName,
          project: project.id,
          target: 'production',
          gitSource: {
            type: 'github',
            repo: `faceblog-tenants/${tenantData.subdomain}`,
            ref: 'main'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const deployment = deployResponse.data;

      return {
        provider: 'vercel',
        project_id: project.id,
        deployment_id: deployment.id,
        url: deployment.url,
        status: deployment.readyState
      };
    } catch (error) {
      console.error('Vercel deployment failed:', error.response?.data || error.message);
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  async deployToNetlify(appPath, tenantData) {
    try {
      if (!this.providers.netlify.enabled) {
        throw new Error('Netlify integration not configured');
      }

      const siteName = `faceblog-${tenantData.subdomain}`;

      // Criar site no Netlify
      const createResponse = await axios.post(
        `${this.providers.netlify.api_url}/sites`,
        {
          name: siteName,
          build_settings: {
            cmd: 'npm run build',
            dir: '.next',
            env: {
              NEXT_PUBLIC_TENANT_ID: tenantData.tenant_id,
              NEXT_PUBLIC_SUBDOMAIN: tenantData.subdomain,
              NEXT_PUBLIC_BLOG_NAME: tenantData.blog_name,
              NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
              NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NETLIFY_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const site = createResponse.data;

      return {
        provider: 'netlify',
        site_id: site.id,
        url: site.url,
        admin_url: site.admin_url,
        status: site.state
      };
    } catch (error) {
      console.error('Netlify deployment failed:', error.response?.data || error.message);
      throw new Error(`Netlify deployment failed: ${error.message}`);
    }
  }

  // =====================================================
  // DNS INTEGRATIONS
  // =====================================================

  async setupCloudflareRecord(domain, subdomain, targetUrl) {
    try {
      if (!this.providers.cloudflare.enabled) {
        throw new Error('Cloudflare integration not configured');
      }

      const recordName = subdomain ? `${subdomain}.${domain}` : domain;
      const recordType = 'CNAME';
      const recordContent = new URL(targetUrl).hostname;

      const response = await axios.post(
        `${this.providers.cloudflare.api_url}/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          type: recordType,
          name: recordName,
          content: recordContent,
          ttl: 1, // Auto
          proxied: true
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        provider: 'cloudflare',
        record_id: response.data.result.id,
        name: recordName,
        type: recordType,
        content: recordContent,
        proxied: response.data.result.proxied
      };
    } catch (error) {
      console.error('Cloudflare DNS setup failed:', error.response?.data || error.message);
      throw new Error(`Cloudflare DNS setup failed: ${error.message}`);
    }
  }

  async verifyDomainSSL(domain) {
    try {
      if (!this.providers.cloudflare.enabled) {
        return { verified: false, reason: 'Cloudflare not configured' };
      }

      // Verificar status SSL do domínio
      const response = await axios.get(
        `${this.providers.cloudflare.api_url}/zones/${process.env.CLOUDFLARE_ZONE_ID}/ssl/verification`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}`
          }
        }
      );

      const sslStatus = response.data.result.find(ssl => ssl.hostname === domain);
      
      return {
        verified: sslStatus?.status === 'active',
        status: sslStatus?.status || 'unknown',
        certificate_status: sslStatus?.certificate_status
      };
    } catch (error) {
      console.error('SSL verification failed:', error.response?.data || error.message);
      return { verified: false, reason: error.message };
    }
  }

  // =====================================================
  // EMAIL INTEGRATIONS
  // =====================================================

  async sendWelcomeEmail(tenantData, deploymentData) {
    try {
      const emailProvider = this.getPreferredEmailProvider();
      
      if (!emailProvider) {
        console.warn('No email provider configured, skipping welcome email');
        return { sent: false, reason: 'No email provider configured' };
      }

      const emailData = {
        to: tenantData.owner_email,
        subject: `🎉 Seu blog ${tenantData.blog_name} está no ar!`,
        template: 'welcome',
        data: {
          blog_name: tenantData.blog_name,
          blog_url: deploymentData.url,
          admin_url: `${deploymentData.url}/admin`,
          subdomain: tenantData.subdomain,
          custom_domain: tenantData.custom_domain,
          owner_name: tenantData.owner_name || 'Admin',
          support_email: process.env.SUPPORT_EMAIL || 'suporte@faceblog.com'
        }
      };

      if (emailProvider === 'sendgrid') {
        return await this.sendEmailViaSendGrid(emailData);
      } else if (emailProvider === 'mailgun') {
        return await this.sendEmailViaMailgun(emailData);
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { sent: false, reason: error.message };
    }
  }

  async sendEmailViaSendGrid(emailData) {
    try {
      const response = await axios.post(
        `${this.providers.sendgrid.api_url}/mail/send`,
        {
          personalizations: [{
            to: [{ email: emailData.to }],
            dynamic_template_data: emailData.data
          }],
          from: {
            email: process.env.FROM_EMAIL || 'noreply@faceblog.com',
            name: 'FaceBlog'
          },
          template_id: process.env.SENDGRID_WELCOME_TEMPLATE_ID,
          subject: emailData.subject
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { sent: true, provider: 'sendgrid', message_id: response.headers['x-message-id'] };
    } catch (error) {
      console.error('SendGrid email failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendEmailViaMailgun(emailData) {
    try {
      const formData = new URLSearchParams();
      formData.append('from', `FaceBlog <noreply@${process.env.MAILGUN_DOMAIN}>`);
      formData.append('to', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('template', 'welcome');
      
      Object.entries(emailData.data).forEach(([key, value]) => {
        formData.append(`v:${key}`, value);
      });

      const response = await axios.post(
        `${this.providers.mailgun.api_url}/${process.env.MAILGUN_DOMAIN}/messages`,
        formData,
        {
          auth: {
            username: 'api',
            password: process.env.MAILGUN_API_KEY
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return { sent: true, provider: 'mailgun', message_id: response.data.id };
    } catch (error) {
      console.error('Mailgun email failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // =====================================================
  // ANALYTICS INTEGRATIONS
  // =====================================================

  async setupGoogleAnalytics(tenantData) {
    try {
      if (!this.providers.google_analytics.enabled) {
        return { configured: false, reason: 'Google Analytics not configured' };
      }

      // Criar propriedade GA4 para o tenant
      const propertyName = `FaceBlog - ${tenantData.blog_name}`;
      
      // Nota: Implementação completa requer Google Analytics Admin API
      // Por enquanto, retornar configuração manual
      
      return {
        configured: true,
        provider: 'google_analytics',
        measurement_id: process.env.GA_MEASUREMENT_ID,
        instructions: 'Add the measurement ID to your blog configuration'
      };
    } catch (error) {
      console.error('Google Analytics setup failed:', error);
      return { configured: false, reason: error.message };
    }
  }

  async setupPlausibleAnalytics(tenantData) {
    try {
      if (!this.providers.plausible.enabled) {
        return { configured: false, reason: 'Plausible not configured' };
      }

      const domain = tenantData.custom_domain || `${tenantData.subdomain}.faceblog.com`;

      const response = await axios.post(
        `${this.providers.plausible.api_url}/sites`,
        {
          domain: domain,
          timezone: 'America/Sao_Paulo'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        configured: true,
        provider: 'plausible',
        domain: domain,
        site_id: response.data.domain
      };
    } catch (error) {
      console.error('Plausible setup failed:', error.response?.data || error.message);
      return { configured: false, reason: error.message };
    }
  }

  // =====================================================
  // STORAGE INTEGRATIONS
  // =====================================================

  async setupCloudinaryStorage(tenantData) {
    try {
      if (!this.providers.cloudinary.enabled) {
        return { configured: false, reason: 'Cloudinary not configured' };
      }

      const folderName = `faceblog/${tenantData.subdomain}`;

      // Criar pasta no Cloudinary
      const response = await axios.post(
        `${this.providers.cloudinary.api_url}/${process.env.CLOUDINARY_CLOUD_NAME}/folders/${folderName}`,
        {},
        {
          auth: {
            username: process.env.CLOUDINARY_API_KEY,
            password: process.env.CLOUDINARY_API_SECRET
          }
        }
      );

      return {
        configured: true,
        provider: 'cloudinary',
        folder: folderName,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME
      };
    } catch (error) {
      console.error('Cloudinary setup failed:', error.response?.data || error.message);
      return { configured: false, reason: error.message };
    }
  }

  // =====================================================
  // INTEGRATION MANAGEMENT
  // =====================================================

  async setupTenantIntegrations(tenantId, tenantData) {
    try {
      const integrations = {
        deployment: null,
        dns: null,
        email: null,
        analytics: [],
        storage: null
      };

      // Setup deployment
      const deploymentProvider = this.getPreferredDeploymentProvider();
      if (deploymentProvider === 'vercel') {
        integrations.deployment = await this.deployToVercel(null, tenantData);
      } else if (deploymentProvider === 'netlify') {
        integrations.deployment = await this.deployToNetlify(null, tenantData);
      }

      // Setup DNS se tiver domínio customizado
      if (tenantData.custom_domain && this.providers.cloudflare.enabled) {
        integrations.dns = await this.setupCloudflareRecord(
          tenantData.custom_domain,
          null,
          integrations.deployment?.url
        );
      }

      // Setup email
      integrations.email = await this.sendWelcomeEmail(tenantData, integrations.deployment);

      // Setup analytics
      if (this.providers.google_analytics.enabled) {
        integrations.analytics.push(await this.setupGoogleAnalytics(tenantData));
      }
      if (this.providers.plausible.enabled) {
        integrations.analytics.push(await this.setupPlausibleAnalytics(tenantData));
      }

      // Setup storage
      if (this.providers.cloudinary.enabled) {
        integrations.storage = await this.setupCloudinaryStorage(tenantData);
      }

      // Salvar configurações no banco
      const { error } = await supabase
        .from('tenants')
        .update({
          integrations: integrations,
          integrations_configured_at: new Date()
        })
        .eq('id', tenantId);

      if (error) throw error;

      return integrations;
    } catch (error) {
      console.error('Failed to setup tenant integrations:', error);
      throw new Error(`Failed to setup integrations: ${error.message}`);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  getAvailableProviders() {
    return Object.entries(this.providers).map(([key, provider]) => ({
      key,
      ...provider
    }));
  }

  getEnabledProviders(type = null) {
    return Object.entries(this.providers)
      .filter(([key, provider]) => provider.enabled && (!type || provider.type === type))
      .map(([key, provider]) => ({ key, ...provider }));
  }

  getPreferredDeploymentProvider() {
    if (this.providers.vercel.enabled) return 'vercel';
    if (this.providers.netlify.enabled) return 'netlify';
    return null;
  }

  getPreferredEmailProvider() {
    if (this.providers.sendgrid.enabled) return 'sendgrid';
    if (this.providers.mailgun.enabled) return 'mailgun';
    return null;
  }

  async testIntegration(provider, config = {}) {
    try {
      switch (provider) {
        case 'vercel':
          const vercelResponse = await axios.get(
            `${this.providers.vercel.api_url}/v9/user`,
            {
              headers: { 'Authorization': `Bearer ${process.env.VERCEL_TOKEN}` }
            }
          );
          return { success: true, data: vercelResponse.data };

        case 'netlify':
          const netlifyResponse = await axios.get(
            `${this.providers.netlify.api_url}/user`,
            {
              headers: { 'Authorization': `Bearer ${process.env.NETLIFY_TOKEN}` }
            }
          );
          return { success: true, data: netlifyResponse.data };

        case 'cloudflare':
          const cfResponse = await axios.get(
            `${this.providers.cloudflare.api_url}/user/tokens/verify`,
            {
              headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}` }
            }
          );
          return { success: true, data: cfResponse.data };

        case 'sendgrid':
          const sgResponse = await axios.get(
            `${this.providers.sendgrid.api_url}/user/profile`,
            {
              headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}` }
            }
          );
          return { success: true, data: sgResponse.data };

        default:
          return { success: false, error: 'Provider not supported for testing' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async getIntegrationHealth() {
    const health = {
      overall_status: 'healthy',
      providers: {},
      last_check: new Date()
    };

    for (const [key, provider] of Object.entries(this.providers)) {
      if (provider.enabled) {
        const test = await this.testIntegration(key);
        health.providers[key] = {
          name: provider.name,
          type: provider.type,
          status: test.success ? 'healthy' : 'unhealthy',
          error: test.error || null
        };

        if (!test.success) {
          health.overall_status = 'degraded';
        }
      } else {
        health.providers[key] = {
          name: provider.name,
          type: provider.type,
          status: 'disabled'
        };
      }
    }

    return health;
  }
}

module.exports = new IntegrationsService();
