import ledgerSdk from '@minka/ledger-sdk'
import { logger } from './utils/logger.js'

const { LedgerSdk } = ledgerSdk

// const LEDGER = "ledger-bridge-test";
const LEDGER = 'tfy-stg'
const SERVER = 'https://ldg-stg.one/api/v2'

// Debit signer keys
// htorohn
const DEBIT_PUBLIC_KEY = 'YiY9jEkH3wldB7YWGvc/Ht2VgsYY7JU2OSSaE7DvtYw='
const DEBIT_SECRET_KEY = 'fiCwMZ406y4uzpCvB+bZZAemToHooagwLGn15We+m0s='

// Credit signer keys (you'll need to generate new keys for this)
// signer-demo
const CREDIT_PUBLIC_KEY = 'YiY9jEkH3wldB7YWGvc/Ht2VgsYY7JU2OSSaE7DvtYw='
const CREDIT_SECRET_KEY = 'fiCwMZ406y4uzpCvB+bZZAemToHooagwLGn15We+m0s=' // Replace with actual credit secret key

// const PUBLIC_SERVER_KEY = "TXbyuxpHVEzqjaLOya1KCMRRNESZZd9oV9FFDD+1M/A=";

// Debit signer key pair
const debitKeyPair = {
	format: 'ed25519-raw',
	public: DEBIT_PUBLIC_KEY,
	secret: DEBIT_SECRET_KEY,
}

// Credit signer key pair
const creditKeyPair = {
	format: 'ed25519-raw',
	public: CREDIT_PUBLIC_KEY,
	secret: CREDIT_SECRET_KEY,
}

// Populate with Ledger public key data.
export const ledgerSigner = {
	format: 'ed25519-raw',
	public: '+BHwdgrqqAgWAOgOCBBWS2BI7O/2JyTojl40okR+UWQ=',
}

// Configure the Ledger SDK for debits
const debitLedger = new LedgerSdk({
	// This is the ledger instance we are going to connect to.
	ledger: LEDGER,
	server: SERVER,
	secure: {
		aud: 'demo',
		iss: 'debit-signer',
		keyPair: debitKeyPair,
		sub: debitKeyPair.public,
		exp: 3600,
	},
})

// Configure the Ledger SDK for credits
const creditLedger = new LedgerSdk({
	// This is the ledger instance we are going to connect to.
	ledger: LEDGER,
	server: SERVER,
	secure: {
		aud: 'demo',
		iss: 'credit-signer',
		keyPair: creditKeyPair,
		sub: creditKeyPair.public,
		exp: 3600,
	},
})

// This function is used to notify Ledger of Debit Entry processing final statuses.
export async function notifyDebitLedger(entry, action, notifyStates) {
	const notifyAction = entry.actions[action]

	if (!notifyAction || !notifyStates.includes(notifyAction.state)) {
		logger.warn('Skipping ledger notification', {
			reason: !notifyAction
				? 'No action found'
				: 'State not in notify states',
			handle: entry.handle,
			action,
			state: notifyAction?.state,
			notifyStates,
		})
		return
	}

	if (!entry.data?.intent) {
		logger.error('Missing intent data for ledger notification', {
			handle: entry.handle,
		})
		return
	}

	// Build custom object based on status
	// For "failed" status, include moment + error details (ledger expects these)
	// For success statuses, include moment and coreId
	let custom
	if (notifyAction.state === 'failed') {
		custom = {
			handle: entry.handle,
			status: notifyAction.state,
			moment: new Date().toISOString(),
		}
		// Add error fields if present
		if (notifyAction.error?.reason) {
			custom.reason = notifyAction.error.reason
		}
		if (notifyAction.error?.detail) {
			custom.detail = notifyAction.error.detail
		}
		if (notifyAction.error?.failId) {
			custom.failId = notifyAction.error.failId
		}
	} else {
		// For success statuses (prepared, committed, aborted), include moment
		custom = {
			handle: entry.handle,
			status: notifyAction.state,
			moment: new Date().toISOString(),
		}
		if (notifyAction.coreId) {
			custom.coreId = notifyAction.coreId
		}
	}

	// Log before sending
	logger.ledgerNotification(
		'send',
		entry.handle,
		action,
		notifyAction.state,
		custom
	)

	try {
		logger.info('Preparing ledger notification', {
			intent: entry.data.intent.handle,
			ledger: LEDGER,
			server: SERVER,
			signer: debitKeyPair.public,
		})

		const ledgerResponse = await debitLedger.intent
			.from(entry.data.intent)
			.hash()
			.sign([
				{
					keyPair: debitKeyPair,
					custom,
				},
			])
			.send()

		logger.success('Ledger notification sent successfully', {
			handle: entry.handle,
			action,
			state: notifyAction.state,
			response: ledgerResponse,
		})
	} catch (error) {
		logger.error('Error notifying ledger', error)

		// Log additional error details if available
		if (error.response) {
			logger.error('Ledger API error response', {
				status: error.response.status,
				statusText: error.response.statusText,
				data: error.response.data,
			})
		}
	}
}

