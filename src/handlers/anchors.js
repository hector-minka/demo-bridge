export async function anchorEffect(req, res) {
  console.log("\n=== ANCHOR EFFECT RECEIVED ===");
  console.log(
    `[ANCHOR-EFFECT] Received request at: ${new Date().toISOString()}`
  );
  console.log(`[ANCHOR-EFFECT] Method: ${req.method}`);
  console.log(`[ANCHOR-EFFECT] URL: ${req.url}`);
  console.log(`[ANCHOR-EFFECT] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[ANCHOR-EFFECT] Body:`, JSON.stringify(req.body, null, 2));
  console.log(
    `[ANCHOR-EFFECT] Query params:`,
    JSON.stringify(req.query, null, 2)
  );
  console.log(
    `[ANCHOR-EFFECT] Route params:`,
    JSON.stringify(req.params, null, 2)
  );

  // Return 202 Accepted immediately
  res.status(202).json({
    message: "Anchor effect received and accepted",
    timestamp: new Date().toISOString(),
    accepted: true,
  });

  console.log(`[ANCHOR-EFFECT] Response sent with 202 Accepted status`);
  console.log("=== END ANCHOR EFFECT ===\n");
}
