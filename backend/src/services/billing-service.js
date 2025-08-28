const { supabase } = require('../config/database');
const stripeService = require('./stripe-service');

class BillingService {
  // =====================================================
  // PLANS MANAGEMENT
  // =====================================================

  async getAllPlans(activeOnly = true) {
    try {
      let query = supabase
        .from('billing_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }
  }

  async getPlanBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching plan:', error);
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
  }

  async createPlan(planData) {
    try {
      // Criar produto no Stripe
      const stripeProduct = await stripeService.createProduct(
        planData.name,
        planData.description,
        { plan_slug: planData.slug }
      );

      // Criar preços no Stripe
      let stripePriceMonthly = null;
      let stripePriceYearly = null;

      if (planData.price_monthly > 0) {
        stripePriceMonthly = await stripeService.createPrice(
          stripeProduct.id,
          planData.price_monthly,
          'brl',
          'month'
        );
      }

      if (planData.price_yearly > 0) {
        stripePriceYearly = await stripeService.createPrice(
          stripeProduct.id,
          planData.price_yearly,
          'brl',
          'year'
        );
      }

      // Salvar no banco
      const { data, error } = await supabase
        .from('billing_plans')
        .insert({
          ...planData,
          stripe_product_id: stripeProduct.id,
          stripe_price_id_monthly: stripePriceMonthly?.id,
          stripe_price_id_yearly: stripePriceYearly?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error(`Failed to create plan: ${error.message}`);
    }
  }

  // =====================================================
  // SUBSCRIPTION MANAGEMENT
  // =====================================================

  async getTenantSubscription(tenantId) {
    try {
      const { data, error } = await supabase
        .from('billing_subscriptions')
        .select(`
          *,
          plan:billing_plans(*)
        `)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  async createSubscription(tenantId, planSlug, billingCycle = 'monthly', options = {}) {
    try {
      // Buscar plano
      const plan = await this.getPlanBySlug(planSlug);
      if (!plan) throw new Error('Plan not found');

      // Buscar tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Criar ou buscar customer no Stripe
      let stripeCustomerId = null;
      const existingSubscription = await this.getTenantSubscription(tenantId);
      
      if (existingSubscription?.stripe_customer_id) {
        stripeCustomerId = existingSubscription.stripe_customer_id;
      } else {
        const stripeCustomer = await stripeService.createCustomer(tenant);
        stripeCustomerId = stripeCustomer.id;
      }

      // Determinar price_id baseado no ciclo
      const priceId = billingCycle === 'yearly' 
        ? plan.stripe_price_id_yearly 
        : plan.stripe_price_id_monthly;

      if (!priceId) {
        throw new Error(`Price not available for ${billingCycle} billing`);
      }

      // Criar subscription no Stripe
      const stripeSubscription = await stripeService.createSubscription(
        stripeCustomerId,
        priceId,
        options
      );

      // Salvar no banco
      const subscriptionData = {
        tenant_id: tenantId,
        plan_id: plan.id,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomerId,
        status: stripeSubscription.status,
        billing_cycle: billingCycle,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        currency: 'BRL'
      };

      if (stripeSubscription.trial_start) {
        subscriptionData.trial_start = new Date(stripeSubscription.trial_start * 1000);
      }
      if (stripeSubscription.trial_end) {
        subscriptionData.trial_end = new Date(stripeSubscription.trial_end * 1000);
      }

      const { data, error } = await supabase
        .from('billing_subscriptions')
        .upsert(subscriptionData, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      return {
        subscription: data,
        stripe_subscription: stripeSubscription,
        client_secret: stripeSubscription.latest_invoice?.payment_intent?.client_secret
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async changeSubscriptionPlan(tenantId, newPlanSlug, newBillingCycle = null) {
    try {
      const currentSubscription = await this.getTenantSubscription(tenantId);
      if (!currentSubscription) throw new Error('No active subscription found');

      const newPlan = await this.getPlanBySlug(newPlanSlug);
      if (!newPlan) throw new Error('New plan not found');

      // Determinar ciclo de cobrança
      const billingCycle = newBillingCycle || currentSubscription.billing_cycle;
      const newPriceId = billingCycle === 'yearly' 
        ? newPlan.stripe_price_id_yearly 
        : newPlan.stripe_price_id_monthly;

      if (!newPriceId) {
        throw new Error(`Price not available for ${billingCycle} billing`);
      }

      // Alterar no Stripe
      const stripeSubscription = await stripeService.changeSubscriptionPlan(
        currentSubscription.stripe_subscription_id,
        newPriceId
      );

      // Atualizar no banco
      const { data, error } = await supabase
        .from('billing_subscriptions')
        .update({
          plan_id: newPlan.id,
          billing_cycle: billingCycle,
          amount: billingCycle === 'yearly' ? newPlan.price_yearly : newPlan.price_monthly,
          updated_at: new Date()
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return {
        subscription: data,
        stripe_subscription: stripeSubscription
      };
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error(`Failed to change subscription plan: ${error.message}`);
    }
  }

  async cancelSubscription(tenantId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) throw new Error('No active subscription found');

      // Cancelar no Stripe
      const stripeSubscription = await stripeService.cancelSubscription(
        subscription.stripe_subscription_id,
        cancelAtPeriodEnd
      );

      // Atualizar no banco
      const updateData = {
        status: stripeSubscription.status,
        updated_at: new Date()
      };

      if (stripeSubscription.canceled_at) {
        updateData.canceled_at = new Date(stripeSubscription.canceled_at * 1000);
      }

      const { data, error } = await supabase
        .from('billing_subscriptions')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async resumeSubscription(tenantId) {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) throw new Error('No subscription found');

      // Retomar no Stripe
      const stripeSubscription = await stripeService.resumeSubscription(
        subscription.stripe_subscription_id
      );

      // Atualizar no banco
      const { data, error } = await supabase
        .from('billing_subscriptions')
        .update({
          status: stripeSubscription.status,
          canceled_at: null,
          updated_at: new Date()
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  }

  // =====================================================
  // USAGE AND LIMITS
  // =====================================================

  async calculateTenantUsage(tenantId) {
    try {
      const { data, error } = await supabase
        .rpc('calculate_tenant_usage', { p_tenant_id: tenantId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating usage:', error);
      throw new Error(`Failed to calculate usage: ${error.message}`);
    }
  }

  async checkTenantLimits(tenantId) {
    try {
      const { data, error } = await supabase
        .rpc('check_tenant_limits', { p_tenant_id: tenantId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking limits:', error);
      throw new Error(`Failed to check limits: ${error.message}`);
    }
  }

  async recordUsage(tenantId, period = 'current') {
    try {
      const usage = await this.calculateTenantUsage(tenantId);
      
      // Determinar período
      const now = new Date();
      let periodStart, periodEnd;
      
      if (period === 'current') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        // Período customizado pode ser implementado aqui
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      // Buscar subscription
      const subscription = await this.getTenantSubscription(tenantId);

      const usageData = {
        tenant_id: tenantId,
        subscription_id: subscription?.id,
        articles_count: usage.articles_count,
        categories_count: usage.categories_count,
        tags_count: usage.tags_count,
        users_count: usage.users_count,
        api_keys_count: usage.api_keys_count,
        api_requests_count: usage.api_requests_count,
        storage_used_mb: usage.storage_used_mb,
        period_start: periodStart,
        period_end: periodEnd
      };

      const { data, error } = await supabase
        .from('billing_usage')
        .upsert(usageData, { 
          onConflict: 'tenant_id,period_start,period_end' 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording usage:', error);
      throw new Error(`Failed to record usage: ${error.message}`);
    }
  }

  // =====================================================
  // INVOICES
  // =====================================================

  async getTenantInvoices(tenantId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
  }

  async getInvoiceById(invoiceId) {
    try {
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }
  }

  // =====================================================
  // CHECKOUT AND PORTAL
  // =====================================================

  async createCheckoutSession(tenantId, planSlug, billingCycle = 'monthly', options = {}) {
    try {
      const plan = await this.getPlanBySlug(planSlug);
      if (!plan) throw new Error('Plan not found');

      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      // Criar customer se não existir
      let stripeCustomerId = null;
      const existingSubscription = await this.getTenantSubscription(tenantId);
      
      if (existingSubscription?.stripe_customer_id) {
        stripeCustomerId = existingSubscription.stripe_customer_id;
      } else {
        const stripeCustomer = await stripeService.createCustomer(tenant);
        stripeCustomerId = stripeCustomer.id;
      }

      const priceId = billingCycle === 'yearly' 
        ? plan.stripe_price_id_yearly 
        : plan.stripe_price_id_monthly;

      const session = await stripeService.createCheckoutSession(
        stripeCustomerId,
        priceId,
        {
          success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/billing/plans`,
          metadata: {
            tenant_id: tenantId,
            plan_slug: planSlug,
            billing_cycle: billingCycle
          },
          ...options
        }
      );

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  async createPortalSession(tenantId) {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription?.stripe_customer_id) {
        throw new Error('No customer found for tenant');
      }

      const session = await stripeService.createPortalSession(
        subscription.stripe_customer_id,
        `${process.env.FRONTEND_URL}/billing`
      );

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }

  // =====================================================
  // WEBHOOK HANDLING
  // =====================================================

  async handleWebhookEvent(event) {
    try {
      // Salvar evento
      await this.saveWebhookEvent(event);

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionChange(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Marcar evento como processado
      await this.markEventProcessed(event.id);
    } catch (error) {
      console.error('Error handling webhook event:', error);
      await this.markEventError(event.id, error.message);
      throw error;
    }
  }

  async saveWebhookEvent(event) {
    const { error } = await supabase
      .from('billing_events')
      .insert({
        event_type: event.type,
        stripe_event_id: event.id,
        data: event.data,
        processed: false
      });

    if (error) throw error;
  }

  async markEventProcessed(eventId) {
    const { error } = await supabase
      .from('billing_events')
      .update({
        processed: true,
        processed_at: new Date()
      })
      .eq('stripe_event_id', eventId);

    if (error) throw error;
  }

  async markEventError(eventId, errorMessage) {
    const { error } = await supabase
      .from('billing_events')
      .update({
        processed: false,
        error_message: errorMessage
      })
      .eq('stripe_event_id', eventId);

    if (error) throw error;
  }

  async handleSubscriptionChange(stripeSubscription) {
    await stripeService.syncSubscriptionToDatabase(stripeSubscription);
  }

  async handleSubscriptionDeleted(stripeSubscription) {
    const { error } = await supabase
      .from('billing_subscriptions')
      .update({
        status: 'canceled',
        ended_at: new Date(),
        updated_at: new Date()
      })
      .eq('stripe_subscription_id', stripeSubscription.id);

    if (error) throw error;
  }

  async handleInvoicePaymentSucceeded(stripeInvoice) {
    await stripeService.syncInvoiceToDatabase(stripeInvoice);
  }

  async handleInvoicePaymentFailed(stripeInvoice) {
    await stripeService.syncInvoiceToDatabase(stripeInvoice);
    
    // Aqui você pode implementar notificações por email
    console.log(`Payment failed for invoice ${stripeInvoice.id}`);
  }

  async handleTrialWillEnd(stripeSubscription) {
    // Implementar notificação de fim de trial
    console.log(`Trial will end for subscription ${stripeSubscription.id}`);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  formatPrice(amount, currency = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  calculateDiscount(monthlyPrice, yearlyPrice) {
    const yearlyMonthly = yearlyPrice / 12;
    const discount = ((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100;
    return Math.round(discount);
  }

  isFeatureAvailable(subscription, feature) {
    if (!subscription?.plan) return false;
    return subscription.plan[feature] === true;
  }

  isWithinLimits(usage, limits, resource) {
    const limit = limits[`max_${resource}`];
    if (limit === -1) return true; // Ilimitado
    return usage[`${resource}_count`] <= limit;
  }
}

module.exports = new BillingService();
