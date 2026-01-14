import core from "../core.js";
import { ledgerSigner, notifyCreditLedger } from "../ledger.js";
import { updateEntry } from "../persistence.js";
import { waitForInput } from "../utils/terminal-input.js";
import {
  extractAndValidateData,
  validateAction,
  validateEntity,
} from "../validators.js";
import {
  beginActionExisting,
  beginActionNew,
  endAction,
  saveIntent,
} from "./common.js";

export async function prepareCredit(req, res) {
  const action = "prepare";

  // Begin Action processing for new Entry which will also save it.
  let { alreadyRunning, entry } = await beginActionNew({
    request: req,
    action,
  });

  // The Entry is already saved, so we can return 202 Accepted
  // to Ledger so that it stops redelivering the Action.
  res.sendStatus(202);

  // If the Action is already being processed, skip processing.
  if (!alreadyRunning) {
    await processPrepareCredit(entry);

    // Wait for user input before continuing (for verification)
    console.log(
      `\n[CREDIT-PREPARE] Processing completed for handle: ${entry.handle}`
    );
    console.log(
      `[CREDIT-PREPARE] Account: ${entry.account}, Amount: ${entry.amount}, Symbol: ${entry.symbol}`
    );
    console.log(
      `[CREDIT-PREPARE] Action state: ${
        entry.actions[entry.processingAction]?.state
      }`
    );

    await waitForInput(
      `\n[CREDIT-PREPARE] Press Enter to continue with notification to ledger...`
    );

    // Stop Action processing and save the result.
    await endAction(entry);
  }

  // If Entry is in final state, return the result to Ledger
  await notifyCreditLedger(entry, action, ["prepared", "failed"]);
  console.log(
    `[CREDIT-PREPARE] Completed prepare credit flow for handle: ${entry?.handle}`
  );
}

async function processPrepareCredit(entry) {
  const action = entry.actions[entry.processingAction];
  try {
    // Parse data from the Entry and validate it.
    validateEntity(
      { hash: entry.hash, data: entry.data, meta: entry.meta },
      ledgerSigner
    );
    validateEntity(entry.data?.intent);
    validateAction(action.action, entry.processingAction);

    const { address, symbol, amount } = extractAndValidateData({
      entry,
      schema: "credit",
    });

    // Save extracted data into Entry, we will need this for other Actions.
    entry.schema = "credit";
    entry.account = address.account;
    entry.symbol = symbol;
    entry.amount = amount;

    // Save Entry.
    await updateEntry(entry);

    // Save Intent from Entry.
    await saveIntent(entry.data.intent);

    // Processing prepare Action for Credit Entry in the core is simple and
    // only checks if the account exists and is active. If something is wrong,
    // an Error will be thrown, and we will catch it later.
    const coreAccount = core.getAccount(Number(entry.account));
    coreAccount.assertIsActive();

    action.state = "prepared";
  } catch (error) {
    console.log(error);
    action.state = "failed";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
  }
}

export async function commitCredit(req, res) {
  const action = "commit";
  let { alreadyRunning, entry } = await beginActionExisting({
    request: req,
    action,
    previousStates: ["prepared"],
  });

  res.sendStatus(202);

  if (!alreadyRunning) {
    await processCommitCredit(entry);
    await endAction(entry);
  }

  await notifyCreditLedger(entry, action, ["committed"]);
}

async function processCommitCredit(entry) {
  const action = entry.actions[entry.processingAction];
  let transaction;
  try {
    validateEntity(
      { hash: action.hash, data: action.data, meta: action.meta },
      ledgerSigner
    );
    validateAction(action.action, entry.processingAction);

    transaction = core.credit(
      Number(entry.account),
      entry.amount,
      `${entry.handle}-credit`
    );
    action.coreId = transaction.id.toString();

    if (transaction.status !== "COMPLETED") {
      throw new Error(transaction.errorReason);
    }

    action.state = "committed";
  } catch (error) {
    console.log(error);
    action.state = "error";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
  }
}

export async function abortCredit(req, res) {
  const action = "abort";
  let { alreadyRunning, entry } = await beginActionExisting({
    request: req,
    action,
    previousStates: ["prepared", "failed"],
  });

  res.sendStatus(202);

  if (!alreadyRunning) {
    await processAbortCredit(entry);
    await endAction(entry);
  }

  await notifyCreditLedger(entry, action, ["aborted"]);
}

async function processAbortCredit(entry) {
  const action = entry.actions[entry.processingAction];
  try {
    validateEntity(
      { hash: action.hash, data: action.data, meta: action.meta },
      ledgerSigner
    );
    validateAction(action.action, entry.processingAction);

    action.state = "aborted";
  } catch (error) {
    console.log(error);
    action.state = "error";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
  }
}
