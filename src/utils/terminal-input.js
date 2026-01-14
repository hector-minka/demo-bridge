import readline from "readline";

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

  // Check if we're in a non-interactive environment
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(`[TERMINAL-INPUT] Continuing automatically...`);
    return defaultValue;
  }

  console.log(`[TERMINAL-INPUT] Starting wait for input: "${message}"`);

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(
        `[TERMINAL-INPUT] Readline interface created, waiting for input...`
      );

      rl.question(message, (answer) => {
        console.log(`[TERMINAL-INPUT] Received input: "${answer}"`);
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
      `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
    );
    return defaultValue;
  }

  // Check if we're in a non-interactive environment
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(
      `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
    );
    return defaultValue;
  }

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(message, (answer) => {
        rl.close();
        const normalizedAnswer = answer.trim().toLowerCase();

        if (normalizedAnswer === "") {
          resolve(defaultValue);
        } else if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
          resolve(true);
        } else if (normalizedAnswer === "n" || normalizedAnswer === "no") {
          resolve(false);
        } else {
          // If invalid input, ask again
          console.log("Please enter y/yes or n/no");
          waitForConfirmation(message, defaultValue).then(resolve);
        }
      });
    } catch (error) {
      console.error(
        `[TERMINAL-INPUT] Error creating readline interface:`,
        error
      );
      console.log(
        `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
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
      `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
    );
    return defaultValue;
  }

  // Check if we're in a non-interactive environment
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(
      `[TERMINAL-INPUT] Non-interactive environment detected (not TTY)`
    );
    console.log(
      `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
    );
    return defaultValue;
  }

  return new Promise((resolve) => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
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
        `[TERMINAL-INPUT] Continuing automatically with default: ${defaultValue}`
      );
      resolve(defaultValue);
    }
  });
}
