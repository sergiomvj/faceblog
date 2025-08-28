const express = require('express');
const billingService = require('../services/billing-service');
const stripeService = require('../services/stripe-service');
const { tenantAuth, requireAdmin } = require('../middleware/enhanced-tenant-auth');

const router = express.Router();

// Aplicar middleware de autenticação por tenant
router.use(tenantAuth);

// =====================================================
// PLANS ROUTES
// =====================================================

// GET /api/v1/billing/plans - Listar planos disponíveis
router.get('/plans', async (req, res) => {
  try {
    const { include_inactive = false } = req.query;
    const plans = await billingService.getAllPlans(!include_inactive);

    // Adicionar cálculo de desconto anual
    const plansWithDiscount = plans.map(plan => ({
      ...plan,
      yearly_discount: plan.price_yearly > 0 && plan.price_monthly > 0 
        ? billingService.calculateDiscount(plan.price_monthly, plan.price_yearly)
        : 0,
      formatted_price_monthly: billingService.formatPrice(plan.price_monthly),
      formatted_price_yearly: billingService.formatPrice(plan.price_yearly)
    }));

    res.json({
      success: true,
      data: plansWithDiscount
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
      details: error.message
    });
  }
});

// GET /api/v1/billing/plans/:slug - Obter plano específico
router.get('/plans/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const plan = await billingService.getPlanBySlug(slug);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    const planWithDiscount = {
      ...plan,
      yearly_discount: plan.price_yearly > 0 && plan.price_monthly > 0 
        ? billingService.calculateDiscount(plan.price_monthly, plan.price_yearly)
        : 0,
      formatted_price_monthly: billingService.formatPrice(plan.price_monthly),
      formatted_price_yearly: billingService.formatPrice(plan.price_yearly)
    };

    res.json({
      success: true,
      data: planWithDiscount
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan',
      details: error.message
    });
  }
});

// =====================================================
// SUBSCRIPTION ROUTES
// =====================================================

// GET /api/v1/billing/subscription - Obter assinatura atual
router.get('/subscription', async (req, res) => {
  try {
    const subscription = await billingService.getTenantSubscription(req.tenant.id);

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription found'
      });
    }

    // Calcular uso atual e limites
    const [usage, limits] = await Promise.all([
      billingService.calculateTenantUsage(req.tenant.id),
      billingService.checkTenantLimits(req.tenant.id)
    ]);

    res.json({
      success: true,
      data: {
        subscription,
        usage,
        limits,
        formatted_amount: billingService.formatPrice(subscription.amount)
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
      details: error.message
    });
  }
});

// POST /api/v1/billing/subscription - Criar nova assinatura
router.post('/subscription', async (req, res) => {
  try {
    const { plan_slug, billing_cycle = 'monthly', trial_days } = req.body;

    if (!plan_slug) {
      return res.status(400).json({
        success: false,
        error: 'Plan slug is required'
      });
    }

    const options = {};
    if (trial_days && trial_days > 0) {
      options.trial_days = trial_days;
    }

    const result = await billingService.createSubscription(
      req.tenant.id,
      plan_slug,
      billing_cycle,
      options
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// PUT /api/v1/billing/subscription/plan - Alterar plano
router.put('/subscription/plan', async (req, res) => {
  try {
    const { plan_slug, billing_cycle } = req.body;

    if (!plan_slug) {
      return res.status(400).json({
        success: false,
        error: 'Plan slug is required'
      });
    }

    const result = await billingService.changeSubscriptionPlan(
      req.tenant.id,
      plan_slug,
      billing_cycle
    );

    res.json({
      success: true,
      data: result,
      message: 'Subscription plan changed successfully'
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change subscription plan',
      details: error.message
    });
  }
});

// POST /api/v1/billing/subscription/cancel - Cancelar assinatura
router.post('/subscription/cancel', async (req, res) => {
  try {
    const { cancel_at_period_end = true } = req.body;

    const subscription = await billingService.cancelSubscription(
      req.tenant.id,
      cancel_at_period_end
    );

    res.json({
      success: true,
      data: subscription,
      message: cancel_at_period_end 
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled immediately'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      details: error.message
    });
  }
});

// POST /api/v1/billing/subscription/resume - Retomar assinatura
router.post('/subscription/resume', async (req, res) => {
  try {
    const subscription = await billingService.resumeSubscription(req.tenant.id);

    res.json({
      success: true,
      data: subscription,
      message: 'Subscription resumed successfully'
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume subscription',
      details: error.message
    });
  }
});

// =====================================================
// USAGE AND LIMITS ROUTES
// =====================================================

// GET /api/v1/billing/usage - Obter uso atual
router.get('/usage', async (req, res) => {
  try {
    const usage = await billingService.calculateTenantUsage(req.tenant.id);
    const limits = await billingService.checkTenantLimits(req.tenant.id);

    res.json({
      success: true,
      data: {
        usage,
        limits,
        has_violations: limits.has_violations,
        violations: limits.violations
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage',
      details: error.message
    });
  }
});

// POST /api/v1/billing/usage/record - Registrar uso atual
router.post('/usage/record', requireAdmin, async (req, res) => {
  try {
    const { period = 'current' } = req.body;
    const usage = await billingService.recordUsage(req.tenant.id, period);

    res.json({
      success: true,
      data: usage,
      message: 'Usage recorded successfully'
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record usage',
      details: error.message
    });
  }
});

// =====================================================
// INVOICES ROUTES
// =====================================================

// GET /api/v1/billing/invoices - Listar faturas
router.get('/invoices', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const invoices = await billingService.getTenantInvoices(req.tenant.id, parseInt(limit));

    const invoicesWithFormatted = invoices.map(invoice => ({
      ...invoice,
      formatted_amount_due: billingService.formatPrice(invoice.amount_due),
      formatted_amount_paid: billingService.formatPrice(invoice.amount_paid),
      formatted_amount_remaining: billingService.formatPrice(invoice.amount_remaining)
    }));

    res.json({
      success: true,
      data: invoicesWithFormatted
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      details: error.message
    });
  }
});

// GET /api/v1/billing/invoices/:id - Obter fatura específica
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await billingService.getInvoiceById(id);

    if (!invoice || invoice.tenant_id !== req.tenant.id) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoiceWithFormatted = {
      ...invoice,
      formatted_amount_due: billingService.formatPrice(invoice.amount_due),
      formatted_amount_paid: billingService.formatPrice(invoice.amount_paid),
      formatted_amount_remaining: billingService.formatPrice(invoice.amount_remaining)
    };

    res.json({
      success: true,
      data: invoiceWithFormatted
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      details: error.message
    });
  }
});

