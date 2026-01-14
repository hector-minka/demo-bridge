# Simple Bridge

This is a simplified, agnostic bridge that receives requests, prints them, accepts them, and sends responses back to the ledger. It has no validation logic - it simply accepts all requests and responds with success.

## Features

-   **No validation**: Accepts all requests without checking accounts, balances, or any business logic
-   **Two separate processes**: One for debits, one for credits
-   **Simple logging**: Prints all incoming requests in a clear format
-   **Automatic responses**: Always responds with success states to the ledger

## Running the Bridge

### Option 1: Run both processes together

```bash
npm run start:both
```

This will start:

-   Debit bridge on port 3000
-   Credit bridge on port 3001

### Option 2: Run processes separately

Preferably for demostration purposes, using one terminal for `debits` and another for `credits`

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

-   `POST /api/v2/debits` - Prepare debit
-   `POST /api/v2/debits/:handle/commit` - Commit debit
-   `POST /api/v2/debits/:handle/abort` - Abort debit

### Credit Bridge (port 3002)

-   `POST /api/v2/credits` - Prepare credit
-   `POST /api/v2/credits/:handle/commit` - Commit credit
-   `POST /api/v2/credits/:handle/abort` - Abort credit

## How It Works

1. **Receives request**: The bridge receives a request from the ledger
2. **Prints request**: The full request body is printed to the console in a formatted way
3. **Accepts immediately**: Returns HTTP 202 (Accepted) immediately
4. **Processes**: Sets the action state to success (prepared/committed/aborted)
5. **Notifies ledger**: Sends the response back to the ledger

## Interactive Mode

The bridge supports interactive prompts to accept/reject operations. By default, it will prompt you for:

-   **Prepare/Abort operations**: Accept (y) or Reject (n)
-   **Commit operations**: Press Enter to confirm

### Making the Environment Interactive

The bridge detects if it's running in an interactive terminal. If you see "Non-interactive environment detected", you can:

**Option 1: Run in a regular terminal**

```bash
# Make sure you're running directly in a terminal (not through an IDE's integrated terminal)
npm run start:debit
```

**Option 2: Force interactive mode**

```bash
# Set environment variable to force interactive mode
FORCE_INTERACTIVE=true npm run start:debit
```

**Option 3: Disable interactive prompts**

```bash
# Auto-accept all operations (useful for CI/CD)
DISABLE_TERMINAL_INPUT=true npm run start:debit
```

### Environment Variables

-   `FORCE_INTERACTIVE=true` - Forces interactive mode even if TTY is not detected
-   `DISABLE_TERMINAL_INPUT=true` - Disables all prompts and auto-accepts operations

## Configuration

Configure the ledger to send:

-   Debit requests to the debit bridge (port 3000)
-   Credit requests to the credit bridge (port 3001)

The bridge uses the same ledger configuration as before (see `src/ledger.js` for ledger and key configuration).

## Differences from Original Bridge

-   ❌ No account validation
-   ❌ No balance checks
-   ❌ No core ledger logic (Account, Transaction classes)
-   ❌ No validation of entity signatures (still accepts them but doesn't validate)
-   ✅ Simple request/response flow
-   ✅ Always succeeds
-   ✅ Two separate processes for debit and credit
