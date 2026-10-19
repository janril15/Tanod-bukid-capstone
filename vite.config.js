import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const protectedPages = new Set([
  '/profile-setup.html',
  '/dashboard.html',
  '/Tanod Bukid Dash Board (1)/index (1).html',
  '/dist/profile-setup.html',
  '/dist/dashboard.html',
  '/dist/Tanod Bukid Dash Board (1)/index (1).html',
])

function authPageGuard() {
  return async (request, response, next) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)
    } catch {
      response.statusCode = 400
      response.end('Invalid request path.')
      return
    }
    if (!protectedPages.has(pathname)) {
      next()
      return
    }

    try {
      const sessionResponse = await fetch('http://127.0.0.1:8000/api/session.php', {
        headers: request.headers.cookie ? { cookie: request.headers.cookie } : {},
      })
      const session = await sessionResponse.json()
      if (!sessionResponse.ok || !session.authenticated) {
        response.statusCode = 302
        response.setHeader('Location', '/index.html#signin')
        response.end()
        return
      }
      next()
    } catch {
      response.statusCode = 503
      response.end('Authentication service unavailable. Start the PHP server on port 8000.')
    }
  }
}

const phpApiProxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tanodbukid-auth-page-guard',
      configureServer(server) {
        server.middlewares.use(authPageGuard())
      },
      configurePreviewServer(server) {
        server.middlewares.use(authPageGuard())
      },
    },
  ],
  server: { proxy: phpApiProxy },
  preview: { proxy: phpApiProxy },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        profile: resolve(__dirname, 'profile-setup.html'),
        home: resolve(__dirname, 'Tanod Bukid Dash Board (1)/index (1).html'),
      },
    },
  },
})
