import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080,
        // Optional: point at `vercel dev` (port 3000) so the shared board works locally.
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
                // If vercel dev isn't running, the client falls back to localStorage.
                configure: (proxy) => {
                    proxy.on('error', () => {});
                },
            },
        },
    },
});
