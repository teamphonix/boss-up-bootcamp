const assert = require('assert');

const {
  extractRegistrationFromCheckoutSession,
  upsertRegistrationFromCheckoutSession,
} = require('../api/_stripe-registration');

async function testExtractRegistrationFromCheckoutSession() {
  const session = {
    id: 'cs_test_123',
    payment_status: 'paid',
    amount_total: 2500,
    currency: 'usd',
    payment_intent: 'pi_123',
    customer: 'cus_123',
    payment_link: 'plink_123',
    customer_details: {
      name: 'Jonti Test',
      email: 'jonti@example.com',
      phone: '+15551234567',
    },
    metadata: {
      event_id: 'event-from-metadata',
      interest: 'Music and AI branding',
    },
  };

  const row = extractRegistrationFromCheckoutSession(session, 'fallback-event-id');

  assert.equal(row.event_id, 'event-from-metadata');
  assert.equal(row.stripe_checkout_session_id, 'cs_test_123');
  assert.equal(row.stripe_payment_intent_id, 'pi_123');
  assert.equal(row.stripe_customer_id, 'cus_123');
  assert.equal(row.stripe_payment_link_id, 'plink_123');
  assert.equal(row.payment_status, 'paid');
  assert.equal(row.amount_total, 2500);
  assert.equal(row.currency, 'usd');
  assert.equal(row.attendee_name, 'Jonti Test');
  assert.equal(row.attendee_email, 'jonti@example.com');
  assert.equal(row.attendee_phone, '+15551234567');
  assert.equal(row.interest, 'Music and AI branding');
  assert.equal(row.source, 'stripe_payment_link');
  assert.deepEqual(row.raw_stripe, session);
}

async function testExtractUsesFallbackEventAndCustomerEmail() {
  const session = {
    id: 'cs_test_456',
    payment_status: 'paid',
    customer_email: 'fallback@example.com',
    customer_details: {},
    metadata: {},
  };

  const row = extractRegistrationFromCheckoutSession(session, 'published-event-id');

  assert.equal(row.event_id, 'published-event-id');
  assert.equal(row.attendee_email, 'fallback@example.com');
}

async function testUpsertRegistrationUsesStripeSessionIdConflict() {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(columns) {
          calls.push(['select', columns]);
          return {
            eq(column, value) {
              calls.push(['eq', column, value]);
              return {
                order(column, options) {
                  calls.push(['order', column, options]);
                  return {
                    limit(count) {
                      calls.push(['limit', count]);
                      return Promise.resolve({ data: [{ id: 'published-event-id' }], error: null });
                    },
                  };
                },
              };
            },
          };
        },
        upsert(row, options) {
          calls.push(['upsert', row, options]);
          return {
            select(columns) {
              calls.push(['upsertSelect', columns]);
              return {
                single() {
                  calls.push(['single']);
                  return Promise.resolve({ data: { id: 'registration-id', ...row }, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  const registration = await upsertRegistrationFromCheckoutSession(supabase, {
    id: 'cs_test_789',
    payment_status: 'paid',
    amount_total: 2500,
    currency: 'usd',
    customer_details: { email: 'paid@example.com' },
    metadata: {},
  });

  const upsertCall = calls.find((call) => call[0] === 'upsert');
  assert.equal(registration.stripe_checkout_session_id, 'cs_test_789');
  assert.equal(upsertCall[2].onConflict, 'stripe_checkout_session_id');
  assert.equal(upsertCall[2].ignoreDuplicates, false);
}

async function run() {
  await testExtractRegistrationFromCheckoutSession();
  await testExtractUsesFallbackEventAndCustomerEmail();
  await testUpsertRegistrationUsesStripeSessionIdConflict();
  console.log('stripe-registration tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
