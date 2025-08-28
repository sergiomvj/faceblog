import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { knex } from '@/config/database';
import { logger } from '@/utils/logger';
import { BigWriterRequest, BigWriterResponse } from '@/types';

export class BigWriterService {
  private client: AxiosInstance;
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.BIGWRITER_API_KEY || '';
    this.webhookSecret = process.env.BIGWRITER_WEBHOOK_SECRET || '';
    
    this.client = axios.create({
      baseURL: process.env.BIGWRITER_API_URL || 'https://api.bigwriter.com',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FaceBlog-BaaS/1.0.0',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('BigWriter API Request:', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('BigWriter API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('BigWriter API Response:', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('BigWriter API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate content using BigWriter AI
   */
  async generateContent(jobId: string, request: BigWriterRequest): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing');

      // For demo purposes, we'll simulate the BigWriter API
      // In a real implementation, this would call the actual BigWriter API
      const result = await this.simulateBigWriterAPI(request);

      // Update job with results
      await this.updateJobWithResults(jobId, result);

      logger.info(`BigWriter content generation completed for job ${jobId}`);
    } catch (error) {
      logger.error(`BigWriter content generation failed for job ${jobId}:`, error);
      
      // Update job status to failed
      await this.updateJobStatus(jobId, 'failed', error.message);
    }
  }

  /**
   * Simulate BigWriter API for demo purposes
   * In production, this would be replaced with actual API calls
   */
  private async simulateBigWriterAPI(request: BigWriterRequest): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { topic, keywords, tone, length, language, target_audience } = request;

    // Generate content based on parameters
    const content = this.generateMockContent(topic, keywords, tone, length, language);
    const title = this.generateMockTitle(topic, tone);
    const excerpt = this.generateMockExcerpt(content);
    const metaDescription = this.generateMockMetaDescription(topic, keywords);
    const suggestedTags = this.generateMockTags(keywords, topic);

    return {
      title,
      content,
      excerpt,
      meta_description: metaDescription,
      suggested_tags: suggestedTags,
    };
  }

  /**
   * Generate mock content for demonstration
   */
  private generateMockContent(topic: string, keywords: string[], tone: string, length: string, language: string): string {
    const toneMap = {
      professional: 'de forma profissional e técnica',
      casual: 'de maneira descontraída e acessível',
      technical: 'com foco técnico e detalhado',
      friendly: 'de forma amigável e envolvente',
    };

    const lengthMap = {
      short: 300,
      medium: 800,
      long: 1500,
    };

    const targetWords = lengthMap[length as keyof typeof lengthMap] || 800;
    const toneDescription = toneMap[tone as keyof typeof toneMap] || 'de forma equilibrada';

    let content = `# ${topic}\n\n`;
    
    content += `Este artigo aborda o tema "${topic}" ${toneDescription}, `;
    content += `incorporando as palavras-chave: ${keywords.join(', ')}.\n\n`;

    content += `## Introdução\n\n`;
    content += `O ${topic} é um assunto de grande relevância nos dias atuais. `;
    content += `Com o avanço da tecnologia e as mudanças no mercado, `;
    content += `é fundamental compreender os aspectos relacionados a ${keywords[0] || 'este tema'}.\n\n`;

    content += `## Desenvolvimento\n\n`;
    content += `### Principais Conceitos\n\n`;
    content += `Quando falamos sobre ${topic}, precisamos considerar diversos fatores importantes:\n\n`;
    
    keywords.forEach((keyword, index) => {
      content += `**${keyword}**: Este é um elemento crucial que impacta diretamente `;
      content += `os resultados e a eficiência do processo. `;
      content += `A compreensão adequada de ${keyword} permite uma abordagem mais estratégica.\n\n`;
    });

    content += `### Aplicações Práticas\n\n`;
    content += `Na prática, ${topic} pode ser aplicado de diversas formas:\n\n`;
    content += `1. **Planejamento Estratégico**: Definindo objetivos claros e mensuráveis\n`;
    content += `2. **Implementação**: Colocando as estratégias em ação\n`;
    content += `3. **Monitoramento**: Acompanhando os resultados e fazendo ajustes\n`;
    content += `4. **Otimização**: Melhorando continuamente os processos\n\n`;

    content += `### Benefícios e Vantagens\n\n`;
    content += `A implementação adequada de ${topic} traz diversos benefícios:\n\n`;
    content += `- Maior eficiência operacional\n`;
    content += `- Redução de custos\n`;
    content += `- Melhoria na qualidade dos resultados\n`;
    content += `- Aumento da satisfação dos usuários\n`;
    content += `- Vantagem competitiva no mercado\n\n`;

    content += `## Conclusão\n\n`;
    content += `Em resumo, ${topic} representa uma oportunidade significativa `;
    content += `para organizações que buscam inovação e crescimento. `;
    content += `A aplicação dos conceitos relacionados a ${keywords.join(', ')} `;
    content += `pode gerar resultados expressivos quando implementada de forma estratégica.\n\n`;

    content += `É importante manter-se atualizado com as tendências e melhores práticas `;
    content += `para maximizar os benefícios e garantir o sucesso a longo prazo.`;

    // Adjust content length if needed
    const currentWords = content.split(/\s+/).length;
    if (currentWords < targetWords * 0.8) {
      content += `\n\n## Considerações Adicionais\n\n`;
      content += `Para aprofundar ainda mais o conhecimento sobre ${topic}, `;
      content += `recomenda-se o estudo contínuo e a aplicação prática dos conceitos apresentados. `;
      content += `A experiência e o feedback constante são fundamentais para o aperfeiçoamento `;
      content += `e a obtenção de resultados cada vez melhores.`;
    }

    return content;
  }

  private generateMockTitle(topic: string, tone: string): string {
    const titleTemplates = {
      professional: [
        `Guia Completo sobre ${topic}: Estratégias e Melhores Práticas`,
        `${topic}: Análise Profissional e Implementação Eficaz`,
        `Como Dominar ${topic}: Abordagem Estratégica e Resultados`,
      ],
      casual: [
        `Tudo que Você Precisa Saber sobre ${topic}`,
        `${topic} Descomplicado: Dicas Práticas e Fáceis`,
        `Descobrindo ${topic}: Um Guia Simples e Direto`,
      ],
      technical: [
        `${topic}: Implementação Técnica e Arquitetura`,
        `Aspectos Técnicos de ${topic}: Análise Detalhada`,
        `${topic}: Especificações Técnicas e Desenvolvimento`,
      ],
      friendly: [
        `${topic}: Vamos Conversar sobre Este Tema Incrível!`,
        `Explorando ${topic} Juntos: Um Papo Amigável`,
        `${topic} de Forma Amigável: Dicas e Insights`,
      ],
    };

    const templates = titleTemplates[tone as keyof typeof titleTemplates] || titleTemplates.professional;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateMockExcerpt(content: string): string {
    // Extract first paragraph or create a summary
    const paragraphs = content.split('\n\n');
    let excerpt = '';
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() && !paragraph.startsWith('#') && paragraph.length > 50) {
        excerpt = paragraph.trim();
        break;
      }
    }

    // Limit to 200 characters
    if (excerpt.length > 200) {
      excerpt = excerpt.substring(0, 197) + '...';
    }

    return excerpt || 'Este artigo aborda conceitos importantes e práticos sobre o tema proposto.';
  }

