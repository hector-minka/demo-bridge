# 🌉 Demo Bridge - Debit & Credit Implementation

This guide explains how to set up and run the Demo Bridge for handling both debit and credit operations in the Minka ecosystem.

## 📋 Prerequisites

- Node.js installed
- ngrok account and CLI
- localtunnel CLI (`npm install -g localtunnel`)
- Minka CLI configured
- Bridges created in the ledger: `source-bridge` and `target-bridge`

## 🚀 Quick Start

### Step 1: Start First Bridge Instance (Source)

```bash
# Run first instance on default port 3001
npm run start
```

In a **separate terminal**, expose the first bridge:

```bash
# Expose port 3001 using ngrok
ngrok http 3001
```

### Step 2: Configure Source Bridge

Update the source bridge in the ledger with the ngrok URL:

```bash
minka bridge update source-bridge
```

**Configuration:**

- **Handle**: `source-bridge`
- **Schema**: `rest`
- **Server**: `https://your-ngrok-url.ngrok-free.app/api/v2`

### Step 3: Start Second Bridge Instance (Target)

```bash
# Run second instance on port 3002
npm run start 3002
```

In a **separate terminal**, expose the second bridge using localtunnel:

```bash
# Expose port 3002 using localtunnel
lt --subdomain target-bridge --port 3002
```

> **💡 Note**: We use localtunnel for the second instance since only one ngrok instance can run at a time.

### Step 4: Configure Target Bridge

Update the target bridge in the ledger with the localtunnel URL:

```bash
minka bridge update target-bridge
```

**Configuration:**

- **Handle**: `target-bridge`
- **Schema**: `rest`
- **Server**: `https://target-bridge.loca.lt/api/v2`

## ✅ Result

You now have **two bridge instances** running:

| Bridge          | Port | URL                        | Purpose                   |
| --------------- | ---- | -------------------------- | ------------------------- |
| `source-bridge` | 3001 | `ngrok-url.ngrok-free.app` | Handles debit operations  |
| `target-bridge` | 3002 | `target-bridge.loca.lt`    | Handles credit operations |

## 🔧 Troubleshooting

### Common Issues

- **Port conflicts**: Ensure ports 3001 and 3002 are available
- **ngrok limits**: Free ngrok accounts have session limits
- **localtunnel issues**: If subdomain is taken, try a different subdomain
- **Bridge configuration**: Verify URLs are correctly set in the ledger

### Useful Commands

```bash
# Check running processes
lsof -i :3001
lsof -i :3002

# Kill processes if needed
kill -9 <PID>

# Test bridge endpoints
curl https://your-ngrok-url.ngrok-free.app/api/v2/health
curl https://target-bridge.loca.lt/api/v2/health
```

## 📚 Next Steps

1. **Test debit operations** through the source bridge
2. **Test credit operations** through the target bridge
3. **Monitor logs** for both instances
4. **Configure additional endpoints** as needed

---

> **🎯 Goal**: This setup enables end-to-end testing of debit and credit flows in the Minka payment system.
