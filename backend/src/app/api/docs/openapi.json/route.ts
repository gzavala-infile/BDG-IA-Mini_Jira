import { NextRequest, NextResponse } from 'next/server'
import { generateOpenApiDocument } from '@/lib/openapi'
import { getAuth } from '@/lib/auth-guard'
import { errResponse } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok || auth.user.rol !== 'admin') {
    return errResponse('forbidden', 'Acceso restringido')
  }
  const doc = generateOpenApiDocument()
  return NextResponse.json(doc)
}
