import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → normal static build in dist/
// `npm run build:single` → one self-contained HTML file (assets inlined) in dist-single/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: mode === 'single'
    ? { outDir: 'dist-single', assetsInlineLimit: 100000000 }
    : { outDir: 'dist' },
}))
