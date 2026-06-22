import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { signAccess, signRefresh, hashToken } from '@/lib/jwt'
import { LoginSchema } from '@/lib/shared'
import type { UsuarioRow } from '@/lib/db.types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse('validation', 'Body JSON inválido')
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return errResponse('validation', parsed.error.flatten().fieldErrors)
  }

  const { email, password } = parsed.data

  const { data: user } = await supabase
    .from('usuarios')
    .select('id, nombre, email, password_hash, rol, activo, creado_en, actualizado_en')
    .eq('email', email.toLowerCase())
    .single<UsuarioRow>()

  if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
    return errResponse('invalid_credentials', 'Credenciales incorrectas')
  }

  const accessToken = signAccess(user.id, user.rol)
  const refreshToken = signRefresh(user.id)
  const tokenHash = hashToken(refreshToken)
  const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('refresh_tokens').insert({
    usuario_id: user.id,
    token_hash: tokenHash,
    expira_en: expiraEn,
    revocado: false,
  })

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  })
}