// =====================================================
// CHECKOUT AND PORTAL ROUTES
// =====================================================

// POST /api/v1/billing/checkout - Criar sessão de checkout
router.post('/checkout', async (req, res) => {
  try {
    const { plan_slug, billing_cycle = 'monthly', trial_days } = req.body;

    if (!plan_slug) {
      return res.status(400).json({
        success: false,
        error: 'Plan slug is required'
      });
    }

    const options = {};
    if (trial_days && trial_days > 0) {
      options.trial_period_days = trial_days;
    }

    const session = await billingService.createCheckoutSession(
      req.tenant.id,
      plan_slug,
      billing_cycle,
      options
    );

    res.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// POST /api/v1/billing/portal - Criar sessão do portal do cliente
router.post('/portal', async (req, res) => {
  try {
    const session = await billingService.createPortalSession(req.tenant.id);

    res.json({
      success: true,
      data: {
        portal_url: session.url
      }
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session',
      details: error.message
    });
  }
});

// =====================================================
// WEBHOOK ROUTE (sem autenticação)
// =====================================================

// POST /api/billing/webhook - Webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing stripe-signature header'
      });
    }

    const event = stripeService.constructWebhookEvent(req.body, signature);
    
    await billingService.handleWebhookEvent(event);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

// =====================================================
// ADMIN ROUTES (requer permissão admin)
// =====================================================

// POST /api/v1/billing/plans - Criar novo plano (admin only)
router.post('/plans', requireAdmin, async (req, res) => {
  try {
    const planData = req.body;
    const plan = await billingService.createPlan(planData);

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan created successfully'
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create plan',
      details: error.message
    });
  }
});

// GET /api/v1/billing/analytics - Analytics de billing (admin only)
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Buscar dados de analytics
    const { data: subscriptions, error: subError } = await supabase
      .from('billing_subscriptions')
      .select(`
        *,
        plan:billing_plans(name, slug, price_monthly, price_yearly)
      `)
      .gte('created_at', startDate.toISOString());

    if (subError) throw subError;

    const { data: invoices, error: invError } = await supabase
      .from('billing_invoices')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (invError) throw invError;

    // Processar estatísticas
    const analytics = {
      total_subscriptions: subscriptions.length,
      active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
      canceled_subscriptions: subscriptions.filter(s => s.status === 'canceled').length,
      trial_subscriptions: subscriptions.filter(s => s.status === 'trialing').length,
      total_revenue: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount_paid), 0),
      pending_revenue: invoices
        .filter(i => i.status === 'open')
        .reduce((sum, i) => sum + parseFloat(i.amount_due), 0),
      subscriptions_by_plan: {},
      revenue_by_month: {},
      churn_rate: 0 // TODO: Implementar cálculo de churn
    };

    // Agrupar por plano
    subscriptions.forEach(sub => {
      const planName = sub.plan?.name || 'Unknown';
      analytics.subscriptions_by_plan[planName] = (analytics.subscriptions_by_plan[planName] || 0) + 1;
    });

    // Agrupar receita por mês
    invoices.filter(i => i.status === 'paid').forEach(invoice => {
      const month = new Date(invoice.paid_at).toISOString().substring(0, 7); // YYYY-MM
      analytics.revenue_by_month[month] = (analytics.revenue_by_month[month] || 0) + parseFloat(invoice.amount_paid);
    });

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        analytics,
        formatted_total_revenue: billingService.formatPrice(analytics.total_revenue),
        formatted_pending_revenue: billingService.formatPrice(analytics.pending_revenue)
      }
    });
  } catch (error) {
    console.error('Error fetching billing analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing analytics',
      details: error.message
    });
  }
});

module.exports = router;
