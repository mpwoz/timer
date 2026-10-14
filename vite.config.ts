import { defineConfig } from 'vite';

// Relative base so the build works both at https://<user>.github.io/timer/ and locally.
export default defineConfig({
  base: './',
});