  private generateMockMetaDescription(topic: string, keywords: string[]): string {
    const keywordString = keywords.slice(0, 3).join(', ');
    return `Descubra tudo sobre ${topic}. Guia completo com ${keywordString} e muito mais. Informações práticas e atualizadas.`;
  }

  private generateMockTags(keywords: string[], topic: string): string[] {
    const baseTags = [...keywords];
    const additionalTags = [
      'guia',
      'tutorial',
      'dicas',
      'estratégia',
      'melhores práticas',
      'tecnologia',
      'inovação',
      'desenvolvimento',
    ];

    // Add topic-related tags
    const topicWords = topic.toLowerCase().split(' ');
    baseTags.push(...topicWords.filter(word => word.length > 3));

    // Add some random additional tags
    const randomTags = additionalTags
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    baseTags.push(...randomTags);

    // Remove duplicates and limit to 8 tags
    return [...new Set(baseTags)].slice(0, 8);
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await knex('bigwriter_jobs')
      .where('id', jobId)
      .update(updateData);
  }

  /**
   * Update job with generation results
   */
  private async updateJobWithResults(jobId: string, result: any): Promise<void> {
    await knex('bigwriter_jobs')
      .where('id', jobId)
      .update({
        status: 'completed',
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
        meta_description: result.meta_description,
        suggested_tags: JSON.stringify(result.suggested_tags),
        completed_at: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(signature: string | undefined, payload: any): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Get content generation statistics for a tenant
   */
  async getTenantStats(tenantId: string): Promise<any> {
    const stats = await knex('bigwriter_jobs')
      .where('tenant_id', tenantId)
      .select(
        knex.raw('COUNT(*) as total_jobs'),
        knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed_jobs', ['completed']),
        knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed_jobs', ['failed']),
        knex.raw('COUNT(CASE WHEN status IN (?, ?) THEN 1 END) as pending_jobs', ['pending', 'processing']),
        knex.raw('COUNT(CASE WHEN imported_article_id IS NOT NULL THEN 1 END) as imported_jobs')
      )
      .first();

    return {
      total_jobs: parseInt(stats.total_jobs) || 0,
      completed_jobs: parseInt(stats.completed_jobs) || 0,
      failed_jobs: parseInt(stats.failed_jobs) || 0,
      pending_jobs: parseInt(stats.pending_jobs) || 0,
      imported_jobs: parseInt(stats.imported_jobs) || 0,
      success_rate: stats.total_jobs > 0 
        ? Math.round((stats.completed_jobs / stats.total_jobs) * 100) 
        : 0,
    };
  }

  /**
   * Clean up old completed jobs (for maintenance)
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await knex('bigwriter_jobs')
      .where('status', 'completed')
      .where('created_at', '<', cutoffDate)
      .whereNull('imported_article_id') // Don't delete jobs that were imported
      .del();

    logger.info(`Cleaned up ${deletedCount} old BigWriter jobs`);
    return deletedCount;
  }
}
