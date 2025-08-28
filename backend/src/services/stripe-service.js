const Stripe = require('stripe');
const { supabase } = require('../config/database');

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // =====================================================
  // CUSTOMER MANAGEMENT
  // =====================================================

  async createCustomer(tenantData) {
    try {
      const customer = await this.stripe.customers.create({
        email: tenantData.owner_email,
        name: tenantData.name,
        metadata: {
          tenant_id: tenantData.id,
          tenant_slug: tenantData.slug
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async updateCustomer(customerId, updateData) {
    try {
      const customer = await this.stripe.customers.update(customerId, updateData);
      return customer;
    } catch (error) {
      console.error('Error updating Stripe customer:', error);
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      throw new Error(`Failed to retrieve customer: ${error.message}`);
    }
  }

  // =====================================================
  // SUBSCRIPTION MANAGEMENT
  // =====================================================

  async createSubscription(customerId, priceId, options = {}) {
    try {
      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        ...options
      };

      // Adicionar trial se especificado
      if (options.trial_days) {
        subscriptionData.trial_period_days = options.trial_days;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async updateSubscription(subscriptionId, updateData) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, updateData);
      return subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async resumeSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });
      return subscription;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  }

  async changeSubscriptionPlan(subscriptionId, newPriceId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations'
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error(`Failed to change subscription plan: ${error.message}`);
    }
  }

  // =====================================================
  // PAYMENT METHODS
  // =====================================================

  async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Definir como método padrão
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw new Error(`Failed to attach payment method: ${error.message}`);
    }
  }

  async detachPaymentMethod(paymentMethodId) {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      console.error('Error detaching payment method:', error);
      throw new Error(`Failed to detach payment method: ${error.message}`);
    }
  }

  async listPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      console.error('Error listing payment methods:', error);
      throw new Error(`Failed to list payment methods: ${error.message}`);
    }
  }

  // =====================================================
  // INVOICES
  // =====================================================

  async getInvoice(invoiceId) {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      throw new Error(`Failed to retrieve invoice: ${error.message}`);
    }
  }

  async listInvoices(customerId, limit = 10) {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: limit
      });
      return invoices.data;
    } catch (error) {
      console.error('Error listing invoices:', error);
      throw new Error(`Failed to list invoices: ${error.message}`);
    }
  }

  async createInvoiceItem(customerId, amount, description, currency = 'brl') {
    try {
      const invoiceItem = await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(amount * 100), // Converter para centavos
        currency: currency,
        description: description
      });
      return invoiceItem;
    } catch (error) {
      console.error('Error creating invoice item:', error);
      throw new Error(`Failed to create invoice item: ${error.message}`);
    }
  }

  // =====================================================
  // WEBHOOKS
  // =====================================================

  constructWebhookEvent(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  // =====================================================
  // USAGE RECORDS (para metered billing)
  // =====================================================

  async createUsageRecord(subscriptionItemId, quantity, timestamp = null) {
    try {
      const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity: quantity,
          timestamp: timestamp || Math.floor(Date.now() / 1000),
          action: 'set' // ou 'increment'
        }
      );
      return usageRecord;
    } catch (error) {
      console.error('Error creating usage record:', error);
      throw new Error(`Failed to create usage record: ${error.message}`);
    }
  }

  // =====================================================
  // CHECKOUT SESSIONS
  // =====================================================

  async createCheckoutSession(customerId, priceId, options = {}) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: options.success_url || `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: options.cancel_url || `${process.env.FRONTEND_URL}/billing/cancel`,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
        ...options
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  async createPortalSession(customerId, returnUrl) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/billing`,
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }

  // =====================================================
  // PRODUCTS AND PRICES
  // =====================================================

  async createProduct(name, description, metadata = {}) {
    try {
      const product = await this.stripe.products.create({
        name: name,
        description: description,
        metadata: metadata
      });
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async createPrice(productId, amount, currency = 'brl', interval = 'month') {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100), // Converter para centavos
        currency: currency,
        recurring: {
          interval: interval
        }
      });
      return price;
    } catch (error) {
      console.error('Error creating price:', error);
      throw new Error(`Failed to create price: ${error.message}`);
    }
  }

  async listPrices(productId = null, active = true) {
    try {
      const params = { active: active, limit: 100 };
      if (productId) {
        params.product = productId;
      }

      const prices = await this.stripe.prices.list(params);
      return prices.data;
    } catch (error) {
      console.error('Error listing prices:', error);
      throw new Error(`Failed to list prices: ${error.message}`);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  formatAmount(amount, currency = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  async syncSubscriptionToDatabase(stripeSubscription) {
    try {
      const subscriptionData = {
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeSubscription.customer,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        amount: stripeSubscription.items.data[0].price.unit_amount / 100,
        currency: stripeSubscription.items.data[0].price.currency.toUpperCase(),
        billing_cycle: stripeSubscription.items.data[0].price.recurring.interval === 'month' ? 'monthly' : 'yearly',
        updated_at: new Date()
      };

      if (stripeSubscription.trial_start) {
        subscriptionData.trial_start = new Date(stripeSubscription.trial_start * 1000);
      }
      if (stripeSubscription.trial_end) {
        subscriptionData.trial_end = new Date(stripeSubscription.trial_end * 1000);
      }
      if (stripeSubscription.canceled_at) {
        subscriptionData.canceled_at = new Date(stripeSubscription.canceled_at * 1000);
      }
      if (stripeSubscription.ended_at) {
        subscriptionData.ended_at = new Date(stripeSubscription.ended_at * 1000);
      }

      const { data, error } = await supabase
        .from('billing_subscriptions')
        .upsert(subscriptionData, { 
          onConflict: 'stripe_subscription_id',
          returning: 'minimal'
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing subscription to database:', error);
      throw error;
    }
  }

  async syncInvoiceToDatabase(stripeInvoice) {
    try {
      // Buscar subscription_id pelo stripe_subscription_id
      const { data: subscription } = await supabase
        .from('billing_subscriptions')
        .select('id, tenant_id')
        .eq('stripe_subscription_id', stripeInvoice.subscription)
        .single();

      if (!subscription) {
        throw new Error(`Subscription not found for invoice ${stripeInvoice.id}`);
      }

      const invoiceData = {
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        stripe_invoice_id: stripeInvoice.id,
        stripe_charge_id: stripeInvoice.charge,
        invoice_number: stripeInvoice.number,
        amount_due: stripeInvoice.amount_due / 100,
        amount_paid: stripeInvoice.amount_paid / 100,
        amount_remaining: stripeInvoice.amount_remaining / 100,
        currency: stripeInvoice.currency.toUpperCase(),
        status: stripeInvoice.status,
        due_date: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
        paid_at: stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
        period_start: new Date(stripeInvoice.period_start * 1000),
        period_end: new Date(stripeInvoice.period_end * 1000),
        hosted_invoice_url: stripeInvoice.hosted_invoice_url,
        invoice_pdf_url: stripeInvoice.invoice_pdf,
        description: stripeInvoice.description,
        updated_at: new Date()
      };

      const { data, error } = await supabase
        .from('billing_invoices')
        .upsert(invoiceData, { 
          onConflict: 'stripe_invoice_id',
          returning: 'minimal'
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing invoice to database:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();
