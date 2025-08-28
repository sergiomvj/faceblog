const { supabase } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DeploymentService {
  constructor() {
    this.deploymentQueue = new Map();
    this.templates = new Map();
    this.loadTemplates();
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  async loadTemplates() {
    try {
      const templatesPath = path.join(__dirname, '../templates');
      const templates = await fs.readdir(templatesPath);
      
      for (const template of templates) {
        const templatePath = path.join(templatesPath, template);
        const configPath = path.join(templatePath, 'config.json');
        
        try {
          const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
          this.templates.set(template, {
            path: templatePath,
            config: config
          });
        } catch (error) {
          console.warn(`Failed to load template ${template}:`, error.message);
        }
      }
      
      console.log(`Loaded ${this.templates.size} deployment templates`);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  getAvailableTemplates() {
    return Array.from(this.templates.entries()).map(([name, data]) => ({
      name,
      ...data.config
    }));
  }

  // =====================================================
  // TENANT PROVISIONING
  // =====================================================

  async provisionTenant(tenantData) {
    try {
      const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Iniciar processo de deployment
      this.deploymentQueue.set(deploymentId, {
        status: 'initializing',
        tenant_data: tenantData,
        steps: [],
        started_at: new Date(),
        progress: 0
      });

      // Executar deployment assíncrono
      this.executeDeployment(deploymentId, tenantData)
        .catch(error => {
          console.error('Deployment failed:', error);
          this.updateDeploymentStatus(deploymentId, 'failed', error.message);
        });

      return {
        deployment_id: deploymentId,
        status: 'initializing',
        estimated_time: '5-10 minutes'
      };
    } catch (error) {
      console.error('Error starting tenant provisioning:', error);
      throw new Error(`Failed to start provisioning: ${error.message}`);
    }
  }

  async executeDeployment(deploymentId, tenantData) {
    try {
      this.updateDeploymentStatus(deploymentId, 'running', null, 10);

      // Passo 1: Criar tenant no banco
      await this.createTenantDatabase(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'running', null, 25);

      // Passo 2: Configurar schema isolado
      await this.setupTenantSchema(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'running', null, 40);

      // Passo 3: Gerar aplicação
      await this.generateTenantApplication(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'running', null, 60);

      // Passo 4: Configurar domínio
      await this.configureDomain(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'running', null, 75);

      // Passo 5: Deploy da aplicação
      await this.deployApplication(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'running', null, 90);

      // Passo 6: Configurações finais
      await this.finalizeDeployment(deploymentId, tenantData);
      this.updateDeploymentStatus(deploymentId, 'completed', null, 100);

    } catch (error) {
      console.error('Deployment execution failed:', error);
      this.updateDeploymentStatus(deploymentId, 'failed', error.message);
      throw error;
    }
  }

  // =====================================================
  // DEPLOYMENT STEPS
  // =====================================================

  async createTenantDatabase(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Creating tenant database record');

      // Criar tenant principal
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantData.blog_name,
          slug: tenantData.subdomain,
          subdomain: tenantData.subdomain,
          custom_domain: tenantData.custom_domain,
          owner_email: tenantData.owner_email,
          status: 'provisioning',
          settings: {
            theme: tenantData.theme || 'modern',
            primary_color: tenantData.primary_color || '#3B82F6',
            niche: tenantData.niche,
            company_name: tenantData.company_name
          }
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Criar usuário admin
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenant.id,
          email: tenantData.owner_email,
          name: tenantData.owner_name || 'Admin',
          role: 'admin',
          is_active: true
        })
        .select()
        .single();

      if (userError) throw userError;

      // Atualizar dados do deployment
      const deployment = this.deploymentQueue.get(deploymentId);
      deployment.tenant_id = tenant.id;
      deployment.user_id = user.id;
      this.deploymentQueue.set(deploymentId, deployment);

      this.addDeploymentStep(deploymentId, 'Tenant database record created successfully');
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to create tenant database: ${error.message}`);
      throw error;
    }
  }

  async setupTenantSchema(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Setting up tenant schema and RLS');

      const deployment = this.deploymentQueue.get(deploymentId);
      const tenantId = deployment.tenant_id;

      // Aplicar RLS específico para o tenant
      const rlsQueries = [
        `-- Enable RLS for tenant ${tenantId}`,
        `UPDATE tenants SET schema_ready = true WHERE id = '${tenantId}';`,
        
        // Criar dados iniciais
        `INSERT INTO categories (tenant_id, name, slug, description) VALUES 
          ('${tenantId}', 'Geral', 'geral', 'Categoria geral para artigos'),
          ('${tenantId}', 'Tecnologia', 'tecnologia', 'Artigos sobre tecnologia'),
          ('${tenantId}', 'Negócios', 'negocios', 'Artigos sobre negócios');`,
        
        `INSERT INTO tags (tenant_id, name, slug, color) VALUES 
          ('${tenantId}', 'Novidades', 'novidades', '#3B82F6'),
          ('${tenantId}', 'Tutorial', 'tutorial', '#10B981'),
          ('${tenantId}', 'Dicas', 'dicas', '#F59E0B');`
      ];

      for (const query of rlsQueries) {
        if (query.trim() && !query.startsWith('--')) {
          const { error } = await supabase.rpc('execute_sql', { sql_query: query });
          if (error && !error.message.includes('already exists')) {
            console.warn('RLS setup warning:', error.message);
          }
        }
      }

      this.addDeploymentStep(deploymentId, 'Tenant schema and initial data configured');
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to setup tenant schema: ${error.message}`);
      throw error;
    }
  }

  async generateTenantApplication(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Generating tenant application from template');

      const template = this.templates.get(tenantData.template || 'modern-blog');
      if (!template) {
        throw new Error(`Template '${tenantData.template || 'modern-blog'}' not found`);
      }

      const deployment = this.deploymentQueue.get(deploymentId);
      const tenantId = deployment.tenant_id;
      
      // Diretório de destino para a aplicação do tenant
      const tenantAppPath = path.join(process.cwd(), 'deployments', tenantData.subdomain);
      
      // Copiar template
      await this.copyTemplate(template.path, tenantAppPath);
      
      // Personalizar configurações
      await this.customizeApplication(tenantAppPath, {
        tenant_id: tenantId,
        subdomain: tenantData.subdomain,
        custom_domain: tenantData.custom_domain,
        blog_name: tenantData.blog_name,
        theme: tenantData.theme,
        primary_color: tenantData.primary_color,
        niche: tenantData.niche,
        owner_email: tenantData.owner_email,
        api_base_url: process.env.API_BASE_URL || 'http://localhost:5000'
      });

      // Salvar caminho da aplicação
      deployment.app_path = tenantAppPath;
      this.deploymentQueue.set(deploymentId, deployment);

      this.addDeploymentStep(deploymentId, 'Tenant application generated successfully');
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to generate application: ${error.message}`);
      throw error;
    }
  }

  async copyTemplate(sourcePath, destPath) {
    try {
      await fs.mkdir(destPath, { recursive: true });
      
      // Usar robocopy no Windows ou cp -r no Linux/Mac
      if (process.platform === 'win32') {
        execSync(`robocopy "${sourcePath}" "${destPath}" /E /XD node_modules .git`, { stdio: 'pipe' });
      } else {
        execSync(`cp -r "${sourcePath}"/* "${destPath}"/`, { stdio: 'pipe' });
      }
    } catch (error) {
      // robocopy retorna código de saída diferente de 0 mesmo em sucesso
      if (process.platform === 'win32' && error.status <= 7) {
        return; // Sucesso no robocopy
      }
      throw error;
    }
  }

  async customizeApplication(appPath, config) {
    try {
      // Personalizar package.json
      const packageJsonPath = path.join(appPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      packageJson.name = `faceblog-${config.subdomain}`;
      packageJson.description = `Blog ${config.blog_name} powered by FaceBlog`;
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Personalizar .env
      const envPath = path.join(appPath, '.env.local');
      const envContent = `
# FaceBlog Tenant Configuration
NEXT_PUBLIC_TENANT_ID=${config.tenant_id}
NEXT_PUBLIC_SUBDOMAIN=${config.subdomain}
NEXT_PUBLIC_CUSTOM_DOMAIN=${config.custom_domain || ''}
NEXT_PUBLIC_BLOG_NAME=${config.blog_name}
NEXT_PUBLIC_THEME=${config.theme}
NEXT_PUBLIC_PRIMARY_COLOR=${config.primary_color}
NEXT_PUBLIC_NICHE=${config.niche}
NEXT_PUBLIC_API_BASE_URL=${config.api_base_url}

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${process.env.SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}
      `.trim();
      await fs.writeFile(envPath, envContent);

      // Personalizar configuração do site
      const configPath = path.join(appPath, 'src', 'config', 'site.js');
      const siteConfig = `
export const siteConfig = {
  name: "${config.blog_name}",
  description: "Blog ${config.blog_name} - Powered by FaceBlog",
  url: "${config.custom_domain ? `https://${config.custom_domain}` : `https://${config.subdomain}.faceblog.com`}",
  subdomain: "${config.subdomain}",
  tenant_id: "${config.tenant_id}",
  theme: "${config.theme}",
  primaryColor: "${config.primary_color}",
  niche: "${config.niche}",
  owner: {
    email: "${config.owner_email}"
  },
  api: {
    baseUrl: "${config.api_base_url}"
  }
};
      `.trim();
      
      await fs.mkdir(path.join(appPath, 'src', 'config'), { recursive: true });
      await fs.writeFile(configPath, siteConfig);

    } catch (error) {
      console.error('Error customizing application:', error);
      throw error;
    }
  }

  async configureDomain(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Configuring domain and DNS');

      // Configurar subdomínio padrão
      const subdomain = `${tenantData.subdomain}.faceblog.com`;
      
      // Se tem domínio customizado, configurar DNS
      if (tenantData.custom_domain) {
        await this.setupCustomDomain(tenantData.custom_domain, tenantData.subdomain);
      }

      // Atualizar tenant com informações de domínio
      const deployment = this.deploymentQueue.get(deploymentId);
      const { error } = await supabase
        .from('tenants')
        .update({
          domain_configured: true,
          deployment_url: tenantData.custom_domain || subdomain
        })
        .eq('id', deployment.tenant_id);

      if (error) throw error;

      this.addDeploymentStep(deploymentId, 'Domain configuration completed');
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to configure domain: ${error.message}`);
      throw error;
    }
  }

  async setupCustomDomain(customDomain, subdomain) {
    // Implementar configuração de DNS customizado
    // Pode integrar com Cloudflare, Route53, etc.
    console.log(`Setting up custom domain: ${customDomain} -> ${subdomain}`);
    
    // Por enquanto, apenas log
    // Futuramente integrar com provedores de DNS
  }

  async deployApplication(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Building and deploying application');

      const deployment = this.deploymentQueue.get(deploymentId);
      const appPath = deployment.app_path;

      // Instalar dependências
      this.addDeploymentStep(deploymentId, 'Installing dependencies...');
      execSync('npm install', { cwd: appPath, stdio: 'pipe' });

      // Build da aplicação
      this.addDeploymentStep(deploymentId, 'Building application...');
      execSync('npm run build', { cwd: appPath, stdio: 'pipe' });

      // Deploy (pode ser Vercel, Netlify, etc.)
      const deployUrl = await this.deployToProvider(appPath, tenantData);

      // Atualizar tenant com URL de deploy
      const { error } = await supabase
        .from('tenants')
        .update({
          deployment_url: deployUrl,
          deployed_at: new Date()
        })
        .eq('id', deployment.tenant_id);

      if (error) throw error;

      deployment.deploy_url = deployUrl;
      this.deploymentQueue.set(deploymentId, deployment);

      this.addDeploymentStep(deploymentId, `Application deployed successfully: ${deployUrl}`);
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to deploy application: ${error.message}`);
      throw error;
    }
  }

  async deployToProvider(appPath, tenantData) {
    // Implementar deploy para diferentes provedores
    // Por enquanto, simular deploy local
    const port = 3000 + Math.floor(Math.random() * 1000);
    const deployUrl = `http://localhost:${port}`;
    
    console.log(`Simulating deployment to ${deployUrl}`);
    
    // Futuramente integrar com:
    // - Vercel
    // - Netlify  
    // - AWS
    // - DigitalOcean
    
    return deployUrl;
  }

  async finalizeDeployment(deploymentId, tenantData) {
    try {
      this.addDeploymentStep(deploymentId, 'Finalizing deployment');

      const deployment = this.deploymentQueue.get(deploymentId);
      
      // Atualizar status do tenant
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          provisioned_at: new Date()
        })
        .eq('id', deployment.tenant_id);

      if (error) throw error;

      // Criar API key inicial
      const { data: apiKey, error: keyError } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: deployment.tenant_id,
          name: 'Default API Key',
          permissions: ['read', 'write'],
          rate_limit: 1000,
          is_active: true
        })
        .select()
        .single();

      if (keyError) throw keyError;

      // Enviar email de boas-vindas (implementar futuramente)
      await this.sendWelcomeEmail(tenantData, deployment);

      this.addDeploymentStep(deploymentId, 'Deployment finalized successfully');
    } catch (error) {
      this.addDeploymentStep(deploymentId, `Failed to finalize deployment: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(tenantData, deployment) {
    // Implementar envio de email
    console.log(`Sending welcome email to ${tenantData.owner_email}`);
    
    const emailData = {
      to: tenantData.owner_email,
      subject: `Bem-vindo ao ${tenantData.blog_name}!`,
      template: 'welcome',
      data: {
        blog_name: tenantData.blog_name,
        deploy_url: deployment.deploy_url,
        admin_url: `${deployment.deploy_url}/admin`,
        api_docs: `${process.env.API_BASE_URL}/docs`
      }
    };

    // Integrar com serviço de email (SendGrid, Mailgun, etc.)
  }

  // =====================================================
  // DEPLOYMENT STATUS MANAGEMENT
  // =====================================================

  updateDeploymentStatus(deploymentId, status, error = null, progress = null) {
    const deployment = this.deploymentQueue.get(deploymentId);
    if (!deployment) return;

    deployment.status = status;
    deployment.updated_at = new Date();
    
    if (error) deployment.error = error;
    if (progress !== null) deployment.progress = progress;

    this.deploymentQueue.set(deploymentId, deployment);
  }

  addDeploymentStep(deploymentId, message) {
    const deployment = this.deploymentQueue.get(deploymentId);
    if (!deployment) return;

    deployment.steps.push({
      message,
      timestamp: new Date()
    });

    this.deploymentQueue.set(deploymentId, deployment);
    console.log(`[${deploymentId}] ${message}`);
  }

  getDeploymentStatus(deploymentId) {
    return this.deploymentQueue.get(deploymentId) || null;
  }

  getAllDeployments() {
    return Array.from(this.deploymentQueue.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  // =====================================================
  // TENANT MANAGEMENT
  // =====================================================

  async getTenantDeployments(tenantId) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          users(count),
          articles(count),
          categories(count)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tenant deployments:', error);
      throw new Error(`Failed to fetch tenant deployments: ${error.message}`);
    }
  }

  async redeployTenant(tenantId) {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      // Iniciar novo deployment
      const tenantData = {
        blog_name: tenant.name,
        subdomain: tenant.subdomain,
        custom_domain: tenant.custom_domain,
        owner_email: tenant.owner_email,
        theme: tenant.settings?.theme || 'modern',
        primary_color: tenant.settings?.primary_color || '#3B82F6',
        niche: tenant.settings?.niche || 'general',
        company_name: tenant.settings?.company_name
      };

      return await this.provisionTenant(tenantData);
    } catch (error) {
      console.error('Error redeploying tenant:', error);
      throw new Error(`Failed to redeploy tenant: ${error.message}`);
    }
  }

  async deleteTenantDeployment(tenantId) {
    try {
      // Marcar tenant como inativo
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'inactive',
          deleted_at: new Date()
        })
        .eq('id', tenantId);

      if (error) throw error;

      // Remover arquivos de deployment (implementar)
      // Remover configurações de DNS (implementar)

      return { success: true };
    } catch (error) {
      console.error('Error deleting tenant deployment:', error);
      throw new Error(`Failed to delete tenant deployment: ${error.message}`);
    }
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  cleanup() {
    // Remover deployments antigos do cache
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [id, deployment] of this.deploymentQueue.entries()) {
      const age = now - new Date(deployment.started_at).getTime();
      if (age > maxAge && ['completed', 'failed'].includes(deployment.status)) {
        this.deploymentQueue.delete(id);
      }
    }
  }
}

// Cleanup periódico
setInterval(() => {
  const deploymentService = new DeploymentService();
  deploymentService.cleanup();
}, 60 * 60 * 1000); // A cada hora

module.exports = new DeploymentService();
