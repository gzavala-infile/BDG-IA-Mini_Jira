import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env['SUPABASE_URL']
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

// Singleton con service_role key — bypasa RLS. Solo usar en server-side.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
