import serverless from 'serverless-http';
import app from '../../src/index';

// Netlify rewrites /api/* to this function. basePath removes the function URL prefix
// while leaving the /api/... path expected by the Express application.
export const handler = serverless(app, { basePath: '/.netlify/functions/api' });
