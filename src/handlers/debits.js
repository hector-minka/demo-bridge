import core from "../core.js";
import { ledgerSigner, notifyDebitLedger } from "../ledger.js";
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

export async function prepareDebit(req, res) {
  const action = "prepare";
  console.log(
    `[DEBIT-PREPARE] Starting prepare debit request for handle: ${
      req.body?.handle || "unknown"
    }`
  );

  let { alreadyRunning, entry } = await beginActionNew({
    request: req,
    action,
  });

  console.log(
    `[DEBIT-PREPARE] Action already running: ${alreadyRunning}, Entry ID: ${
      entry?.id || "unknown"
    }`
  );

  res.sendStatus(202);
  console.log(
    `[DEBIT-PREPARE] Sent 202 response for handle: ${
      entry?.handle || "unknown"
    }`
  );

  if (!alreadyRunning) {
    console.log(
      `[DEBIT-PREPARE] Processing new debit preparation for handle: ${entry?.handle}`
    );
    await processPrepareDebit(entry);
    console.log(
      `[DEBIT-PREPARE] Completed processing, ending action for handle: ${entry?.handle}`
    );

    // Wait for user input before continuing (for verification)
    console.log(
      `\n[DEBIT-PREPARE] Processing completed for handle: ${entry.handle}`
    );
    console.log(
      `[DEBIT-PREPARE] Account: ${entry.account}, Amount: ${entry.amount}, Symbol: ${entry.symbol}`
    );
    console.log(
      `[DEBIT-PREPARE] Action state: ${
        entry.actions[entry.processingAction]?.state
      }`
    );
    console.log(
      `[DEBIT-PREPARE] Core transaction ID: ${
        entry.actions[entry.processingAction]?.coreId
      }`
    );

    console.log(`[DEBIT-PREPARE] About to call waitForInput...`);
    await waitForInput(
      `\n[DEBIT-PREPARE] Press Enter to continue with notification to ledger...`
    );
    console.log(`[DEBIT-PREPARE] waitForInput completed, continuing...`);

    await endAction(entry);
  } else {
    console.log(
      `[DEBIT-PREPARE] Skipping processing as action already running for handle: ${entry?.handle}`
    );
  }

  console.log(
    `[DEBIT-PREPARE] Notifying ledger for handle: ${entry?.handle}, action: ${action}`
  );
  await notifyDebitLedger(entry, action, ["prepared", "failed"]);
  console.log(
    `[DEBIT-PREPARE] Completed prepare debit flow for handle: ${entry?.handle}`
  );
}

