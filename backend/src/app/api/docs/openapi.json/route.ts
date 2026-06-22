import { NextResponse } from 'next/server'
import { generateOpenApiDocument } from '@/lib/openapi'

export const runtime = 'nodejs'
// Regenerar en cada request para que refleje el servidor actual
export const dynamic = 'force-dynamic'

export function GET() {
  const doc = generateOpenApiDocument()
  return NextResponse.json(doc)
}
