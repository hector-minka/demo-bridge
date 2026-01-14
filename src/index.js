import express from "express";
import { anchorProofAddedEffect } from "./handlers/anchors-proof.js";
import { anchorEffect } from "./handlers/anchors.js";
import {
  abortCredit,
  commitCredit,
  prepareCredit,
} from "./handlers/credits.js";
import { abortDebit, commitDebit, prepareDebit } from "./handlers/debits.js";
import { intentEffect } from "./handlers/intents.js";
import { intentProofAdded } from "./handlers/ledger.js";
import { asyncErrorWrapper, handleErrors } from "./middleware/errors.js";
import { logRequest } from "./middleware/logging.js";

const app = express();
const bankName = "Demo bank";
const port = process.env.PORT || process.argv[2] || 3001;

// express.json() is used to parse incoming JSON data
app.use(express.json());
app.use(logRequest);

app.post("/ledger/intent-proof-added", asyncErrorWrapper(intentProofAdded));
app.post("/ledger/intent-effect", asyncErrorWrapper(intentEffect));
app.post("/ledger/anchor-effect", asyncErrorWrapper(anchorEffect));
app.post(
  "/ledger/anchor-proof-added",
  asyncErrorWrapper(anchorProofAddedEffect)
);
app.post("/api/v2/credits/:handle/commit", asyncErrorWrapper(commitCredit));
app.post("/api/v2/credits/:handle/abort", asyncErrorWrapper(abortCredit));
app.post("/api/v2/credits", asyncErrorWrapper(prepareCredit));
app.post("/api/v2/debits/:handle/commit", asyncErrorWrapper(commitDebit));
app.post("/api/v2/debits/:handle/abort", asyncErrorWrapper(abortDebit));
app.post("/api/v2/debits", asyncErrorWrapper(prepareDebit));
app.get("/api", (req, res) => {
  res.send(`${bankName} is running!`);
});

// Error handler needs to go after all the routes
app.use(handleErrors);

app.listen(port, () => {
  console.log(`${bankName} running on port ${port}`);
});
