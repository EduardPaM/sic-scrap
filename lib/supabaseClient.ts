import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Preserve only the error flag before Auth consumes and cleans the callback URL.
export const authRedirectFailed = typeof window !== 'undefined' && (
  new URLSearchParams(window.location.hash.slice(1)).has('error') ||
  new URLSearchParams(window.location.search).has('error')
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
