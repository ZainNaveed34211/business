import assert from 'node:assert';
import { planFromEntitlement, toolAllowed, TOOL_ORDER } from '../src/lib/account.ts';
import { adsEligible, sanitizeEvent } from '../src/lib/analytics.ts';
import { loginUrl, signupUrl, paymentsUrl } from '../src/lib/url.ts';

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

check('plan growth active premium', () => {
  assert.equal(planFromEntitlement({ plan: 'growth', status: 'active', premium: true }), 'growth');
});
check('plan max active premium', () => {
  assert.equal(planFromEntitlement({ plan: 'max', status: 'active', premium: true }), 'max');
});
check('plan premium false stays free', () => {
  assert.equal(planFromEntitlement({ plan: 'max', status: 'active', premium: false }), 'free');
});
check('plan cancelled stays free', () => {
  assert.equal(planFromEntitlement({ plan: 'max', status: 'cancelled', premium: true }), 'free');
});
check('plan unknown plan string stays free', () => {
  assert.equal(planFromEntitlement({ plan: 'starter', status: 'active', premium: true }), 'free');
});
check('plan null stays free', () => {
  assert.equal(planFromEntitlement(null), 'free');
});
check('growth allows all except security', () => {
  for (const tool of TOOL_ORDER) {
    assert.equal(toolAllowed('growth', tool), tool !== 'security');
  }
});
check('max allows all tools', () => {
  for (const tool of TOOL_ORDER) {
    assert.equal(toolAllowed('max', tool), true);
  }
});
check('free guest unknown allow nothing', () => {
  for (const status of ['free', 'guest', 'unknown']) {
    for (const tool of TOOL_ORDER) {
      assert.equal(toolAllowed(status, tool), false);
    }
  }
});
check('ads eligible guest and free only', () => {
  assert.equal(adsEligible('guest'), true);
  assert.equal(adsEligible('free'), true);
  assert.equal(adsEligible('growth'), false);
  assert.equal(adsEligible('max'), false);
  assert.equal(adsEligible('unknown'), false);
  assert.equal(adsEligible('loading'), false);
});
check('analytics event sanitized and allowlisted', () => {
  const out = sanitizeEvent({ event: 'x'.repeat(100), tool: 'y'.repeat(100), outcome: 'z'.repeat(100), password: 'secret' });
  assert.equal(out.event.length, 64);
  assert.equal(out.tool.length, 64);
  assert.equal(out.outcome.length, 32);
  assert.equal('password' in out, false);
});
check('login url returns to business home', () => {
  const u = new URL(loginUrl());
  assert.equal(u.protocol, 'https:');
  assert.equal(u.hostname, 'accounts.kluzar.com');
  assert.equal(u.pathname, '/login/');
  assert.equal(u.searchParams.get('next'), 'https://business.kluzar.com/');
});
check('signup url returns to business home', () => {
  const u = new URL(signupUrl());
  assert.equal(u.hostname, 'accounts.kluzar.com');
  assert.equal(u.pathname, '/signup/');
  assert.equal(u.searchParams.get('next'), 'https://business.kluzar.com/');
});
check('payments url returns to business home', () => {
  const u = new URL(paymentsUrl());
  assert.equal(u.protocol, 'https:');
  assert.equal(u.hostname, 'payments.kluzar.com');
  assert.equal(u.searchParams.get('return'), 'https://business.kluzar.com/');
});

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
