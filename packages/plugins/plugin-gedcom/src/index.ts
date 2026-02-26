/**
 * Plugin GEDCOM — GEDCOM 5.5.1 import/export for Ahnenbaum.
 *
 * Provides:
 * - POST /import — Upload and parse a .ged file
 * - GET /export  — Export the database as GEDCOM
 */

import type { AhnenbaumPlugin, PluginContext } from '@ahnenbaum/core';
import { parseGedcom, extractData } from './gedcom-parser';
import { exportGedcom, type ExportPerson, type ExportRelationship } from './gedcom-export';

let ctx: PluginContext;

const plugin: AhnenbaumPlugin = {
  name: 'plugin-gedcom',
  version: '1.0.0',
  description: 'GEDCOM 5.5.1 import and export',
  author: 'Ahnenbaum',

  async activate(pluginCtx) {
    ctx = pluginCtx;
    ctx.logger.info('GEDCOM plugin activated');
  },

  async deactivate() {
    ctx.logger.info('GEDCOM plugin deactivated');
  },

  routes: [
    {
      method: 'POST',
      path: '/import',
      description: 'Import a GEDCOM file',
      handler: async (c: unknown) => {
        try {
          const req = (c as { req: { text: () => Promise<string> } }).req;
          const text = await req.text();

          if (!text.trim()) {
            return new Response(JSON.stringify({ ok: false, error: 'Empty GEDCOM file' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const records = parseGedcom(text);
          const data = extractData(records);

          ctx.logger.info(
            `Parsed GEDCOM: ${data.persons.length} persons, ${data.families.length} families`,
          );

          if (data.errors.length > 0) {
            ctx.logger.warn(`GEDCOM parse warnings: ${data.errors.length}`, {
              errors: data.errors.slice(0, 5),
            });
          }

          // Emit import event
          ctx.emit('tree.imported', {
            format: 'GEDCOM',
            personCount: data.persons.length,
          });

          return new Response(
            JSON.stringify({
              ok: true,
              data: {
                persons: data.persons.length,
                families: data.families.length,
                errors: data.errors,
                preview: data.persons.slice(0, 10),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } catch (err) {
          return new Response(JSON.stringify({ ok: false, error: `Parse error: ${err}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
    {
      method: 'GET',
      path: '/export',
      description: 'Export database as GEDCOM',
      handler: () => {
        try {
          const persons = ctx.db.query<ExportPerson>(
            'SELECT id, givenName, familyName, sex, birthDate, birthPlace, deathDate, deathPlace FROM persons WHERE deletedAt IS NULL',
          );

          const relationships = ctx.db.query<ExportRelationship>(
            'SELECT id, type, person1Id, person2Id FROM relationships WHERE deletedAt IS NULL',
          );

          const gedcom = exportGedcom(persons, relationships);

          ctx.emit('tree.exported', {
            format: 'GEDCOM',
            personCount: persons.length,
          });

          return new Response(gedcom, {
            status: 200,
            headers: {
              'Content-Type': 'text/x-gedcom',
              'Content-Disposition': 'attachment; filename="ahnenbaum-export.ged"',
            },
          });
        } catch (err) {
          return new Response(JSON.stringify({ ok: false, error: `Export error: ${err}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  ],

  panels: [
    {
      slot: 'global.action',
      label: 'Import GEDCOM',
      icon: '📥',
      component: 'GedcomImport',
      order: 10,
    },
    {
      slot: 'global.action',
      label: 'Export GEDCOM',
      icon: '📤',
      component: 'GedcomExport',
      order: 11,
    },
  ],
};

export default plugin;