// This function is used to notify Ledger of Credit Entry processing final statuses.
export async function notifyCreditLedger(entry, action, notifyStates) {
	const notifyAction = entry.actions[action]

	if (!notifyAction || !notifyStates.includes(notifyAction.state)) {
		logger.warn('Skipping ledger notification', {
			reason: !notifyAction
				? 'No action found'
				: 'State not in notify states',
			handle: entry.handle,
			action,
			state: notifyAction?.state,
			notifyStates,
		})
		return
	}

	if (!entry.data?.intent) {
		logger.error('Missing intent data for ledger notification', {
			handle: entry.handle,
		})
		return
	}

	// Build custom object based on status
	// For "failed" status, include moment + error details (ledger expects these)
	// For success statuses, include moment and coreId
	let custom
	if (notifyAction.state === 'failed') {
		custom = {
			handle: entry.handle,
			status: notifyAction.state,
			moment: new Date().toISOString(),
		}
		// Add error fields if present
		if (notifyAction.error?.reason) {
			custom.reason = notifyAction.error.reason
		}
		if (notifyAction.error?.detail) {
			custom.detail = notifyAction.error.detail
		}
		if (notifyAction.error?.failId) {
			custom.failId = notifyAction.error.failId
		}
	} else {
		// For success statuses (prepared, committed, aborted), include moment
		custom = {
			handle: entry.handle,
			status: notifyAction.state,
			moment: new Date().toISOString(),
		}
		if (notifyAction.coreId) {
			custom.coreId = notifyAction.coreId
		}
	}

	// Log before sending
	logger.ledgerNotification(
		'send',
		entry.handle,
		action,
		notifyAction.state,
		custom
	)

	try {
		logger.info('Preparing ledger notification', {
			intent: entry.data.intent.handle,
			ledger: LEDGER,
			server: SERVER,
			signer: creditKeyPair.public,
		})

		// Log the intent data structure for debugging
		logger.info('Intent data structure', {
			hasIntent: !!entry.data.intent,
			intentHandle: entry.data.intent?.handle,
			intentLuid: entry.data.intent?.luid,
			intentHash: entry.data.intent?.hash,
			intentData: entry.data.intent?.data ? 'present' : 'missing',
		})

		const ledgerResponse = await creditLedger.intent
			.from(entry.data.intent)
			.hash()
			.sign([
				{
					keyPair: creditKeyPair,
					custom,
				},
			])
			.send()

		logger.success('Ledger notification sent successfully', {
			handle: entry.handle,
			action,
			state: notifyAction.state,
			response: ledgerResponse,
		})
	} catch (error) {
		// Enhanced error logging
		logger.error('Error notifying ledger', error)

		// Log the full error object structure
		logger.error('Full error object', {
			errorType: error.constructor.name,
			errorKeys: Object.keys(error),
			errorStringified: JSON.stringify(
				error,
				Object.getOwnPropertyNames(error)
			),
		})

		// Log additional error details if available
		if (error.response) {
			logger.error('Ledger API error response', {
				status: error.response.status,
				statusText: error.response.statusText,
				data: error.response.data,
				headers: error.response.headers,
			})
		}

		// Check for LedgerApiError specific properties
		if (error.code) {
			logger.error('Error code', { code: error.code })
		}

		if (error.details) {
			logger.error('Error details', { details: error.details })
		}

		if (error.message) {
			logger.error('Error message details', {
				message: error.message,
				name: error.name,
				stack: error.stack,
			})
		}

		// Log the payload that was being sent
		logger.info('Failed payload details', {
			handle: entry.handle,
			action,
			state: notifyAction.state,
			custom,
			intentHandle: entry.data.intent?.handle,
			signerPublicKey: creditKeyPair.public,
			signerIssuer: 'credit-signer',
		})

		// Log intent access to see if credit signer is authorized
		if (entry.data?.intent?.data?.access) {
			logger.info('Intent access list', {
				access: entry.data.intent.data.access,
				creditSignerInAccess: entry.data.intent.data.access.some(
					(acc) => acc.signer?.public === creditKeyPair.public
				),
			})
		}
	}
}

// Export the ledger instances for direct use
export { creditKeyPair, creditLedger, debitLedger }

// Legacy function for backward compatibility (uses debit signer)
export async function notifyLedger(entry, action, notifyStates) {
	logger.warn('Using legacy notifyLedger function', {
		message: 'Consider using notifyDebitLedger or notifyCreditLedger',
		handle: entry.handle,
	})
	return notifyDebitLedger(entry, action, notifyStates)
}