async function processPrepareDebit(entry) {
  const action = entry.actions[entry.processingAction];
  let transaction;

  console.log(
    `[DEBIT-PREPARE-PROCESS] Starting debit preparation processing for handle: ${entry.handle}`
  );
  console.log(
    `[DEBIT-PREPARE-PROCESS] Processing action: ${action.action}, Action ID: ${entry.processingAction}`
  );

  try {
    console.log(
      `[DEBIT-PREPARE-PROCESS] Validating entity hash and data for handle: ${entry.handle}`
    );
    validateEntity(
      { hash: entry.hash, data: entry.data, meta: entry.meta },
      ledgerSigner
    );
    console.log(
      `[DEBIT-PREPARE-PROCESS] Entity validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-PREPARE-PROCESS] Validating intent data for handle: ${entry.handle}`
    );
    validateEntity(entry.data?.intent);
    console.log(
      `[DEBIT-PREPARE-PROCESS] Intent validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-PREPARE-PROCESS] Validating action for handle: ${entry.handle}`
    );
    validateAction(action.action, entry.processingAction);
    console.log(
      `[DEBIT-PREPARE-PROCESS] Action validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-PREPARE-PROCESS] Extracting and validating debit data for handle: ${entry.handle}`
    );

    // Debug: Log raw entry data
    console.log(
      `[DEBIT-PREPARE-PROCESS] Raw entry data:`,
      JSON.stringify(entry.data, null, 2)
    );
    console.log(
      `[DEBIT-PREPARE-PROCESS] Raw amount from data:`,
      entry.data.amount
    );

    const { address, symbol, amount } = extractAndValidateData({
      entry,
      schema: "debit",
      walletOverride: "ach",
    });
    console.log(
      `[DEBIT-PREPARE-PROCESS] Extracted data - Account: ${address.account}, Symbol: ${symbol}, Amount: ${amount}`
    );

    entry.schema = "debit";
    entry.account = address.account;
    entry.symbol = symbol;
    entry.amount = amount;
    console.log(
      `[DEBIT-PREPARE-PROCESS] Updated entry with debit schema and account details`
    );

    console.log(
      `[DEBIT-PREPARE-PROCESS] Updating entry in persistence for handle: ${entry.handle}`
    );
    await updateEntry(entry);
    console.log(`[DEBIT-PREPARE-PROCESS] Entry updated successfully`);

    console.log(
      `[DEBIT-PREPARE-PROCESS] Saving intent for handle: ${entry.handle}`
    );
    await saveIntent(entry.data.intent);
    console.log(`[DEBIT-PREPARE-PROCESS] Intent saved successfully`);

    // Process the entry
    // Prepare for debit needs to check if the account exists, is active and hold the funds.
    // Since the core will throw an Error if the amount can not be put on hold for any reason, we
    // can try to hold the amount and catch the Error.
    console.log(
      `[DEBIT-PREPARE-PROCESS] Attempting to hold funds - Account: ${entry.account}, Amount: ${entry.amount}, Handle: ${entry.handle}-hold`
    );
    transaction = core.hold(
      Number(entry.account),
      entry.amount,
      `${entry.handle}-hold`
    );
    action.coreId = transaction.id.toString();
    console.log(
      `[DEBIT-PREPARE-PROCESS] Hold transaction created with ID: ${transaction.id}, Status: ${transaction.status}`
    );

    if (transaction.status !== "COMPLETED") {
      console.error(
        `[DEBIT-PREPARE-PROCESS] Hold transaction failed - Status: ${transaction.status}, Error: ${transaction.errorReason}`
      );
      throw new Error(transaction.errorReason);
    }

    console.log(
      `[DEBIT-PREPARE-PROCESS] Hold transaction completed successfully`
    );
    action.state = "prepared";
    console.log(
      `[DEBIT-PREPARE-PROCESS] Debit preparation completed successfully for handle: ${entry.handle}`
    );
  } catch (error) {
    console.error(
      `[DEBIT-PREPARE-PROCESS] Error processing debit preparation for handle: ${entry.handle}`
    );
    console.error(`[DEBIT-PREPARE-PROCESS] Error details:`, {
      message: error.message,
      stack: error.stack,
      handle: entry.handle,
      account: entry.account,
      amount: entry.amount,
    });
    action.state = "failed";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
    console.log(
      `[DEBIT-PREPARE-PROCESS] Set action state to failed for handle: ${entry.handle}`
    );
  }
}

export async function commitDebit(req, res) {
  const action = "commit";
  console.log(
    `[DEBIT-COMMIT] Starting commit debit request for handle: ${
      req.body?.handle || "unknown"
    }`
  );

  let { alreadyRunning, entry } = await beginActionExisting({
    request: req,
    action,
    previousStates: ["prepared"],
  });

  console.log(
    `[DEBIT-COMMIT] Action already running: ${alreadyRunning}, Entry ID: ${
      entry?.id || "unknown"
    }`
  );

  res.sendStatus(202);
  console.log(
    `[DEBIT-COMMIT] Sent 202 response for handle: ${entry?.handle || "unknown"}`
  );

  if (!alreadyRunning) {
    console.log(
      `[DEBIT-COMMIT] Processing new debit commit for handle: ${entry?.handle}`
    );
    await processCommitDebit(entry);
    console.log(
      `[DEBIT-COMMIT] Completed processing, ending action for handle: ${entry?.handle}`
    );
    await endAction(entry);
  } else {
    console.log(
      `[DEBIT-COMMIT] Skipping processing as action already running for handle: ${entry?.handle}`
    );
  }

  console.log(
    `[DEBIT-COMMIT] Notifying ledger for handle: ${entry?.handle}, action: ${action}`
  );
  await notifyDebitLedger(entry, action, ["committed"]);
  console.log(
    `[DEBIT-COMMIT] Completed commit debit flow for handle: ${entry?.handle}`
  );
}

