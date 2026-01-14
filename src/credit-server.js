import express from "express";
import {
  prepareCredit,
  commitCredit,
  abortCredit,
} from "./handlers/simple-credit.js";
import { updateIntent } from "./handlers/intents.js";
import { asyncErrorWrapper, handleErrors } from "./middleware/errors.js";
import { logRequest } from "./middleware/logging.js";

const app = express();
const bankName = "Simple Credit Bridge";
const port = process.env.PORT || process.argv[2] || 3002;

// express.json() is used to parse incoming JSON data
app.use(express.json());
app.use(logRequest);

// Credit endpoints
app.post("/api/v2/credits", asyncErrorWrapper(prepareCredit));
app.post("/api/v2/credits/:handle/commit", asyncErrorWrapper(commitCredit));
app.post("/api/v2/credits/:handle/abort", asyncErrorWrapper(abortCredit));

// Intent endpoints
app.put("/api/v2/intents/:handle", asyncErrorWrapper(updateIntent));

app.get("/api", (req, res) => {
  res.send(`${bankName} is running on port ${port}!`);
});

// Error handler needs to go after all the routes
app.use(handleErrors);

app.listen(port, () => {
  console.log(`${bankName} running on port ${port}`);
  console.log(`Credit endpoints:`);
  console.log(`  POST /api/v2/credits`);
  console.log(`  POST /api/v2/credits/:handle/commit`);
  console.log(`  POST /api/v2/credits/:handle/abort`);
  console.log(`Intent endpoints:`);
  console.log(`  PUT /api/v2/intents/:handle`);
});
