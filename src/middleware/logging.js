import { logger } from "../utils/logger.js";

// This function will get called before all of our request
// handlers and log the request.
export function logRequest(req, res, next) {
  // Log all requests (including PUT for intent updates)
  logger.request(req.method, req.url, req.body);
  next();
}
