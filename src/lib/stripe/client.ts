import Stripe from 'stripe';

export const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

export const getStripeWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET ?? '';

export const TEST_CARDS = {
  success: '4242424242424242',
  soft: '4000000000009995',
  hard: '4000000000000002',
};
