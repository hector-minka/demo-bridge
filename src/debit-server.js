import express from "express";
import {
  prepareDebit,
  commitDebit,
  abortDebit,
} from "./handlers/simple-debit.js";
import { updateIntent } from "./handlers/intents.js";
import { asyncErrorWrapper, handleErrors } from "./middleware/errors.js";
import { logRequest } from "./middleware/logging.js";

const app = express();
const bankName = "Simple Debit Bridge";
const port = process.env.PORT || process.argv[2] || 3001;

// express.json() is used to parse incoming JSON data
app.use(express.json());
app.use(logRequest);

// Debit endpoints
app.post("/api/v2/debits", asyncErrorWrapper(prepareDebit));
app.post("/api/v2/debits/:handle/commit", asyncErrorWrapper(commitDebit));
app.post("/api/v2/debits/:handle/abort", asyncErrorWrapper(abortDebit));

// Intent endpoints
app.put("/api/v2/intents/:handle", asyncErrorWrapper(updateIntent));

app.get("/api", (req, res) => {
  res.send(`${bankName} is running on port ${port}!`);
});

// Error handler needs to go after all the routes
app.use(handleErrors);

app.listen(port, () => {
  console.log(`${bankName} running on port ${port}`);
  console.log(`Debit endpoints:`);
  console.log(`  POST /api/v2/debits`);
  console.log(`  POST /api/v2/debits/:handle/commit`);
  console.log(`  POST /api/v2/debits/:handle/abort`);
  console.log(`Intent endpoints:`);
  console.log(`  PUT /api/v2/intents/:handle`);
});
