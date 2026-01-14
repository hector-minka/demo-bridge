// Beautiful colored logger utility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

const symbols = {
  arrow: '→',
  check: '✓',
  cross: '✗',
  star: '★',
  circle: '●',
  diamond: '◆',
  triangle: '▲',
  doubleArrow: '⇒',
  lightning: '⚡',
  lock: '🔒',
  unlock: '🔓',
  send: '📤',
  receive: '📥',
};

function formatTime() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 23);
}

function formatHumanTime() {
  const now = new Date();
  // Format: "2026-01-14 17:30:45.123"
  return now.toISOString().replace('T', ' ').substring(0, 23);
}

function box(text, color = colors.cyan, width = 80) {
  const padding = Math.max(0, width - text.length - 4);
  const line = '═'.repeat(width - 2);
  return `${color}${colors.bright}╔${line}╗${colors.reset}\n` +
         `${color}${colors.bright}║ ${text}${' '.repeat(padding)} ║${colors.reset}\n` +
         `${color}${colors.bright}╚${line}╝${colors.reset}`;
}

function separator(char = '─', length = 80, color = colors.dim) {
  return `${color}${char.repeat(length)}${colors.reset}`;
}

export const logger = {
  // Request logging
  request(method, url, body = null) {
    const timestamp = formatHumanTime();
    console.log(`\n${box(`📥 ${method} ${url}`, colors.blue)}`);
    console.log(`${colors.blue}${colors.dim}  ⏰ ${timestamp}${colors.reset}`);
    if (body) {
      console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}`);
      console.log(`${colors.cyan}${JSON.stringify(body, null, 2)}${colors.reset}`);
      console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
    } else {
      console.log('');
    }
  },

  // Response logging
  response(status, message = '', data = null) {
    const statusColor = status >= 200 && status < 300 ? colors.green : 
                       status >= 400 ? colors.red : colors.yellow;
    const statusIcon = status >= 200 && status < 300 ? symbols.check : symbols.cross;
    
    console.log(`\n${box(`📤 Response ${statusIcon} ${status}`, statusColor)}`);
    if (message) {
      console.log(`${statusColor}${colors.bright}  ${symbols.arrow} ${message}${colors.reset}`);
    }
    if (data) {
      console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}`);
      console.log(`${colors.cyan}${JSON.stringify(data, null, 2)}${colors.reset}`);
      console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
    } else {
      console.log('');
    }
  },

  // Action logging
  action(action, handle, details = {}) {
    const actionColors = {
      prepare: colors.yellow,
      commit: colors.green,
      abort: colors.red,
    };
    const color = actionColors[action] || colors.cyan;
    const icons = {
      prepare: '⏳',
      commit: symbols.check,
      abort: symbols.cross,
    };
    const icon = icons[action] || symbols.star;
    
    console.log(`\n${color}${colors.bright}${symbols.diamond} ${icon} ${action.toUpperCase()} ${symbols.diamond}${colors.reset}`);
    console.log(`${color}${colors.dim}${separator('─', 78)}${colors.reset}`);
    console.log(`${color}${colors.bright}  Handle:${colors.reset} ${colors.white}${handle}${colors.reset}`);
    
    Object.entries(details).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`${color}${colors.bright}  ${key}:${colors.reset} ${colors.white}${value}${colors.reset}`);
      }
    });
    console.log(`${color}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
  },

  // State transition logging
  stateTransition(from, to, handle) {
    console.log(`\n${colors.magenta}${colors.bright}${symbols.doubleArrow} State Transition${colors.reset}`);
    console.log(`${colors.magenta}${colors.dim}${separator('─', 78)}${colors.reset}`);
    console.log(`${colors.magenta}  ${from || 'null'} ${symbols.arrow} ${to}${colors.reset}`);
    console.log(`${colors.magenta}  Handle: ${handle}${colors.reset}`);
    console.log(`${colors.magenta}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
  },

  // Ledger notification logging
  ledgerNotification(direction, handle, action, state, payload = null) {
    const dirColor = direction === 'send' ? colors.green : colors.blue;
    const dirIcon = direction === 'send' ? symbols.send : symbols.receive;
    
    console.log(`\n${box(`${dirIcon} ${direction.toUpperCase()} TO LEDGER`, dirColor)}`);
    console.log(`${dirColor}${colors.dim}${separator('─', 78)}${colors.reset}`);
    console.log(`${dirColor}${colors.bright}  ${symbols.lock} Handle:${colors.reset} ${colors.white}${handle}${colors.reset}`);
    console.log(`${dirColor}${colors.bright}  ${symbols.star} Action:${colors.reset} ${colors.white}${action}${colors.reset}`);
    console.log(`${dirColor}${colors.bright}  ${symbols.circle} State:${colors.reset} ${colors.white}${state}${colors.reset}`);
    console.log(`${dirColor}${colors.dim}${separator('─', 78)}${colors.reset}`);
    
    if (payload) {
      console.log(`${colors.cyan}${JSON.stringify(payload, null, 2)}${colors.reset}`);
      console.log(`${dirColor}${colors.dim}${separator('─', 78)}${colors.reset}`);
    }
    
    console.log(`${dirColor}${colors.bright}  ${symbols.check} Notification sent successfully${colors.reset}`);
    console.log(`${dirColor}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
  },

  // Success logging
  success(message, details = {}) {
    console.log(`${colors.green}${colors.bright}${symbols.check} ${message}${colors.reset}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`${colors.green}  ${symbols.arrow} ${key}: ${value}${colors.reset}`);
        }
      });
    }
  },

  // Error logging
  error(message, error = null) {
    console.log(`\n${box(`✗ ERROR`, colors.red)}`);
    console.log(`${colors.red}${colors.bright}  ${message}${colors.reset}`);
    if (error) {
      console.log(`${colors.red}${colors.dim}${separator('─', 78)}${colors.reset}`);
      if (error.message) {
        console.log(`${colors.red}  Message: ${error.message}${colors.reset}`);
      }
      if (error.stack) {
        console.log(`${colors.red}${colors.dim}  ${error.stack}${colors.reset}`);
      }
      console.log(`${colors.red}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
    } else {
      console.log('');
    }
  },

  // Info logging
  info(message, details = {}) {
    console.log(`${colors.blue}${colors.bright}${symbols.circle} ${message}${colors.reset}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`${colors.blue}  ${symbols.arrow} ${key}: ${value}${colors.reset}`);
        }
      });
    }
  },

  // Warning logging
  warn(message, details = {}) {
    console.log(`${colors.yellow}${colors.bright}${symbols.triangle} ${message}${colors.reset}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`${colors.yellow}  ${symbols.arrow} ${key}: ${value}${colors.reset}`);
        }
      });
    }
  },

  // Transaction logging
  transaction(type, account, amount, transactionId, status) {
    const statusColor = status === 'COMPLETED' ? colors.green : colors.red;
    const statusIcon = status === 'COMPLETED' ? symbols.check : symbols.cross;
    
    console.log(`\n${colors.cyan}${colors.bright}${symbols.lightning} Transaction ${type.toUpperCase()}${colors.reset}`);
    console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}`);
    console.log(`${colors.cyan}  Account: ${account}${colors.reset}`);
    console.log(`${colors.cyan}  Amount: ${amount}${colors.reset}`);
    console.log(`${colors.cyan}  ID: ${transactionId}${colors.reset}`);
    console.log(`${statusColor}  Status: ${statusIcon} ${status}${colors.reset}`);
    console.log(`${colors.cyan}${colors.dim}${separator('─', 78)}${colors.reset}\n`);
  },

  // Separator
  separator(char = '─', length = 80) {
    console.log(separator(char, length));
  },

  // Timestamp
  timestamp() {
    return `${colors.dim}[${formatTime()}]${colors.reset}`;
  },

  // Interactive prompt
  prompt(message, type = 'info') {
    const typeColors = {
      question: colors.yellow,
      warning: colors.yellow,
      info: colors.blue,
      success: colors.green,
      error: colors.red,
    };
    const color = typeColors[type] || colors.cyan;
    console.log(`\n${color}${colors.bright}❓ ${message}${colors.reset}`);
  },
};
