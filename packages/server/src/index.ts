import { serve } from '@hono/node-server';
import { APP_NAME } from '@ahnenbaum/core';
import { app } from './app';

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`${APP_NAME} server running on http://localhost:${info.port}`);
});
