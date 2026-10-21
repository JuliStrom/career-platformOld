const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const User = require('../dist/src/models/User').default;
const Profile = require('../dist/src/models/Profile').default;
const Job = require('../dist/src/models/Job').default;
const { generateAccessToken } = require('../dist/src/utils/tokenService');
const owner = '111111111111111111111111';
const another = '222222222222222222222222';
const jobId = '98fedcc1f4531290b15fedcb';
const otherJob = '333333333333333333333333';
let server, base;
before(async () => {
  process.env.JWT_SECRET = 'favorites-test-secret';
  const app = express(); app.use(express.json());
  app.use('/jobs', require('../dist/src/routes/job').default);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/jobs`;
});
after(() => server.close());
const headers = (id = owner) => ({ Authorization: `Bearer ${generateAccessToken({ userId: id, email: 'test@example.com', role: 'SPECIALIST' })}` });
function setup(t, { legacy = null } = {}) {
  const accounts = new Map([[owner, undefined], [another, undefined]]);
  const jobs = new Map([[jobId, { _id: jobId, isActive: true }], [otherJob, { _id: otherJob, isActive: true }]]);
  let legacyReads = 0;
  t.mock.method(User, 'findById', id => ({
    then(resolve, reject) { return Promise.resolve({ _id: id, role: 'SPECIALIST', isDeleted: false, isBlocked: false }).then(resolve, reject); },
    select(projection) {
      assert.equal(projection, 'favoriteJobs');
      return {
        lean: async () => ({ _id: id, favoriteJobs: accounts.get(id) }),
        populate: async options => {
          assert.deepEqual(options.match, { isActive: true });
          return { favoriteJobs: (accounts.get(id) ?? []).map(key => jobs.get(String(key))).filter(job => job?.isActive) };
        },
      };
    },
  }));
  t.mock.method(Profile, 'findOne', filter => ({ select(projection) {
    assert.equal(projection, 'favoriteJobs');
    return { lean: async () => { legacyReads++; return filter.userId === owner && legacy ? { favoriteJobs: legacy } : null; } };
  } }));
  t.mock.method(Profile, 'create', () => assert.fail('favorites must not create an incomplete profile'));
  t.mock.method(User, 'updateOne', async (filter, update) => {
    assert.ok(filter.$or.some(condition => condition.favoriteJobs?.$exists === false));
    if (!Array.isArray(accounts.get(filter._id))) accounts.set(filter._id, [...update.$set.favoriteJobs]);
  });
  t.mock.method(User, 'findByIdAndUpdate', (id, update, options) => {
    assert.equal(options.new, true);
    const list = accounts.get(id) ?? [];
    if (update.$addToSet) accounts.set(id, [...new Set([...list, update.$addToSet.favoriteJobs])]);
    if (update.$pull) accounts.set(id, list.filter(key => key !== update.$pull.favoriteJobs));
    return { select: async projection => { assert.equal(projection, 'favoriteJobs'); return { favoriteJobs: accounts.get(id) }; } };
  });
  t.mock.method(Job, 'findById', async id => jobs.get(id) ?? null);
  return { accounts, jobs, legacyReads: () => legacyReads };
}
test('registered account without a profile can list, add, remove and repeat favorite actions', async t => {
  const state = setup(t);
  let response = await fetch(`${base}/favorites`, { headers: headers() });
  assert.equal(response.status, 200); assert.equal((await response.json()).total, 0);
  for (let i = 0; i < 2; i++) {
    response = await fetch(`${base}/${jobId}/favorite`, { method: 'POST', headers: headers() });
    assert.equal(response.status, 200); assert.equal((await response.json()).favoriteJobsCount, 1);
  }
  const list = await (await fetch(`${base}/favorites`, { headers: headers() })).json();
  assert.equal(list.total, 1); assert.equal(list.favoriteJobs[0]._id, jobId);
  for (let i = 0; i < 2; i++) {
    response = await fetch(`${base}/${jobId}/favorite`, { method: 'DELETE', headers: headers() });
    assert.equal(response.status, 200); assert.equal((await response.json()).favoriteJobsCount, 0);
  }
  assert.equal(state.legacyReads(), 1);
});
test('legacy profile favorites transfer once and removed jobs never reappear from the old profile', async t => {
  const state = setup(t, { legacy: [jobId] });
  assert.equal((await (await fetch(`${base}/favorites`, { headers: headers() })).json()).total, 1);
  await fetch(`${base}/${jobId}/favorite`, { method: 'DELETE', headers: headers() });
  assert.equal((await (await fetch(`${base}/favorites`, { headers: headers() })).json()).total, 0);
  assert.equal(state.legacyReads(), 1);
});
test('concurrent favorite additions do not overwrite each other and are isolated by account', async t => {
  setup(t);
  const results = await Promise.all([jobId, otherJob].map(id => fetch(`${base}/${id}/favorite`, { method: 'POST', headers: headers() })));
  assert.ok(results.every(response => response.status === 200));
  assert.equal((await (await fetch(`${base}/favorites`, { headers: headers() })).json()).total, 2);
  assert.equal((await (await fetch(`${base}/favorites`, { headers: headers(another) })).json()).total, 0);
});
test('missing and inactive jobs are rejected, inactive favorites are hidden, and guests cannot change favorites', async t => {
  const state = setup(t, { legacy: [jobId] });
  assert.equal((await fetch(`${base}/${jobId}/favorite`, { method: 'POST' })).status, 401);
  state.jobs.delete(otherJob);
  assert.equal((await fetch(`${base}/${otherJob}/favorite`, { method: 'POST', headers: headers() })).status, 404);
  state.jobs.get(jobId).isActive = false;
  assert.equal((await fetch(`${base}/${jobId}/favorite`, { method: 'POST', headers: headers() })).status, 400);
  assert.equal((await (await fetch(`${base}/favorites`, { headers: headers() })).json()).total, 0);
  assert.equal((await fetch(`${base}/${jobId}/favorite`, { method: 'DELETE', headers: headers() })).status, 200);
});
