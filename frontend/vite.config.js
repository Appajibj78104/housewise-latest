import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: {
      // Only alias react and react-dom (no sub-path exports to break).
      // Do NOT alias react-router — it has sub-path exports (react-router/dom)
      // that break when aliased because esbuild treats them as file paths.
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    hmr: { overlay: true },
    // Prevent the browser from caching dep modules across restarts.
    headers: {
      'Cache-Control': 'no-store',
    },
  },

  optimizeDeps: {
    // Explicitly pre-bundle these. Do NOT include react-router/dom —
    // esbuild can't resolve package sub-path exports via optimizeDeps.include.
    include: [
      'react', 'react/jsx-runtime', 'react/jsx-dev-runtime',
      'react-dom', 'react-dom/client',
      'react-router', 'react-router-dom',
      'framer-motion', 'gsap', 'lucide-react', 'react-hot-toast',
      'clsx', 'tailwind-merge', 'react-countup',
      'react-intersection-observer', 'react-parallax-tilt',
      'axios', 'react-hook-form',
      '@hookform/resolvers', '@hookform/resolvers/yup', 'yup',
      'lenis', 'leaflet', 'react-leaflet', 'react-leaflet-cluster',
      'socket.io-client',
    ],
  },

  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Chunk size warning
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React runtime
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Animation — heavy
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-motion';
            }
            // GSAP
            if (id.includes('gsap')) {
              return 'vendor-gsap';
            }
            // Map libraries
            if (id.includes('leaflet')) {
              return 'vendor-maps';
            }
            // Icons — large tree-shakeable lib
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Form handling
            if (id.includes('react-hook-form') || id.includes('hookform') || id.includes('yup')) {
              return 'vendor-forms';
            }
            // HTTP
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            // Smooth scroll
            if (id.includes('lenis')) {
              return 'vendor-lenis';
            }
          }
        },
      },
    },
    // Minify with esbuild (faster than terser, good enough)
    minify: 'esbuild',
    // Source maps off for production
    sourcemap: false,
  },
})
