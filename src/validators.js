// Populate this with the wallet handle you created
const BANK_WALLET = "alianza"; //this is the target wallet

// Factor for usd is 100
const USD_FACTOR = 100;

// Address regex used for validation and component extraction
const ADDRESS_REGEX =
  /^(((?<schema>[a-zA-Z0-9_\-+.]+):)?(?<handle>[a-zA-Z0-9_\-+.]+))(@(?<parent>[a-zA-Z0-9_\-+.]+))?$/;

export function validateEntity(entity, signer) {}

export function extractAndValidateAddress(address, BANK_WALLET_OVERRIDE) {
  const result = ADDRESS_REGEX.exec(address);
  if (!result) {
    throw new Error(`Invalid address, got ${address}`);
  }
  const { schema, handle: account, parent } = result.groups;
  console.log("account", account);
  console.log("parent", parent);
  console.log("schema", schema);

  const expectedWallet = BANK_WALLET_OVERRIDE || BANK_WALLET;
  if (parent !== expectedWallet) {
    throw new Error(
      `Expected address parent to be ${expectedWallet}, got ${parent}`
    );
  }
  if (schema !== "svgs") {
    throw new Error(`Expected address schema to be account, got ${schema}`);
  }
  if (!account || account.length === 0) {
    throw new Error("Account missing from credit request");
  }

  return {
    schema,
    account,
    parent,
  };
}

export function extractAndValidateAmount(rawAmount) {
  console.log(`[VALIDATOR] Raw amount received:`, rawAmount, typeof rawAmount);

  const amount = Number(rawAmount);
  console.log(`[VALIDATOR] Converted to number:`, amount);

  // Handle negative amounts for debits (ledger might send negative values)
  const absoluteAmount = Math.abs(amount);
  console.log(`[VALIDATOR] Absolute amount:`, absoluteAmount);

  if (!Number.isInteger(absoluteAmount) || absoluteAmount <= 0) {
    throw new Error(`Positive integer amount expected, got ${amount}`);
  }

  const finalAmount = absoluteAmount / USD_FACTOR;
  console.log(
    `[VALIDATOR] Final amount after division by ${USD_FACTOR}:`,
    finalAmount
  );

  return finalAmount;
}

export function extractAndValidateSymbol(symbol) {
  // In general symbols other than usd are possible, but
  // we only support usd in the tutorial
  if (symbol !== "cop") {
    throw new Error(`Symbol usd expected, got ${symbol}`);
  }
  return symbol;
}

export function validateAction(action, expected) {
  if (action !== expected) {
    throw new Error(`Action ${expected} expected, got ${action}`);
  }
}

export function validateSchema(schema, expected) {
  if (schema !== expected) {
    throw new Error(`Schema ${expected} expected, got ${schema}`);
  }
}

export function extractAndValidateData({ entry, schema, walletOverride }) {
  const data = entry?.data;

  validateSchema(data?.schema, schema);

  const rawAddress =
    data?.schema === "credit" ? data.target.handle : data.source.handle;
  const address = extractAndValidateAddress(rawAddress, walletOverride);
  const amount = extractAndValidateAmount(data.amount);
  const symbol = extractAndValidateSymbol(data.symbol.handle);

  return {
    address,
    amount,
    symbol,
  };
}
