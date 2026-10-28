/** Build-only Vite plugin. Public game instructions come from the app's existing README. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function publicReadme(source, sourceURL) {
  // README links are repository-relative, not relative to the deployed game root.
  return source.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (all, prefix, target, suffix) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return all;
    return prefix + new URL(target, sourceURL).href + suffix;
  });
}

export function agentMarkdown({ appDir, origin, sourceURL }) {
  let pageNames = [];
  return {
    name: 'public-agent-markdown',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const file = path.basename(context.filename, '.html') + '.md';
        return { html, tags: [{ tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: './' + file, title: 'Agent-readable game guide' }, injectTo: 'head' }] };
      },
    },
    generateBundle(_options, bundle) {
      const meta = JSON.parse(readFileSync(path.join(appDir, 'meta.json'), 'utf8'));
      const instructions = publicReadme(readFileSync(path.join(appDir, 'README.md'), 'utf8'), sourceURL);
      pageNames = Object.keys(bundle).filter(name => name.endsWith('.html'));
      if (!pageNames.includes('index.html')) throw new Error('Agent Markdown requires an index.html entry');
      for (const page of pageNames) {
        const route = page === 'index.html' ? '/' : '/' + page;
        const markdown = `---\ntitle: ${JSON.stringify(meta.title)}\nurl: ${JSON.stringify(origin + route)}\ndescription: ${JSON.stringify(meta.description)}\n---\n\n[Open this browser experience](${origin + route}) · [Agent document index](${origin}/llms.txt)\n\nThis is the game guide, generated from the same repository as the interactive site. Markdown describes the experience; playing the 3D game requires a graphical browser.\n\n${instructions}\n`;
        this.emitFile({ type: 'asset', fileName: page.replace(/\.html$/, '.md'), source: markdown });
      }
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: `# ${meta.title}\n\n> ${meta.description}\n\n## Public game guides\n\n${pageNames.map(page => `- [${page === 'index.html' ? meta.title : page.replace('.html','')}](${origin}/${page.replace('.html','.md')}): Game instructions and source documentation for ${page === 'index.html' ? '/' : '/'+page}.`).join('\n')}\n` });
      const headers = bundle['_headers'];
      const rules = '\n/*.md\n  Content-Type: text/markdown; charset=utf-8\n  X-Content-Type-Options: nosniff\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n';
      // Vite public/_headers is copied outside the Rollup bundle. Read and preserve it.
      let existing = '';
      try { existing = readFileSync(path.join(appDir, 'public/_headers'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (headers) headers.source += rules;
      else this.emitFile({ type: 'asset', fileName: '_headers', source: existing + rules });
    },
  };
}
