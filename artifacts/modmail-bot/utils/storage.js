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

// --- Snippets ---
function getSnippets() {
  return readJSON('snippets.json');
}
function addSnippet(name, content) {
  const snippets = getSnippets();
  snippets[name.toLowerCase()] = content;
  writeJSON('snippets.json', snippets);
}
function removeSnippet(name) {
  const snippets = getSnippets();
  delete snippets[name.toLowerCase()];
  writeJSON('snippets.json', snippets);
}
function getSnippet(name) {
  return getSnippets()[name.toLowerCase()] || null;
}

// --- Config ---
function getConfig() {
  return readJSON('config.json');
}
function setConfig(data) {
  const current = getConfig();
  writeJSON('config.json', { ...current, ...data });
}

// --- Threads ---
function getThreads() {
  return readJSON('threads.json');
}
function getThreadByUser(userId) {
  const threads = getThreads();
  return Object.values(threads).find(t => t.userId === userId) || null;
}
function getThreadByChannel(channelId) {
  const threads = getThreads();
  return threads[channelId] || null;
}
function createThread(channelId, userId, userTag) {
  const threads = getThreads();
  threads[channelId] = { channelId, userId, userTag, openedAt: Date.now() };
  writeJSON('threads.json', threads);
}
function deleteThread(channelId) {
  const threads = getThreads();
  delete threads[channelId];
  writeJSON('threads.json', threads);
}

module.exports = {
  getSnippets, addSnippet, removeSnippet, getSnippet,
  getConfig, setConfig,
  getThreadByUser, getThreadByChannel, createThread, deleteThread,
};
