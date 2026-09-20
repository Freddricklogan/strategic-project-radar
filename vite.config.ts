import { defineConfig } from 'vite';

// The Pages URL is https://freddricklogan.github.io/strategic-project-radar/ — the base must match.
export default defineConfig({
  base: '/strategic-project-radar/',
  build: {
    target: 'es2022',
    sourcemap: false,
    // One entry chunk; no vendor split needed at this size. modulePreload is bundled, not inline.
    modulePreload: { polyfill: true }
  }
});
