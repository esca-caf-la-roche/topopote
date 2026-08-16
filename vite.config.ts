import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const base = process.env.GITHUB_ACTIONS ? '/topopote/' : '/'
  const isProduction = command === 'build' && mode === 'production'
  const pageTitle = isProduction ? 'Topopote' : 'DEV Topopote'
  const faviconPath = `${base}${isProduction ? 'favicon.svg' : 'favicon-dev.svg'}`

  return {
    plugins: [
      react(),
      {
        name: 'topopote-page-identity',
        transformIndexHtml(html) {
          return html
            .replace('%PAGE_TITLE%', pageTitle)
            .replace('%FAVICON_PATH%', faviconPath)
        },
      },
    ],
    base,
  }
})
