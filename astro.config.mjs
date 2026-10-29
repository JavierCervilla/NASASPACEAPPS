// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// GitHub Pages serves the project under /<repo>/; SITE_BASE overrides it for other hosts (Vercel, local preview at /).
const base = process.env.SITE_BASE ?? '/NASASPACEAPPS';

export default defineConfig({
  site: 'https://javiercervilla.github.io',
  base,
  output: 'static',
  integrations: [react()],
});
