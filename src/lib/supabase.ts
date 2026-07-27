import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eforgdbrwckisnncfuoe.supabase.co'
const supabaseAnonKey = 'sb_publishable_hX8tLSrw3h4cTpyNyG1sxw_euVoOHSs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)