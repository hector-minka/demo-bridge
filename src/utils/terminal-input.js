import readline from "readline";

// Try to load environment variables from .env file (optional)
// Using dynamic import to handle cases where dotenv might not be installed
(async () => {
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch (e) {
    // dotenv not installed or .env file doesn't exist, that's okay
  }
})();

/**
 * Gets the force interactive setting - defaults to true unless explicitly disabled
 */
function getForceInteractive() {
  // If explicitly set to false, disable interactive mode
  if (process.env.FORCE_INTERACTIVE === "false") {
    return false;
  }
  
  // If explicitly set to true/1, enable interactive mode
  if (
    process.env.FORCE_INTERACTIVE === "true" || 
    process.env.FORCE_INTERACTIVE === "1" ||
    process.env.FORCE_INTERACTIVE?.toLowerCase() === "true"
  ) {
    return true;
  }
  
  // Default to true (interactive mode enabled by default)
  return true;
}

/**
 * Waits for user input in the terminal before continuing
 * @param {string} message - The message to display to the user
 * @param {string} defaultValue - Default value if user just presses Enter
 * @returns {Promise<string>} The user's input or default value
 */
export async function waitForInput(
  message = "Press Enter to continue...",
  defaultValue = ""
) {
  // Check if terminal input is disabled via environment variable
  if (process.env.DISABLE_TERMINAL_INPUT === "true") {
    console.log(
      `[TERMINAL-INPUT] Terminal input disabled via DISABLE_TERMINAL_INPUT=true`
    );
    console.log(`[TERMINAL-INPUT] Continuing automatically...`);
    return defaultValue;
  }

  // Force interactive mode - defaults to true
  const forceInteractive = getForceInteractive();
  
  // Check if we're in a non-interactive environment
  // Note: stdin.isTTY can be undefined in some environments, treat undefined as false
  const stdinTTY = process.stdin.isTTY === true;
  const stdoutTTY = process.stdout.isTTY === true;
  const isTTY = stdinTTY && stdoutTTY;
  
  if (!forceInteractive && !isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(
      `[TERMINAL-INPUT] Tip: Set FORCE_INTERACTIVE=true to force interactive mode`
    );
    console.log(`[TERMINAL-INPUT] Continuing automatically...`);
    return defaultValue;
  }

  if (forceInteractive) {
    // Ensure stdin is readable even if not TTY
    if (!process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      process.stdin.resume();
    }
  }

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: forceInteractive || isTTY, // Use terminal mode if forced or TTY
      });

      // Don't pass message to rl.question since logger.prompt already displayed it
      // Just wait for Enter
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim() || defaultValue);
      });
    } catch (error) {
      console.error(
        `[TERMINAL-INPUT] Error creating readline interface:`,
        error
      );
      console.log(`[TERMINAL-INPUT] Continuing automatically due to error...`);
      resolve(defaultValue);
    }
  });
}

/**
 * Waits for user confirmation (y/n) before continuing
 * @param {string} message - The message to display to the user
 * @param {boolean} defaultValue - Default value if user just presses Enter
 * @returns {Promise<boolean>} True if user confirms, false otherwise
 */
export async function waitForConfirmation(
  message = "Continue? (y/n): ",
  defaultValue = true
) {
  // Check if terminal input is disabled via environment variable
  if (process.env.DISABLE_TERMINAL_INPUT === "true") {
    console.log(
      `[TERMINAL-INPUT] Terminal input disabled via DISABLE_TERMINAL_INPUT=true`
    );
    console.log(
      `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
    );
    return defaultValue;
  }

  // Force interactive mode - defaults to true
  const forceInteractive = getForceInteractive();
  
  // Check if we're in a non-interactive environment
  // Note: stdin.isTTY can be undefined in some environments, treat undefined as false
  const stdinTTY = process.stdin.isTTY === true;
  const stdoutTTY = process.stdout.isTTY === true;
  const isTTY = stdinTTY && stdoutTTY;
  
  if (!forceInteractive && !isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(
      `[TERMINAL-INPUT] Tip: Set FORCE_INTERACTIVE=true to force interactive mode`
    );
    console.log(
      `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
    );
    return defaultValue;
  }

  if (forceInteractive) {
    // Ensure stdin is readable even if not TTY
    if (!process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      process.stdin.resume();
    }
  }

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: forceInteractive || isTTY,
      });

      // Use a timeout to detect if readline is not actually waiting
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          // If we haven't received input after a short delay, readline might not be working
          // This can happen when stdin is not a TTY
          console.log("\n[TERMINAL-INPUT] Waiting for input...");
        }
      }, 100);

      // Don't pass message to rl.question since logger.prompt already displayed it
      // Just wait for the answer
      rl.question("", (answer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          rl.close();
          const normalizedAnswer = answer.trim().toLowerCase();

          if (normalizedAnswer === "") {
            resolve(defaultValue);
          } else if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
            resolve(true);
          } else if (normalizedAnswer === "n" || normalizedAnswer === "no") {
            resolve(false);
          } else {
            // If invalid input, ask again (but don't show prompt again)
            console.log("Please enter y/yes or n/no");
            waitForConfirmation("", defaultValue).then(resolve);
          }
        }
      });

      // If readline resolves immediately with empty string (common when stdin is not TTY),
      // we need to manually wait for input
      if (!isTTY && forceInteractive) {
        // Set up a manual listener as backup
        const onData = (data) => {
          if (!resolved) {
            const char = data.toString().trim().toLowerCase();
            if (char === 'y' || char === 'yes') {
              resolved = true;
              clearTimeout(timeout);
              process.stdin.removeListener('data', onData);
              rl.close();
              resolve(true);
            } else if (char === 'n' || char === 'no') {
              resolved = true;
              clearTimeout(timeout);
              process.stdin.removeListener('data', onData);
              rl.close();
              resolve(false);
            } else if (char === '' || char === '\n' || char === '\r') {
              resolved = true;
              clearTimeout(timeout);
              process.stdin.removeListener('data', onData);
              rl.close();
              resolve(defaultValue);
            }
          }
        };
        process.stdin.on('data', onData);
      }
    } catch (error) {
      console.error(
        `[TERMINAL-INPUT] Error creating readline interface:`,
        error
      );
      console.log(
        `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
      );
      resolve(defaultValue);
    }
  });
}

/**
 * Waits for user input with a timeout
 * @param {string} message - The message to display to the user
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} defaultValue - Default value if timeout or no input
 * @returns {Promise<string>} The user's input or default value
 */
export async function waitForInputWithTimeout(
  message = "Press Enter to continue...",
  timeoutMs = 30000,
  defaultValue = ""
) {
  // Check if terminal input is disabled via environment variable
  if (process.env.DISABLE_TERMINAL_INPUT === "true") {
    console.log(
      `[TERMINAL-INPUT] Terminal input disabled via DISABLE_TERMINAL_INPUT=true`
    );
    console.log(
      `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
    );
    return defaultValue;
  }

  // Force interactive mode - defaults to true
  const forceInteractive = getForceInteractive();
  
  // Check if we're in a non-interactive environment
  const stdinTTY = process.stdin.isTTY === true;
  const stdoutTTY = process.stdout.isTTY === true;
  const isTTY = stdinTTY && stdoutTTY;
  
  if (!forceInteractive && !isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(
      `[TERMINAL-INPUT] Tip: Set FORCE_INTERACTIVE=true to force interactive mode`
    );
    console.log(
      `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
    );
    return defaultValue;
  }

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: forceInteractive || isTTY,
      });
      let resolved = false;

      // Set timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          rl.close();
          console.log(
            `\nTimeout reached (${timeoutMs}ms), continuing with default value...`
          );
          resolve(defaultValue);
        }
      }, timeoutMs);

      rl.question(message, (answer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          rl.close();
          resolve(answer.trim() || defaultValue);
        }
      });
    } catch (error) {
      console.error(
        `[TERMINAL-INPUT] Error creating readline interface:`,
        error
      );
      console.log(
        `[TERMINAL-INPUT] Auto-${defaultValue ? 'ACCEPTING' : 'REJECTING'} (default: ${defaultValue ? 'YES' : 'NO'})`
      );
      resolve(defaultValue);
    }
  });
}
