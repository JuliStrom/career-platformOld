const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Minimal Zustand adapter: execute the actual client store without React/native modules.
function createStore(factory) {
  let state;
  const getState = () => state;
  const setState = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
  state = factory(setState, getState);
  return { getState, setState };
}

function client({ saved = null, platform = 'web' } = {}) {
  let storage = saved;
  let randomCalls = 0;
  const guestStorage = {
    get: () => platform === 'web' ? storage : null,
    load: async () => storage,
    set: value => { storage = value; },
    clear: () => { storage = null; },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/features/guest/store/guest-session.store.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, {
    exports: module.exports,
    require(name) {
      if (name === 'zustand') return { create: createStore };
      if (name === '../lib/guest-storage') return { guestStorage };
      if (name === '../lib/utm') return { parseUtmFromUrl: url => url?.includes('campaign') ? { utm_source: 'campaign', ref: 'author' } : {} };
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-linking') return { getInitialURL: async () => 'app://start?campaign' };
      if (name === 'expo-crypto') return { getRandomBytesAsync: async () => { randomCalls++; return new Uint8Array(32).fill(randomCalls); } };
      throw new Error(name);
    }, Date, Uint8Array, URLSearchParams,
  });
  return { store: module.exports.useGuestSessionStore, randomCalls: () => randomCalls };
}
test('client creates an ID on an untagged first visit, locks direct attribution, and deduplicates concurrent initialization', async () => {
  const { store, randomCalls } = client();
  store.getState().captureFromUrl('https://app.test');
  store.getState().captureFromUrl('https://app.test?campaign');
  const [a, b] = await Promise.all([store.getState().ensure(), store.getState().ensure()]);
  assert.equal(a.guestId.length, 64); assert.equal(a.guestId, b.guestId);
  assert.equal(Object.keys(a.utm).length, 0); assert.equal(randomCalls(), 1);
});
test('native first entry restores stored identity before considering a new deep link', async () => {
  const saved = { guestId: 'c'.repeat(64), utm: { utm_source: 'original' }, createdAt: new Date().toISOString() };
  const { store, randomCalls } = client({ saved, platform: 'ios' });
  store.getState().captureFromUrl('app://start?campaign');
  const session = await store.getState().ensure();
  assert.equal(session.guestId, saved.guestId); assert.equal(session.utm.utm_source, 'original'); assert.equal(randomCalls(), 0);
});
test('native new session captures the initial referral link', async () => {
  const { store } = client({ platform: 'android' });
  const session = await store.getState().ensure();
  assert.equal(session.utm.ref, 'author');
});
test('expired anonymous identity rotates, but linked account identity survives guest retention', async () => {
  const saved = { guestId: 'd'.repeat(64), utm: {}, createdAt: new Date(0).toISOString(), retentionDays: 30 };
  assert.notEqual((await client({ saved }).store.getState().ensure()).guestId, saved.guestId);
  assert.equal((await client({ saved: { ...saved, linkedUserId: 'owner' } }).store.getState().ensure()).guestId, saved.guestId);
});

function accountTabs(isEmployer, unreadCount) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/features/auth/lib/useAccountTabs.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: module.exports,
    require: () => ({ useTranslation: namespace => ({ t: key => `${namespace}.${key}` }) }),
  });
  return module.exports.useAccountTabs(isEmployer, unreadCount);
}
test('shared account navigation keeps history visible and separates employer and specialist sections', () => {
  for (const employer of [false, true]) {
    const tabs = accountTabs(employer, 0);
    const visible = tabs.filter(tab => tab.href);
    assert.equal(new Set(tabs.map(tab => tab.name)).size, tabs.length);
    assert.ok(visible.some(tab => tab.href === '/resume-history'));
    assert.ok(visible.some(tab => tab.href === '/notifications'));
    assert.equal(visible.some(tab => tab.href === '/employer'), employer);
    assert.equal(visible.some(tab => tab.href === '/jobs'), !employer);
    assert.equal(visible.some(tab => tab.href === '/profile'), !employer);
  }
});
test('shared account navigation preserves unread notification badge boundaries', () => {
  const badge = count => accountTabs(false, count).find(tab => tab.href === '/notifications').badge;
  assert.equal(badge(0), undefined);
  assert.equal(badge(1), 1);
  assert.equal(badge(99), 99);
  assert.equal(badge(100), '99+');
});
