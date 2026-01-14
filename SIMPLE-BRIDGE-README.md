# Simple Bridge

This is a simplified, agnostic bridge that receives requests, prints them, accepts them, and sends responses back to the ledger. It has no validation logic - it simply accepts all requests and responds with success.

## Features

- **No validation**: Accepts all requests without checking accounts, balances, or any business logic
- **Two separate processes**: One for debits, one for credits
- **Simple logging**: Prints all incoming requests in a clear format
- **Automatic responses**: Always responds with success states to the ledger

## Running the Bridge

### Option 1: Run both processes together
```bash
npm run start:both
```

This will start:
- Debit bridge on port 3001
- Credit bridge on port 3002

### Option 2: Run processes separately

**Debit bridge:**
```bash
npm run start:debit
```
Runs on port 3001 (or specify a different port: `npm run start:debit 4001`)

**Credit bridge:**
```bash
npm run start:credit
```
Runs on port 3002 (or specify a different port: `npm run start:credit 4002`)

## Endpoints

### Debit Bridge (port 3001)
- `POST /api/v2/debits` - Prepare debit
- `POST /api/v2/debits/:handle/commit` - Commit debit
- `POST /api/v2/debits/:handle/abort` - Abort debit

### Credit Bridge (port 3002)
- `POST /api/v2/credits` - Prepare credit
- `POST /api/v2/credits/:handle/commit` - Commit credit
- `POST /api/v2/credits/:handle/abort` - Abort credit

## How It Works

1. **Receives request**: The bridge receives a request from the ledger
2. **Prints request**: The full request body is printed to the console in a formatted way
3. **Accepts immediately**: Returns HTTP 202 (Accepted) immediately
4. **Processes**: Sets the action state to success (prepared/committed/aborted)
5. **Notifies ledger**: Sends the response back to the ledger

## Configuration

Configure the ledger to send:
- Debit requests to the debit bridge (port 3001)
- Credit requests to the credit bridge (port 3002)

The bridge uses the same ledger configuration as before (see `src/ledger.js` for ledger and key configuration).

## Differences from Original Bridge

- ❌ No account validation
- ❌ No balance checks
- ❌ No core ledger logic (Account, Transaction classes)
- ❌ No validation of entity signatures (still accepts them but doesn't validate)
- ✅ Simple request/response flow
- ✅ Always succeeds
- ✅ Two separate processes for debit and credit
