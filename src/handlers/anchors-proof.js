export async function anchorProofAddedEffect(req, res) {
  console.log("\n=== ANCHOR-PROOF-ADDED EFFECT RECEIVED ===");
  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Received request at: ${new Date().toISOString()}`
  );
  console.log(`[ANCHOR-PROOF-ADDED-EFFECT] Method: ${req.method}`);
  console.log(`[ANCHOR-PROOF-ADDED-EFFECT] URL: ${req.url}`);
  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Headers:`,
    JSON.stringify(req.headers, null, 2)
  );
  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Body:`,
    JSON.stringify(req.body, null, 2)
  );
  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Query params:`,
    JSON.stringify(req.query, null, 2)
  );
  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Route params:`,
    JSON.stringify(req.params, null, 2)
  );

  // Return 202 Accepted immediately
  res.status(202).json({
    message: "Anchor effect received and accepted",
    timestamp: new Date().toISOString(),
    accepted: true,
  });

  console.log(
    `[ANCHOR-PROOF-ADDED-EFFECT] Response sent with 202 Accepted status`
  );
  console.log("=== END ANCHOR-PROOF-ADDED EFFECT ===\n");
}
