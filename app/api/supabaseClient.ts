import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'; 

// This initialized client handles all your PostgreSQL traffic
export const supabase = createClient(supabaseUrl, supabaseSecretKey);