/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** PWA: chèn manifest + sinh service worker precache toàn bộ file build. */
function pwa(): Plugin {
  return {
    name: 'rcs-pwa',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './apple-touch-icon.png' }, injectTo: 'head' },
      ];
    },
    generateBundle(_opts, bundle) {
      const files = ['./', ...Object.keys(bundle).map((f) => './' + f)];
      const statics = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
      files.push(...statics.map((f) => './' + f));
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const sw = readFileSync('src/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

/** Bản 1 file: nhúng icon SVG dạng data URI. */
function inlineIcon(): Plugin {
  return {
    name: 'rcs-inline-icon',
    transformIndexHtml(html) {
      const svg = readFileSync('public/icon.svg', 'utf8');
      return html.replace('href="./icon.svg"', `href="data:image/svg+xml,${encodeURIComponent(svg)}"`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: { __SINGLE__: JSON.stringify(single) },
    plugins: single ? [inlineIcon(), viteSingleFile()] : [pwa()],
    publicDir: single ? false : 'public',
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
    },
    test: { include: ['tests/**/*.test.ts'] },
  };
});
