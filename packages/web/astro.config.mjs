// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// Served at the domain root on Dokploy; SITE_BASE sets a sub-path if a host ever needs one.
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  base,
  output: 'static',
  integrations: [react()],
});
