import { notifyCreditLedger } from "../ledger.js";
import { getEntry, createEntry, updateEntry } from "../persistence.js";
import { logger } from "../utils/logger.js";
import { waitForConfirmation, waitForInput } from "../utils/terminal-input.js";

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

export async function prepareCredit(req, res) {
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

  // Ask user for confirmation
  const promptMessage = `CREDIT PREPARE - Accept or Reject?\n` +
    `  Handle: ${handle}\n` +
    `  Amount: ${amount} ${symbol}\n` +
    `  Source: ${source}\n` +
    `  Target: ${target}\n` +
    `\nAccept this credit prepare? (y/n): `;
  
  logger.prompt(promptMessage, "question");
  
  // Default to true (accept) in non-interactive environments
  const accepted = await waitForConfirmation(promptMessage, true);
  
  if (!accepted) {
    logger.warn("Credit prepare rejected by user", { handle });
    entry = await processAction(entry, "prepare", false);
    logger.stateTransition("processing", "failed", handle);
    
    // Notify ledger of rejection (ledger expects "failed" status)
    await notifyCreditLedger(entry, "prepare", ["failed"]);
    logger.success("Credit prepare rejection sent to ledger", { handle, state: entry.state });
    return;
  }

  // Process the action
  entry = await processAction(entry, "prepare", true);
  logger.stateTransition("processing", "prepared", handle);

  // Notify ledger
  await notifyCreditLedger(entry, "prepare", ["prepared"]);
  logger.success("Credit prepare completed", { handle, state: entry.state });
}

export async function commitCredit(req, res) {
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
  const promptMessage = `CREDIT COMMIT - Press Enter to confirm commit\n` +
    `  Handle: ${handle}\n` +
    `  Amount: ${amount || 'N/A'} ${symbol || ''}\n` +
    `\nPress Enter to commit...`;
  
  logger.prompt(promptMessage, "question");
  
  await waitForInput(promptMessage, "");

  // Process the action
  entry = await processAction(entry, "commit", true);
  logger.stateTransition("processing", "committed", handle);

  // Notify ledger
  await notifyCreditLedger(entry, "commit", ["committed"]);
  logger.success("Credit commit completed", { handle, state: entry.state });
}

export async function abortCredit(req, res) {
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

  // Ask user for confirmation
  const promptMessage = `CREDIT ABORT - Accept or Reject?\n` +
    `  Handle: ${handle}\n` +
    `  Amount: ${amount || 'N/A'} ${symbol || ''}\n` +
    `\nAccept this credit abort? (y/n): `;
  
  logger.prompt(promptMessage, "question");
  
  // Default to true (accept) in non-interactive environments
  const accepted = await waitForConfirmation(promptMessage, true);
  
  if (!accepted) {
    logger.warn("Credit abort rejected by user", { handle });
    entry = await processAction(entry, "abort", false);
    logger.stateTransition("processing", "failed", handle);
    
    // Notify ledger of rejection (ledger expects "failed" status)
    await notifyCreditLedger(entry, "abort", ["failed"]);
    logger.success("Credit abort rejection sent to ledger", { handle, state: entry.state });
    return;
  }

  // Process the action
  entry = await processAction(entry, "abort", true);
  logger.stateTransition("processing", "aborted", handle);

  // Notify ledger
  await notifyCreditLedger(entry, "abort", ["aborted"]);
  logger.success("Credit abort completed", { handle, state: entry.state });
}
