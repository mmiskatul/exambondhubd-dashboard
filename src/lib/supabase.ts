import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvupwjyzddqohnmgphjm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DtvA-9Xbiv1DA1Au2Le21A_x7PQdOQa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