async function processCommitDebit(entry) {
  const action = entry.actions[entry.processingAction];
  let transaction;

  console.log(
    `[DEBIT-COMMIT-PROCESS] Starting debit commit processing for handle: ${entry.handle}`
  );
  console.log(
    `[DEBIT-COMMIT-PROCESS] Processing action: ${action.action}, Action ID: ${entry.processingAction}`
  );
  console.log(
    `[DEBIT-COMMIT-PROCESS] Account: ${entry.account}, Amount: ${entry.amount}`
  );

  try {
    console.log(
      `[DEBIT-COMMIT-PROCESS] Validating entity hash and data for handle: ${entry.handle}`
    );
    validateEntity(
      { hash: action.hash, data: action.data, meta: action.meta },
      ledgerSigner
    );
    console.log(
      `[DEBIT-COMMIT-PROCESS] Entity validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-COMMIT-PROCESS] Validating action for handle: ${entry.handle}`
    );
    validateAction(action.action, entry.processingAction);
    console.log(
      `[DEBIT-COMMIT-PROCESS] Action validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-COMMIT-PROCESS] Releasing held funds - Account: ${entry.account}, Amount: ${entry.amount}, Handle: ${entry.handle}-release`
    );
    transaction = core.release(
      Number(entry.account),
      entry.amount,
      `${entry.handle}-release`
    );
    action.coreId = transaction.id.toString();
    console.log(
      `[DEBIT-COMMIT-PROCESS] Release transaction created with ID: ${transaction.id}, Status: ${transaction.status}`
    );

    if (transaction.status !== "COMPLETED") {
      console.error(
        `[DEBIT-COMMIT-PROCESS] Release transaction failed - Status: ${transaction.status}, Error: ${transaction.errorReason}`
      );
      throw new Error(transaction.errorReason);
    }
    console.log(
      `[DEBIT-COMMIT-PROCESS] Release transaction completed successfully`
    );

    console.log(
      `[DEBIT-COMMIT-PROCESS] Processing actual debit - Account: ${entry.account}, Amount: ${entry.amount}, Handle: ${entry.handle}-debit`
    );
    transaction = core.debit(
      Number(entry.account),
      entry.amount,
      `${entry.handle}-debit`
    );
    action.coreId = transaction.id.toString();
    console.log(
      `[DEBIT-COMMIT-PROCESS] Debit transaction created with ID: ${transaction.id}, Status: ${transaction.status}`
    );

    if (transaction.status !== "COMPLETED") {
      console.error(
        `[DEBIT-COMMIT-PROCESS] Debit transaction failed - Status: ${transaction.status}, Error: ${transaction.errorReason}`
      );
      throw new Error(transaction.errorReason);
    }
    console.log(
      `[DEBIT-COMMIT-PROCESS] Debit transaction completed successfully`
    );

    action.state = "committed";
    console.log(
      `[DEBIT-COMMIT-PROCESS] Debit commit completed successfully for handle: ${entry.handle}`
    );
  } catch (error) {
    console.error(
      `[DEBIT-COMMIT-PROCESS] Error processing debit commit for handle: ${entry.handle}`
    );
    console.error(`[DEBIT-COMMIT-PROCESS] Error details:`, {
      message: error.message,
      stack: error.stack,
      handle: entry.handle,
      account: entry.account,
      amount: entry.amount,
    });
    action.state = "error";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
    console.log(
      `[DEBIT-COMMIT-PROCESS] Set action state to error for handle: ${entry.handle}`
    );
  }
}

