/**
 * Hello World — minimal Ahnenbaum plugin example.
 *
 * Demonstrates:
 * - Plugin structure and activate() lifecycle
 * - Hook subscription
 * - Route registration
 * - Logging
 */

import type { AhnenbaumPlugin } from '@ahnenbaum/core';

const plugin: AhnenbaumPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Minimal example plugin to verify the SDK works',

  async activate(ctx) {
    ctx.logger.info('Hello World plugin activated!');

    // Subscribe to a hook
    ctx.on('person.created', (payload) => {
      ctx.logger.info(`New person created: ${payload.personId}`);
    });
  },

  async deactivate() {
    // Cleanup would go here
  },

  routes: [
    {
      method: 'GET',
      path: '/hello',
      description: 'Returns a greeting',
      handler: () =>
        new Response(JSON.stringify({ message: 'Hello from plugin!' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  ],

  panels: [
    {
      slot: 'dashboard.widget',
      label: 'Hello Widget',
      icon: '👋',
      component: 'HelloWidget',
      order: 999,
    },
  ],
};

export default plugin;
