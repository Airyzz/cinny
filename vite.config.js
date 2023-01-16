import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { svgLoader } from './viteSvgLoader';

import { internalIpV4 } from 'internal-ip'

const copyFiles = {
  targets: [
    {
      src: 'node_modules/@matrix-org/olm/olm.wasm',
      dest: '',
    },
    {
      src: '_redirects',
      dest: '',
    },
    {
      src: 'config.json',
      dest: '',
    },
    {
      src: 'public/res/android',
      dest: 'public/',
    }
  ],
}

export default defineConfig(async () => {
  const host = await internalIpV4()

  const config = {
    appType: 'spa',
    publicDir: false,
    server: {
      host: '0.0.0.0', // listen on all addresses
      port: 8080,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host,
        port: 8080,
      },
    },
    plugins: [
      viteStaticCopy(copyFiles),
      svgLoader(),
      wasm(),
      react(),
    ],
    build: {
      outDir: 'dist',
      sourcemap: true,
      copyPublicDir: false,
    },
  }

  return config
});
