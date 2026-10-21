const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const Guest = require('../dist/src/models/GuestSession').default;
const Resume = require('../dist/src/models/ResumeAnalysis').default;
const User = require('../dist/src/models/User').default;
const service = require('../dist/src/services/guestSession');
const { generateAccessToken } = require('../dist/src/utils/tokenService');
const key = 'b'.repeat(64);
let server, base;
before(async () => {
  process.env.JWT_SECRET = 'guest-session-test-secret';
  const app = express(); app.use(express.json());
  app.use('/session', require('../dist/src/routes/guestSession').default);
  app.use('/analyses', require('../dist/src/routes/guestAnalysis').default);
  app.use((error, req, res, next) => res.status(500).json({ error: 'internal_error' }));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
const headers = { 'Content-Type': 'application/json', 'X-Guest-Id': key };
function auth(t, id = 'owner') {
  t.mock.method(User, 'findById', async () => ({ _id: id, role: 'SPECIALIST' }));
  return { ...headers, Authorization: `Bearer ${generateAccessToken({ userId: id, email: 'test@example.com', role: 'SPECIALIST' })}` };
}

test('guest credential is high entropy, hashed, and separate from public database IDs', () => {
  assert.equal(service.validGuestKey(key), true);
  assert.equal(service.validGuestKey('012345678901234567890123'), false);
  assert.equal(service.validGuestKey(undefined), false);
  assert.notEqual(service.guestKeyHash(key), key);
  assert.equal(Guest.schema.path('keyHash').options.select, false);
});
test('retention defaults to 30 days and validates configuration', t => {
  const original = process.env.GUEST_RETENTION_DAYS;
  t.after(() => original === undefined ? delete process.env.GUEST_RETENTION_DAYS : process.env.GUEST_RETENTION_DAYS = original);
  delete process.env.GUEST_RETENTION_DAYS;
  assert.equal(service.guestRetentionDays(), 30);
  process.env.GUEST_RETENTION_DAYS = '7';
  assert.ok(Math.abs(service.guestExpiry().getTime() - Date.now() - 7 * 86400000) < 1000);
  process.env.GUEST_RETENTION_DAYS = '0'; assert.throws(service.guestRetentionDays);
  process.env.GUEST_RETENTION_DAYS = 'NaN'; assert.throws(service.guestRetentionDays);
});
test('first direct visit is locked and later campaign/referral cannot overwrite it', async t => {
  let stored;
  t.mock.method(Guest, 'updateOne', async (query, update) => {
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    stored ??= { ...update.$setOnInsert };
  });
  t.mock.method(Guest, 'findOne', async () => stored);
  assert.equal((await fetch(`${base}/session`, { method: 'POST', headers, body: '{}' })).status, 200);
  assert.equal((await fetch(`${base}/session`, { method: 'POST', headers, body: JSON.stringify({ utm: { utm_source: 'later', ref: 'later' } }) })).status, 200);
  assert.equal(stored.firstTouch.utm_source, undefined);
  assert.equal(stored.firstTouch.ref, undefined);
  assert.equal(stored.keyHash, service.guestKeyHash(key));
});
test('invalid and expired guest sessions are rejected before TTL cleanup', async t => {
  assert.equal((await fetch(`${base}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  t.mock.method(Guest, 'updateOne', async () => ({}));
  t.mock.method(Guest, 'findOne', async () => ({ expiresAt: new Date(0) }));
  assert.equal((await fetch(`${base}/session`, { method: 'POST', headers, body: '{}' })).status, 410);
});
test('claim transfers every unexpired analysis and source, preserves account first touch, and is idempotent', async t => {
  let query;
  const updates = [];
  t.mock.method(Guest, 'findOneAndUpdate', async (filter, update) => {
    query = filter;
    assert.equal(update.$set.ownerId, 'owner'); assert.equal(update.$unset.expiresAt, 1);
    return { _id: 'session', firstTouch: { utm_source: 'first', ref: 'author' } };
  });
  t.mock.method(Resume, 'updateMany', async (filter, update) => {
    assert.equal(filter.guestSessionId, 'session'); assert.equal(filter.ownerId, null);
    assert.ok(filter.expiresAt.$gt instanceof Date);
    assert.deepEqual(update.$unset, { expiresAt: 1, sourceExpiresAt: 1 });
    updates.push(update);
  });
  t.mock.method(User, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter.firstTouch, { $exists: false });
    assert.equal(update.$set.firstTouch.ref, 'author');
  });
  await service.claimGuestSession(key, 'owner'); await service.claimGuestSession(key, 'owner');
  assert.equal(updates.length, 2);
  assert.equal(query.keyHash, service.guestKeyHash(key));
  assert.deepEqual(query.$and[0].$or, [{ ownerId: null }, { ownerId: 'owner' }]);
});
test('failed ownership check never transfers another account data', async t => {
  t.mock.method(Guest, 'findOneAndUpdate', async () => null);
  t.mock.method(Resume, 'updateMany', () => assert.fail('must not transfer'));
  t.mock.method(User, 'updateOne', () => assert.fail('must not overwrite attribution'));
  assert.equal(await service.claimGuestSession(key, 'another-user'), null);
  assert.equal((await fetch(`${base}/session/claim`, { method: 'POST', headers })).status, 401);
});
test('draft preserves role, goal and locale, rejects invalid data, and requires owner auth after claim', async t => {
  let filter, saved;
  t.mock.method(Guest, 'findOne', query => {
    filter = query;
    return { select: async () => ({ _id: 'session', ownerId: null, draft: saved }) };
  });
  t.mock.method(Guest, 'updateOne', async (query, update) => { saved = update.$set.draft; });
  const draft = { language: 'uz', builder: { role: 'Designer', skills: 'Figma', education: '', languages: 'Uzbek', location: 'Tashkent', targetCountry: 'UZ', jobLocation: 'home', noExperience: true, consent: false, experience: [] } };
  assert.equal((await fetch(`${base}/session/draft`, { method: 'PUT', headers, body: JSON.stringify(draft) })).status, 200);
  assert.deepEqual((await (await fetch(`${base}/session/draft`, { headers })).json()).draft, draft);
  assert.deepEqual(filter.$and[0].$or, [{ ownerId: null }]);
  assert.equal((await fetch(`${base}/session/draft`, { method: 'PUT', headers, body: JSON.stringify({ builder: { role: 'Incomplete' } }) })).status, 400);
});
test('history returns only owner summaries and never includes secrets, source or private results', async t => {
  const ownerHeaders = auth(t);
  let filter, projection;
  t.mock.method(Resume, 'find', query => {
    filter = query;
    const chain = { select(value) { projection = value; return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [{ _id: 'analysis', status: 'completed', goal: { desiredRole: 'Designer' }, createdAt: new Date() }] };
    return chain;
  });
  t.mock.method(Resume, 'countDocuments', async () => 1);
  const response = await fetch(`${base}/analyses/history`, { headers: ownerHeaders });
  assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.total, 1); assert.deepEqual(filter, { ownerId: 'owner' });
  assert.equal(projection, '_id status goal createdAt');
  assert.equal(data.items[0].secretHash, undefined); assert.equal(data.items[0].source, undefined); assert.equal(data.items[0].result, undefined);
  assert.equal((await fetch(`${base}/analyses/history`)).status, 401);
});
