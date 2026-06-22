import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import { hashToken } from '@/lib/jwt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body opcional
  }

  const { refreshToken } = body as { refreshToken?: string }
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken)
    await supabase
      .from('refresh_tokens')
      .update({ revocado: true })
      .eq('token_hash', tokenHash)
  }

  return new NextResponse(null, { status: 204 })
}
