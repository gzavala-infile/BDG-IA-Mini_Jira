import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SWAGGER_UI_VERSION = '5.17.14'

export function GET() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mini Jira API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f9f9ff; }
    .swagger-ui .topbar { background: #003d9b; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
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
