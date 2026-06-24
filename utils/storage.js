const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename) {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeJSON(filename, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

function getSnippets() { return readJSON('snippets.json'); }
function addSnippet(name, content) {
  const s = getSnippets();
  s[name.toLowerCase()] = content;
  writeJSON('snippets.json', s);
}
function removeSnippet(name) {
  const s = getSnippets();
  delete s[name.toLowerCase()];
  writeJSON('snippets.json', s);
}
function getSnippet(name) { return getSnippets()[name.toLowerCase()] || null; }

function getConfig() { return readJSON('config.json'); }
function setConfig(data) { writeJSON('config.json', { ...getConfig(), ...data }); }

function getThreads() { return readJSON('threads.json'); }
function getThreadByUser(userId) {
  return Object.values(getThreads()).find(t => t.userId === userId) || null;
}
function getThreadByChannel(channelId) { return getThreads()[channelId] || null; }
function createThread(channelId, userId, userTag) {
  const t = getThreads();
  t[channelId] = { channelId, userId, userTag, openedAt: Date.now() };
  writeJSON('threads.json', t);
}
function deleteThread(channelId) {
  const t = getThreads();
  delete t[channelId];
  writeJSON('threads.json', t);
}

module.exports = {
  getSnippets, addSnippet, removeSnippet, getSnippet,
  getConfig, setConfig,
  getThreadByUser, getThreadByChannel, createThread, deleteThread,
};
