const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const express = require('express');
const { once } = require('node:events');
const { buildProfilePrefill } = require('../dist/src/services/profilePrefill');
const Resume = require('../dist/src/models/ResumeAnalysis').default;
const User = require('../dist/src/models/User').default;
const Profile = require('../dist/src/models/Profile').default;
const { generateAccessToken } = require('../dist/src/utils/tokenService');
const profile = {
  role: 'Frontend developer', direction: 'IT', level: 'Middle', location: 'Almaty, Kazakhstan',
  skills: ['React', ' TypeScript ', 'React'], experience: [], education: [], languages: [],
};
const job = { company: 'Example', role: 'Developer', startDate: '2023-05', endDate: 'present', responsibilities: ['Build interfaces'], achievements: ['Reduced load time'] };

test('name comes from the resume, falls back to explicit legacy labels or account, and is never guessed', () => {
  assert.equal(buildProfilePrefill({ ...profile, name: 'Иван Иванов' }, 'Account Name').name, 'Иван Иванов');
  assert.equal(buildProfilePrefill(profile, undefined, 'ФИО: Иван Иванов\nFrontend developer').name, 'Иван Иванов');
  assert.equal(buildProfilePrefill(profile, 'Account Name', 'Frontend developer\nCompany Name').name, 'Account Name');
  assert.equal(buildProfilePrefill(profile, undefined, 'Frontend developer\nCompany Name').name, undefined);
});
test('legacy resume contact header fills the name without re-analysis and excludes roles and employers', () => {
  assert.equal(buildProfilePrefill(profile, undefined, 'Резюме\nИван Иванов\nFrontend developer\nivan@example.com').name, 'Иван Иванов');
  assert.equal(buildProfilePrefill(profile, undefined, '# Ivan Ivanov\nDeveloper\nivan@example.com').name, 'Ivan Ivanov');
  assert.equal(buildProfilePrefill(profile, undefined, 'Product Manager\nmanager@example.com').name, undefined);
  assert.equal(buildProfilePrefill({ ...profile, experience: [job] }, undefined, 'Example Company\ncontact@example.com').name, undefined);
  assert.equal(buildProfilePrefill({ ...profile, experience: [{ ...job, company: 'Example Company' }] }, undefined, 'Example Company\ncontact@example.com').name, undefined);
  assert.equal(buildProfilePrefill(profile, undefined, 'Ivan Ivanov\nNo contacts in this block').name, undefined);
});

test('maps extracted profile, full workplace facts, explicit ongoing work, and account name', () => {
  const values = buildProfilePrefill({ ...profile, experience: [job] }, 'Account Name');
  assert.equal(values.name, 'Account Name'); assert.equal(values.level, 'Middle');
  assert.deepEqual(values.directions, ['IT']); assert.deepEqual(values.skills, ['React', 'TypeScript']);
  assert.equal(values.city, 'almaty'); assert.equal(values.currentCompany, 'Example');
  assert.equal(values.currentPosition, 'Developer'); assert.equal(values.currentAchievement, 'Reduced load time');
  assert.equal(values.careerStartDate.toISOString(), '2023-05-01T00:00:00.000Z');
  assert.match(values.workplaces[0].achievement, /Build interfaces/); assert.match(values.workplaces[0].achievement, /Reduced load time/);
  assert.match(values.experience, /2023-05/);
});
test('unknown data and personal choices remain unset; past or ambiguous employment is not current', () => {
  for (const endDate of [null, '2025-01']) {
    const values = buildProfilePrefill({ ...profile, role: null, direction: null, level: null, location: 'Unknown', skills: [], experience: [{ ...job, endDate }] });
    for (const key of ['name', 'directions', 'level', 'skills', 'city', 'currentCompany', 'currentPosition', 'careerStartDate', 'careerGoal', 'lang', 'wantsRelocation']) assert.equal(values[key], undefined, key);
  }
});
test('prefill respects field limits, picks the newest ongoing role, and refuses invalid dates', () => {
  const values = buildProfilePrefill({ ...profile, experience: [job, { ...job, company: 'New', role: 'Senior developer', startDate: '06.2025', achievements: ['x'.repeat(700)] }] });
  assert.equal(values.currentCompany, 'New'); assert.equal(values.currentAchievement.length, 500);
  assert.equal(values.careerStartDate.toISOString(), '2025-06-01T00:00:00.000Z');
  assert.equal(buildProfilePrefill({ ...profile, experience: [{ ...job, startDate: '2025-99' }] }).careerStartDate, undefined);
});

const moduleResult = { exports: {} };
const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/features/profile/utils/prefill.utils.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleResult.exports });
const { canPrefillProfileField, isEmptyProfileValue } = moduleResult.exports;
test('autofill never overwrites existing or newly typed values, including nested workplace edits', () => {
  assert.equal(canPrefillProfileField('React', '', '', false), true);
  assert.equal(canPrefillProfileField('React', 'Vue', '', false), false);
  assert.equal(canPrefillProfileField('React', '', 'Vue', false), false);
  assert.equal(canPrefillProfileField('React', '', '', true), false);
  assert.equal(canPrefillProfileField('Middle', 'Junior', undefined, false, true), true);
  assert.equal(canPrefillProfileField('Middle', 'Junior', 'Junior', false, true), false);
  assert.equal(canPrefillProfileField('Middle', 'Junior', undefined, true, true), false);
  assert.equal(isEmptyProfileValue([{ company: '', position: '', period: '', achievement: '', projects: [] }]), true);
  assert.equal(isEmptyProfileValue([{ company: 'My company', projects: [] }]), false);
  assert.equal(isEmptyProfileValue(false), false);
});

let server, base;
before(async () => {
  process.env.JWT_SECRET = 'profile-prefill-test-secret';
  const app = express();
  app.get('/prefill', require('../dist/src/middleware/authMiddleware').default, require('../dist/src/controllers/profileController').getProfilePrefill);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/prefill`;
});
after(() => server.close());
test('prefill endpoint requires authentication, selects only the owner latest completed analysis, and never publishes a profile', async t => {
  t.mock.method(User, 'findById', async () => ({ _id: 'owner', name: 'Account Name', role: 'SPECIALIST' }));
  t.mock.method(Profile, 'create', () => assert.fail('suggestions must not publish a profile'));
  let filter;
  t.mock.method(Resume, 'findOne', query => {
    filter = query;
    return { sort(order) { assert.deepEqual(order, { createdAt: -1, _id: -1 }); return this; }, select: async () => ({ _id: 'analysis', result: { profile } }) };
  });
  assert.equal((await fetch(base)).status, 401);
  const token = generateAccessToken({ userId: 'owner', email: 'test@example.com', role: 'SPECIALIST' });
  const response = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200); assert.deepEqual(filter, { ownerId: 'owner', status: 'completed' });
  const body = await response.json(); assert.equal(body.values.name, 'Account Name'); assert.equal(body.analysisId, 'analysis');
  assert.equal(body.values.extractedText, undefined);
});
