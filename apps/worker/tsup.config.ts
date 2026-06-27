import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // Bundle workspace packages (they ship as .ts) so dist/ runs under plain node.
  noExternal: [/^@attio\//],
  // Native / CJS DB drivers can't be bundled; load them from node_modules.
  external: ['better-sqlite3', 'postgres'],
});
