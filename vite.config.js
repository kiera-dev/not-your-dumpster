import { defineConfig } from 'vite';

export default defineConfig({
  // itch.io serves uploaded HTML games from a generated subdirectory.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
