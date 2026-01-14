let entries = new Map();
let intents = new Map();

export async function getEntry(handle) {
  return entries[handle];
}

export async function createEntry(entry) {
  entries[entry.handle] = entry;
  return entry;
}

export async function updateEntry(entry) {
  entries[entry.handle] = entry;
  return entry;
}

export async function upsertIntent(intent) {
  intents[intent.handle] = intent;
  return intent;
}

export async function getIntent(handle) {
  return intents[handle];
}
