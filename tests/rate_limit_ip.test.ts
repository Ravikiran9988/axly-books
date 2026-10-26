import assert from 'node:assert/strict';
import { getClientIp } from '../src/lib/rateLimit';

assert.equal(getClientIp(new Headers({
  'x-real-ip': '203.0.113.10',
  'x-forwarded-for': '198.51.100.12',
})), '203.0.113.10', 'Use the platform-provided x-real-ip first');
assert.equal(getClientIp(new Headers({
  'x-vercel-forwarded-for': '2001:db8::5',
})), '2001:db8::5', 'Accept valid IPv6 from Vercel forwarded header');
assert.equal(getClientIp(new Headers({
  'x-vercel-ip': '203.0.113.99',
  'x-forwarded-for': '198.51.100.22',
})), '198.51.100.22', 'Do not use the unrelated x-vercel-ip header as an IP address');
assert.equal(getClientIp(new Headers({
  'x-real-ip': 'not-an-ip',
})), '127.0.0.1', 'Ignore invalid address values');
console.log('Rate-limit IP header tests passed.');
