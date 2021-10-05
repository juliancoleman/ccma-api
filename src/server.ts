import { errors } from 'celebrate';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import * as path from 'path';

/**
 * Load environment variables
 *
 * Note: should come after node module imports, but before
 * internal module imports.
 */
config();

import controllers from './controllers/mod';

const app = express();
const port = Number(process.env.PORT) || 3000;

/**
 * Set server response headers
 */
app.set('x-powered-by', undefined);

/**
 * Server application provisioning
 */

// enable CORS for all origins
app.use(
  cors({
    origin: '*',
    optionsSuccessStatus: 200,
  }),
);
// enable parsing of application/json Content-Type
app.use(express.json());
// enable parsing of application/x-www-form-urlencoded Content-Type
app.use(express.urlencoded({ extended: false }));
// serve files out of the `public/` directory
app.use(express.static(path.join(__dirname, '../public')));
// expose server API routes
app.use('/', controllers);
// catch-all Celebrate validation errors
app.use(errors());

/**
 * Start the server with a callback
 */
app.listen(port, () => {
  console.info(`Server running on port ${port}`);
});
