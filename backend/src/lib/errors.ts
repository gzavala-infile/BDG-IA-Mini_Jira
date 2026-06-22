import { NextResponse } from 'next/server'

type ApiErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'forbidden'
  | 'archived'
  | 'not_found'
  | 'conflict'
  | 'version_conflict'
  | 'inactive_user'
  | 'locked'

const HTTP_STATUS: Record<ApiErrorCode, number> = {
  validation: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  forbidden: 403,
  archived: 403,
  not_found: 404,
  conflict: 409,
  version_conflict: 409,
  inactive_user: 422,
  locked: 409,
}

export function errResponse(code: ApiErrorCode, message: unknown) {
  return NextResponse.json({ error: code, message }, { status: HTTP_STATUS[code] })
}
