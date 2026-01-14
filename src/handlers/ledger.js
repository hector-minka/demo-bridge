import { creditKeyPair, creditLedger } from "../ledger.js";

export async function intentProofAdded(req, res) {
  console.log("\n=== LEDGER INTENT PROOF ADDED ===");
  console.log(
    `[INTENT-PROOF-ADDED] Received request at: ${new Date().toISOString()}`
  );
  console.log(`[INTENT-PROOF-ADDED] Method: ${req.method}`);
  console.log(`[INTENT-PROOF-ADDED] URL: ${req.url}`);
  console.log(
    `[INTENT-PROOF-ADDED] Headers:`,
    JSON.stringify(req.headers, null, 2)
  );
  console.log(`[INTENT-PROOF-ADDED] Body:`, JSON.stringify(req.body, null, 2));
  console.log(
    `[INTENT-PROOF-ADDED] Query params:`,
    JSON.stringify(req.query, null, 2)
  );
  console.log(
    `[INTENT-PROOF-ADDED] Route params:`,
    JSON.stringify(req.params, null, 2)
  );

  // Send response immediately
  res.status(200).json({
    message: "Intent proof added received successfully",
    timestamp: new Date().toISOString(),
    received: true,
  });

  console.log(`[INTENT-PROOF-ADDED] Response sent successfully`);

  try {
    // Extract entry data from the request body
    const entryData = req.body;
    const intent = entryData?.data?.intent;
    const proofs = entryData?.data?.proofs || [];

    console.log(`[INTENT-PROOF-ADDED] Intent: ${intent}`);
    console.log(`[INTENT-PROOF-ADDED] Number of proofs: ${proofs.length}`);
    console.log(
      `[INTENT-PROOF-ADDED] Full request data:`,
      JSON.stringify(entryData, null, 2)
    );

    // Check if any proof has status "committed"
    const committedProofs = proofs.filter(
      (proof) => proof.custom && proof.custom.status === "committed"
    );

    console.log(
      `[INTENT-PROOF-ADDED] Committed proofs: ${committedProofs.length}`
    );

    if (intent && committedProofs.length > 0) {
      console.log(
        `[INTENT-PROOF-ADDED] Intent ${intent} has committed proofs - signing with committed status`
      );
      console.log(
        `[INTENT-PROOF-ADDED] Committed proof details:`,
        committedProofs.map((p) => ({
          status: p.custom?.status,
          moment: p.custom?.moment,
          public: p.public,
        }))
      );

      // Sign the intent with committed status
      console.log(
        `[INTENT-PROOF-ADDED] Signing intent ${intent} with committed status`
      );

      //   const custom = {
      //     handle: entryData?.data?.handle || `evt_${Date.now()}`,
      //     status: "committed",
      //     moment: new Date().toISOString(),
      //   };

      //   // Create intent data structure that includes handle
      //   const intentData = {
      //     // intent: intent,
      //     handle: intent,
      //     data: entryData.data,
      //     hash: entryData.hash,
      //     meta: entryData.meta,
      //   };

      //   console.log(`[INTENT-PROOF-ADDED] Intent data structure:`, intentData);

      //   const ledgerResponse = await creditLedger.intent
      //     .from(intentData)
      //     .hash()
      //     .sign([
      //       {
      const custom = {
        handle: entryData.data.handle, // Use the bridge entry handle, not the intent handle
        status: "committed",
        moment: new Date().toISOString(),
        coreId: undefined,
        reason: undefined,
        detail: undefined,
        failId: undefined,
      };

      console.log(
        `[INTENT-PROOF-ADDED] Using bridge entry handle: ${entryData.data.handle}`
      );

      console.log(`[INTENT-PROOF-ADDED] Custom:`, custom);

      try {
        // Try to read the full intent data from the server first
        console.log(
          `[INTENT-PROOF-ADDED] Reading intent ${intent} from server...`
        );
        const { response } = await creditLedger.intent.read(intent);
        console.log(`[INTENT-PROOF-ADDED] Response received successfully`);
        console.log(
          `[INTENT-PROOF-ADDED] Response keys:`,
          Object.keys(response)
        );
        console.log(
          `[INTENT-PROOF-ADDED] Response.data keys:`,
          response.data ? Object.keys(response.data) : "undefined"
        );
        console.log(
          `[INTENT-PROOF-ADDED] Response.data.data keys:`,
          response.data?.data ? Object.keys(response.data.data) : "undefined"
        );
        console.log(`[INTENT-PROOF-ADDED] Intent data received:`, {
          handle: response.data?.data?.handle,
          status: response.data?.meta?.status,
          proofsCount: response.data?.data?.proofs?.length,
        });

        // Find the credit entry handle from the intent proofs
        const creditProof = response.data.meta.proofs.find(
          (proof) =>
            proof.custom &&
            proof.custom.handle &&
            proof.custom.handle.startsWith("cre_") &&
            proof.public === creditKeyPair.public
        );

        if (!creditProof) {
          console.log(
            `[INTENT-PROOF-ADDED] No credit entry found for this bridge - skipping`
          );
          return;
        }

        const creditEntryHandle = creditProof.custom.handle;

        // Check if we've already signed this credit entry as committed
        const alreadyCommitted = response.data.meta.proofs.some(
          (proof) =>
            proof.custom &&
            proof.custom.status === "committed" &&
            proof.custom.handle === creditEntryHandle &&
            proof.public === creditKeyPair.public
        );

        if (alreadyCommitted) {
          console.log(
            `[INTENT-PROOF-ADDED] Credit entry already signed as committed - skipping`
          );
          return;
        }

        console.log(
          `[INTENT-PROOF-ADDED] Using credit entry handle: ${creditEntryHandle}`
        );

        // Update custom object with the credit entry handle
        custom.handle = creditEntryHandle;

        // Use the full intent data structure (including hash, meta, luid)
        const intentData = response.data; // Full intent data from server including hash, meta, luid

        console.log(
          `[INTENT-PROOF-ADDED] Full intent data structure:`,
          JSON.stringify(intentData, null, 2)
        );
        console.log(`[INTENT-PROOF-ADDED] Using intent data:`, {
          handle: intentData.handle,
          schema: intentData.schema,
          status: intentData.status,
        });

        const ledgerResponse = await creditLedger.intent
          .from(intentData)
          .hash()
          .sign([
            {
              keyPair: creditKeyPair,
              custom,
            },
          ])
          .send();

        console.log(
          `[INTENT-PROOF-ADDED] Successfully signed intent ${intent} with committed status using full intent data`
        );
      } catch (readError) {
        console.log(
          `[INTENT-PROOF-ADDED] Failed to sign intent with server data, trying direct approach:`,
          readError.message
        );
        console.log(`[INTENT-PROOF-ADDED] Read error details:`, {
          reason: readError.reason,
          detail: readError.detail,
          custom: readError.custom,
        });

        // Fallback: create minimal intent data structure
        const intentData = {
          handle: intent,
          data: {
            handle: intent,
          },
        };

        console.log(
          `[INTENT-PROOF-ADDED] Using fallback intent data:`,
          intentData
        );

        const ledgerResponse = await creditLedger.intent
          .from(intentData)
          .hash()
          .sign([
            {
              keyPair: creditKeyPair,
              custom,
            },
          ])
          .send();

        console.log(
          `[INTENT-PROOF-ADDED] Successfully signed intent ${intent} with committed status using direct approach`
        );
      }
    } else if (!intent) {
      console.log(`[INTENT-PROOF-ADDED] No intent found in request`);
    } else {
      console.log(
        `[INTENT-PROOF-ADDED] No committed proofs found - skipping signature`
      );
      console.log(
        `[INTENT-PROOF-ADDED] Proof statuses:`,
        proofs.map((proof) => proof.custom?.status || "unknown")
      );
    }
  } catch (error) {
    console.error(`[INTENT-PROOF-ADDED] Error signing intent:`, error);
  }

  console.log("=== END LEDGER INTENT PROOF ADDED ===\n");
}
