/**
 * Plugin Charts — genealogy chart visualizations for Ahnenbaum.
 *
 * Provides:
 * - GET /ancestor-chart/:personId — Ancestor tree layout data
 * - GET /descendant-chart/:personId — Descendant tree layout data
 * - Dashboard widget panel
 * - Tree overlay panel
 */

import type { AhnenbaumPlugin, PluginContext } from '@ahnenbaum/core';
import {
  ancestorLayout,
  descendantLayout,
  type PersonRecord,
  type RelationshipRecord,
} from './chart-layout';

let ctx: PluginContext;

function getPersonsAndRelationships() {
  const persons = ctx.db.query<PersonRecord>(
    'SELECT id, givenName, familyName, sex, birthDate, deathDate FROM persons WHERE deletedAt IS NULL',
  );
  const relationships = ctx.db.query<RelationshipRecord>(
    'SELECT id, type, person1Id, person2Id FROM relationships WHERE deletedAt IS NULL',
  );
  return { persons, relationships };
}

const plugin: AhnenbaumPlugin = {
  name: 'plugin-charts',
  version: '1.0.0',
  description: 'Genealogy chart visualizations (ancestor tree, descendant tree)',
  author: 'Ahnenbaum',

  async activate(pluginCtx) {
    ctx = pluginCtx;
    ctx.logger.info('Charts plugin activated');
  },

  async deactivate() {
    ctx.logger.info('Charts plugin deactivated');
  },

  routes: [
    {
      method: 'GET',
      path: '/ancestor-chart/:personId',
      description: 'Get ancestor tree layout for a person',
      handler: (c: unknown) => {
        const req = (c as { req: { param: (k: string) => string } }).req;
        const personId = req.param('personId');
        const { persons, relationships } = getPersonsAndRelationships();

        const chart = ancestorLayout(personId, persons, relationships);

        return new Response(JSON.stringify({ ok: true, data: chart }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
    {
      method: 'GET',
      path: '/descendant-chart/:personId',
      description: 'Get descendant tree layout for a person',
      handler: (c: unknown) => {
        const req = (c as { req: { param: (k: string) => string } }).req;
        const personId = req.param('personId');
        const { persons, relationships } = getPersonsAndRelationships();

        const chart = descendantLayout(personId, persons, relationships);

        return new Response(JSON.stringify({ ok: true, data: chart }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  ],

  panels: [
    {
      slot: 'tree.overlay',
      label: 'Chart Controls',
      icon: '📊',
      component: 'ChartOverlay',
      order: 1,
    },
    {
      slot: 'dashboard.widget',
      label: 'Family Statistics',
      icon: '📈',
      component: 'FamilyStats',
      order: 5,
    },
  ],
};

export default plugin;
