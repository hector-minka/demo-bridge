import { upsertIntent } from "../persistence.js";
import { logger } from "../utils/logger.js";

export async function updateIntent(req, res) {
	const handle = req.params.handle;
	const intentData = req.body;

	// Just return 202 - no response logging needed
	res.sendStatus(202);

	try {
		// Update the intent with the provided data
		const updatedIntent = await upsertIntent({
			handle,
			...intentData,
		});

		// Log the intent update from ledger
		logger.info("Intent update received from ledger", {
			handle,
			hasData: !!updatedIntent.data,
			hasMeta: !!updatedIntent.meta,
			hasHash: !!updatedIntent.hash,
			status: updatedIntent.data?.status || updatedIntent.status,
		});
	} catch (error) {
		logger.error("Error updating intent", error);
		// Don't throw - just log the error since this is a notification from ledger
	}
}

export async function intentEffect(req, res) {
	// Return 202 Accepted immediately
	res.status(202).json({
		message: "Intent effect received and accepted",
		timestamp: new Date().toISOString(),
		accepted: true,
	});

	// Log the intent effect (request already logged by middleware)
	logger.info("Intent effect processed", {
		timestamp: new Date().toISOString(),
	});
}
