import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { signAccess, verifyRefresh, hashToken } from '@/lib/jwt'
import type { RefreshTokenRow, UsuarioRow } from '@/lib/db.types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse('unauthorized', 'Refresh token requerido')
  }

  const { refreshToken } = body as { refreshToken?: string }
  if (!refreshToken) {
    return errResponse('unauthorized', 'Refresh token requerido')
  }

  let userId: string
  try {
    const payload = verifyRefresh(refreshToken)
    userId = payload.userId
  } catch {
    return errResponse('unauthorized', 'Refresh token inválido o expirado')
  }

  const tokenHash = hashToken(refreshToken)
  const { data: stored } = await supabase
    .from('refresh_tokens')
    .select('id, usuario_id, token_hash, revocado, expira_en')
    .eq('token_hash', tokenHash)
    .single<RefreshTokenRow>()

  if (!stored || stored.revocado || new Date(stored.expira_en) < new Date()) {
    return errResponse('unauthorized', 'Refresh token inválido o expirado')
  }

  const { data: user } = await supabase
    .from('usuarios')
    .select('id, rol, activo')
    .eq('id', userId)
    .single<Pick<UsuarioRow, 'id' | 'rol' | 'activo'>>()

  if (!user || !user.activo) {
    return errResponse('unauthorized', 'Usuario inactivo')
  }

  return NextResponse.json({ accessToken: signAccess(user.id, user.rol) })
}
