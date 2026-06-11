import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Capacitor向けは base='/'、GitHub Pages向けは base='/badminton-score-app/'
// `vite build --mode pages` でPages用ビルド
export default defineConfig(({ mode }) => {
  const base = mode === 'pages' ? '/badminton-score-app/' : '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'バドミントン スコアシート',
          short_name: 'バドスコア',
          description: 'バドミントン試合のスコアを記録するアプリ',
          theme_color: '#1a3a5c',
          background_color: '#0d2137',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