export async function abortDebit(req, res) {
  const action = "abort";
  console.log(
    `[DEBIT-ABORT] Starting abort debit request for handle: ${
      req.body?.handle || "unknown"
    }`
  );

  let { alreadyRunning, entry } = await beginActionExisting({
    request: req,
    action,
    previousStates: ["prepared", "failed"],
  });

  console.log(
    `[DEBIT-ABORT] Action already running: ${alreadyRunning}, Entry ID: ${
      entry?.id || "unknown"
    }`
  );

  res.sendStatus(202);
  console.log(
    `[DEBIT-ABORT] Sent 202 response for handle: ${entry?.handle || "unknown"}`
  );

  if (!alreadyRunning) {
    console.log(
      `[DEBIT-ABORT] Processing new debit abort for handle: ${entry?.handle}`
    );
    await processAbortDebit(entry);
    console.log(
      `[DEBIT-ABORT] Completed processing, ending action for handle: ${entry?.handle}`
    );
    await endAction(entry);
  } else {
    console.log(
      `[DEBIT-ABORT] Skipping processing as action already running for handle: ${entry?.handle}`
    );
  }

  console.log(
    `[DEBIT-ABORT] Notifying ledger for handle: ${entry?.handle}, action: ${action}`
  );
  await notifyDebitLedger(entry, action, ["aborted"]);
  console.log(
    `[DEBIT-ABORT] Completed abort debit flow for handle: ${entry?.handle}`
  );
}

async function processAbortDebit(entry) {
  const action = entry.actions[entry.processingAction];
  let transaction;

  console.log(
    `[DEBIT-ABORT-PROCESS] Starting debit abort processing for handle: ${entry.handle}`
  );
  console.log(
    `[DEBIT-ABORT-PROCESS] Processing action: ${action.action}, Action ID: ${entry.processingAction}`
  );
  console.log(
    `[DEBIT-ABORT-PROCESS] Previous state: ${entry.previousState}, Account: ${entry.account}, Amount: ${entry.amount}`
  );

  try {
    console.log(
      `[DEBIT-ABORT-PROCESS] Validating entity hash and data for handle: ${entry.handle}`
    );
    validateEntity(
      { hash: action.hash, data: action.data, meta: action.meta },
      ledgerSigner
    );
    console.log(
      `[DEBIT-ABORT-PROCESS] Entity validation passed for handle: ${entry.handle}`
    );

    console.log(
      `[DEBIT-ABORT-PROCESS] Validating action for handle: ${entry.handle}`
    );
    validateAction(action.action, entry.processingAction);
    console.log(
      `[DEBIT-ABORT-PROCESS] Action validation passed for handle: ${entry.handle}`
    );

    if (entry.previousState === "prepared") {
      console.log(
        `[DEBIT-ABORT-PROCESS] Previous state was 'prepared', releasing held funds - Account: ${entry.account}, Amount: ${entry.amount}, Handle: ${entry.handle}-release`
      );
      transaction = core.release(
        Number(entry.account),
        entry.amount,
        `${entry.handle}-release`
      );
      action.coreId = transaction.id.toString();
      console.log(
        `[DEBIT-ABORT-PROCESS] Release transaction created with ID: ${transaction.id}, Status: ${transaction.status}`
      );

      if (transaction.status !== "COMPLETED") {
        console.error(
          `[DEBIT-ABORT-PROCESS] Release transaction failed - Status: ${transaction.status}, Error: ${transaction.errorReason}`
        );
        throw new Error(transaction.errorReason);
      }
      console.log(
        `[DEBIT-ABORT-PROCESS] Release transaction completed successfully`
      );
    } else {
      console.log(
        `[DEBIT-ABORT-PROCESS] Previous state was '${entry.previousState}', no funds to release`
      );
    }

    action.state = "aborted";
    console.log(
      `[DEBIT-ABORT-PROCESS] Debit abort completed successfully for handle: ${entry.handle}`
    );
  } catch (error) {
    console.error(
      `[DEBIT-ABORT-PROCESS] Error processing debit abort for handle: ${entry.handle}`
    );
    console.error(`[DEBIT-ABORT-PROCESS] Error details:`, {
      message: error.message,
      stack: error.stack,
      handle: entry.handle,
      account: entry.account,
      amount: entry.amount,
      previousState: entry.previousState,
    });
    action.state = "error";
    action.error = {
      reason: "bridge.unexpected-error",
      detail: error.message,
      failId: undefined,
    };
    console.log(
      `[DEBIT-ABORT-PROCESS] Set action state to error for handle: ${entry.handle}`
    );
  }
}
