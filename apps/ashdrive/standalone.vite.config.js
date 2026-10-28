import { agentMarkdown } from '../../shared/lib/agent-markdown.js';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [agentMarkdown({ appDir: fileURLToPath(new URL('.', import.meta.url)), origin: 'https://ashdrive.mattvalancy.com', sourceURL: 'https://github.com/mvalancy/csci-40_f26_demos/blob/main/apps/ashdrive/' })],
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
