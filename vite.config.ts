import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' with { type: 'json' };

// BASE_PATH: '/rettsan-sim/' für GitHub Pages, beim Entwickeln '/'
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
