// app/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Load env vars if running in standalone script context
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
        require('dotenv').config({ path: '.env.local' });
    } catch (e) {
        // dotenv might not be available in all contexts
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    },
    db: {
        schema: 'public',
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Export a server-side client with service role for admin operations
export const createServerSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not available, using anon key');
        return supabase;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        global: {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};