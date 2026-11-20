import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makePinCode, normalizePin, hashPin, hashToken, getUnitPrice, sessionKey,
  paystackSignature, constantTimeEqual, makeReference,
} from '../backend/dist/marketplace/types.js';
import { encryptPin, decryptPin } from '../backend/dist/marketplace/pinCrypto.js';

const mockProduct = (overrides = {}) => ({
  id: 'p1', categoryId: 'c1', type: 'DIGITAL_PIN', name: 'Test PIN', slug: 'test-pin',
  description: '', price: 500, currency: 'NGN', minQty: 1, maxQty: 500,
  available: true, featured: false, createdAt: '', updatedAt: '', ...overrides,
});

test('PIN codes are 12 chars formatted 4-4-4 from unambiguous alphabet', () => {
  for (let i = 0; i < 100; i++) {
    const code = makePinCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    assert.equal(normalizePin(code).length, 12);
  }
});

test('PIN normalization is case-insensitive and strips non-alphanumerics', () => {
  assert.equal(normalizePin('abcd-efgh-jkLM'), 'ABCDEFGHJKLM');
});

test('PIN hashing is deterministic for lookup', () => {
  assert.equal(hashPin('ABCD-EFGH-JKLM'), hashPin('abcdefghjklm'));
  assert.notEqual(hashPin('ABCD-EFGH-JKLM'), hashPin('ABCD-EFGH-JKLN'));
});

test('Bulk pricing selects lowest applicable tier', () => {
  const product = mockProduct({ price: 500, bulkPricing: [
    { minQty: 10, price: 450 }, { minQty: 50, price: 400 },
  ] });
  assert.equal(getUnitPrice(product, 1), 500);
  assert.equal(getUnitPrice(product, 10), 450);
  assert.equal(getUnitPrice(product, 49), 450);
  assert.equal(getUnitPrice(product, 50), 400);
});

test('Session key sanitization', () => {
  assert.equal(sessionKey('2026/2027 Session'), '2026_2027_Session');
});

test('Paystack signature is HMAC SHA-512 hex and deterministic', () => {
  const sig = paystackSignature('secret', '{"event":"charge.success"}');
  assert.match(sig, /^[0-9a-f]{128}$/);
  assert.equal(sig, paystackSignature('secret', '{"event":"charge.success"}'));
  assert.notEqual(sig, paystackSignature('other', '{"event":"charge.success"}'));
});

test('Constant-time comparison rejects mismatched lengths', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
});

test('References are unique with expected prefix', () => {
  const a = makeReference('GTM'), b = makeReference('GTM');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('GTM-'));
});

test('Token hashing is deterministic', () => {
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.notEqual(hashToken('abc'), hashToken('abd'));
});

test('PIN encryption roundtrip when key configured', { skip: !process.env.PIN_ENCRYPTION_KEY }, () => {
  const code = 'ABCD-EFGH-JKLM';
  const cipher = encryptPin(code);
  assert.ok(cipher);
  assert.notEqual(cipher, code);
  assert.equal(decryptPin(cipher), code);
  assert.equal(decryptPin('invalid-base64'), null);
});
