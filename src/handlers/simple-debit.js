import { notifyDebitLedger } from "../ledger.js";
import { getEntry, createEntry, updateEntry } from "../persistence.js";
import { logger } from "../utils/logger.js";

// Simple handler that just accepts and responds
async function processAction(entry, action) {
  const actionData = entry.actions[action] || {};
  
  // Always succeed - no validation
  actionData.state = action === "prepare" ? "prepared" : 
                     action === "commit" ? "committed" : 
                     "aborted";
  
  entry.actions[action] = actionData;
  entry.state = actionData.state;
  
  await updateEntry(entry);
  return entry;
}

export async function prepareDebit(req, res) {
  const handle = req.body?.data?.handle;
  const amount = req.body?.data?.amount;
  const symbol = req.body?.data?.symbol?.handle;

  // Accept immediately
  res.sendStatus(202);

  // Get or create entry
  let entry = await getEntry(handle);
  if (!entry) {
    logger.info("Creating new entry", { handle });
    entry = await createEntry({
      handle,
      hash: req.body.hash,
      data: req.body.data,
      meta: req.body.meta,
      state: null,
      actions: {},
    });
  }

  // Process action
  entry.actions["prepare"] = {
    action: "prepare",
    hash: req.body.hash,
    data: req.body.data,
    meta: req.body.meta,
    state: "processing",
  };
  await updateEntry(entry);
  logger.stateTransition(null, "processing", handle);

  // Always succeed
  entry = await processAction(entry, "prepare");
  logger.stateTransition("processing", "prepared", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "prepare", ["prepared"]);
  logger.success("Debit prepare completed", { handle, state: entry.state });
}

export async function commitDebit(req, res) {
  const handle = req.body?.data?.handle;
  const amount = req.body?.data?.amount;
  const symbol = req.body?.data?.symbol?.handle;

  // Accept immediately
  res.sendStatus(202);

  // Get entry
  let entry = await getEntry(handle);
  if (!entry) {
    logger.error(`Entry not found for commit`, { handle });
    return;
  }

  // Process action
  entry.actions["commit"] = {
    action: "commit",
    hash: req.body.hash,
    data: req.body.data,
    meta: req.body.meta,
    state: "processing",
  };
  await updateEntry(entry);
  logger.stateTransition(entry.state, "processing", handle);

  // Always succeed
  entry = await processAction(entry, "commit");
  logger.stateTransition("processing", "committed", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "commit", ["committed"]);
  logger.success("Debit commit completed", { handle, state: entry.state });
}

export async function abortDebit(req, res) {
  const handle = req.body?.data?.handle;
  const amount = req.body?.data?.amount;
  const symbol = req.body?.data?.symbol?.handle;

  // Accept immediately
  res.sendStatus(202);

  // Get entry
  let entry = await getEntry(handle);
  if (!entry) {
    logger.error(`Entry not found for abort`, { handle });
    return;
  }

  // Process action
  entry.actions["abort"] = {
    action: "abort",
    hash: req.body.hash,
    data: req.body.data,
    meta: req.body.meta,
    state: "processing",
  };
  await updateEntry(entry);
  logger.stateTransition(entry.state, "processing", handle);

  // Always succeed
  entry = await processAction(entry, "abort");
  logger.stateTransition("processing", "aborted", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "abort", ["aborted"]);
  logger.success("Debit abort completed", { handle, state: entry.state });
}
