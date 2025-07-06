// radhe radhe

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables are missing!');
    console.error('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_API_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase