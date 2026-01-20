import { notifyDebitLedger } from "../ledger.js";
import { getEntry, createEntry, updateEntry } from "../persistence.js";
import { logger } from "../utils/logger.js";
import { waitForInput } from "../utils/terminal-input.js";

// Simple handler that just accepts and responds
async function processAction(entry, action, accepted = true) {
  const actionData = entry.actions[action] || {};
  
  if (!accepted) {
    actionData.state = "failed";
    actionData.error = {
      reason: "bridge.entry-rejected",
      detail: "Operation rejected by user",
      failId: undefined,
    };
    entry.actions[action] = actionData;
    entry.state = "failed";
    await updateEntry(entry);
    return entry;
  }
  
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
  const source = req.body?.data?.source?.handle;
  const target = req.body?.data?.target?.handle;

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

  // Auto-accept all debit prepares for batch testing
  logger.info("Auto-accepting debit prepare", {
    handle,
    amount,
    symbol,
    source,
    target,
  });

  // Process the action
  entry = await processAction(entry, "prepare", true);
  logger.stateTransition("processing", "prepared", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "prepare", ["prepared"]);
  logger.success("Debit prepare completed", { handle, state: entry.state });
}

export async function commitDebit(req, res) {
  const handle = req.body?.data?.handle;

  // Accept immediately
  res.sendStatus(202);

  // Get entry
  let entry = await getEntry(handle);
  if (!entry) {
    logger.error(`Entry not found for commit`, { handle });
    return;
  }

  // Get amount and symbol from entry (stored during prepare)
  const amount = entry.amount || req.body?.data?.amount;
  const symbol = entry.symbol || req.body?.data?.symbol?.handle;

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

  // Ask user to confirm commit (just press Enter)
  const promptMessage = `DEBIT COMMIT - Press Enter to confirm commit\n` +
    `  Handle: ${handle}\n` +
    `  Amount: ${amount || 'N/A'} ${symbol || ''}\n` +
    `\nPress Enter to commit...`;
  
  logger.prompt(promptMessage, "question");
  
  await waitForInput(promptMessage, "");

  // Process the action
  entry = await processAction(entry, "commit", true);
  logger.stateTransition("processing", "committed", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "commit", ["committed"]);
  logger.success("Debit commit completed", { handle, state: entry.state });
}

export async function abortDebit(req, res) {
  const handle = req.body?.data?.handle;

  // Accept immediately
  res.sendStatus(202);

  // Get entry
  let entry = await getEntry(handle);
  if (!entry) {
    logger.error(`Entry not found for abort`, { handle });
    return;
  }

  // Get amount and symbol from entry (stored during prepare)
  const amount = entry.amount || req.body?.data?.amount;
  const symbol = entry.symbol || req.body?.data?.symbol?.handle;

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

  // Ask user to confirm abort (just press Enter)
  const promptMessage = `DEBIT ABORT - Press Enter to confirm abort\n` +
    `  Handle: ${handle}\n` +
    `  Amount: ${amount || 'N/A'} ${symbol || ''}\n` +
    `\nPress Enter to abort...`;
  
  logger.prompt(promptMessage, "question");
  
  await waitForInput(promptMessage, "");

  // Process the action
  entry = await processAction(entry, "abort", true);
  logger.stateTransition("processing", "aborted", handle);

  // Notify ledger
  await notifyDebitLedger(entry, "abort", ["aborted"]);
  logger.success("Debit abort completed", { handle, state: entry.state });
}
