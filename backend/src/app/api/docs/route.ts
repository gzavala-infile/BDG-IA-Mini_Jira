import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth-guard'
import { errResponse } from '@/lib/errors'

export const runtime = 'nodejs'

const SWAGGER_UI_VERSION = '5.17.14'

export function GET(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok || auth.user.rol !== 'admin') {
    return errResponse('forbidden', 'Acceso restringido')
  }
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mini Jira API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn" crossorigin="anonymous" />
  <style>
    body { margin: 0; background: #f9f9ff; }
    .swagger-ui .topbar { background: #003d9b; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js" integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep" crossorigin="anonymous"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        // Permite probar con el token manualmente desde la UI
        return req;
      },
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
