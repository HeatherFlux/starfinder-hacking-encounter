// Worker entry point for hacking session sync
// Routes WebSocket requests to the appropriate Durable Object

import { HackingSession } from './HackingSession'

export { HackingSession }

export interface Env {
  HACKING_SESSIONS: DurableObjectNamespace
  // Optional: comma-separated list of allowed origins (e.g., "https://myapp.com,https://localhost:3000")
  // If not set, allows all origins
  ALLOWED_ORIGINS?: string
  // Optional: secret token required to connect as GM
  // If not set, anyone can claim GM role
  GM_SECRET?: string
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '*'

  // If no allowlist configured, allow all
  if (!env.ALLOWED_ORIGINS) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection, X-GM-Secret',
    }
  }

  // Check if origin is in allowlist
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  const isAllowed = allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection, X-GM-Secret',
    'Vary': 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const corsHeaders = getCorsHeaders(request, env)

    // CORS headers for preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Route: /ws/:sessionId
    const wsMatch = url.pathname.match(/^\/ws\/([a-zA-Z0-9-]+)/)
    if (wsMatch) {
      const sessionId = wsMatch[1]

      // Determine role
      let role: 'gm' | 'player' = 'player'
      const requestedRole = url.searchParams.get('role')

      if (requestedRole === 'gm') {
        // If GM_SECRET is configured, require it
        if (env.GM_SECRET) {
          const providedSecret = request.headers.get('X-GM-Secret') || url.searchParams.get('secret')
          if (providedSecret !== env.GM_SECRET) {
            return new Response(JSON.stringify({
              error: 'UNAUTHORIZED',
              message: 'Invalid or missing GM secret'
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
          }
        }
        role = 'gm'
      }

      // Get Durable Object stub by session ID
      const id = env.HACKING_SESSIONS.idFromName(sessionId)
      const stub = env.HACKING_SESSIONS.get(id)

      // Forward the request with validated role
      const doUrl = new URL(request.url)
      doUrl.searchParams.set('role', role)
      const doRequest = new Request(doUrl.toString(), request)

      return stub.fetch(doRequest)
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'hacking-sync',
        timestamp: new Date().toISOString(),
        gmAuthEnabled: !!env.GM_SECRET,
        corsRestricted: !!env.ALLOWED_ORIGINS,
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Root redirect to main app
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(url.origin, 302)
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  }
}
