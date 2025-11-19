// test-supabase.js
// Test connessione Supabase per BONK BATTLE

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

console.log('🧪 BONK BATTLE - Testing Supabase Connection\n')
console.log('='.repeat(50))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verifica che le variabili siano caricate
console.log('📋 Environment Variables:')
console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Loaded' : '❌ Missing')
console.log('  ANON_KEY:', supabaseKey ? '✅ Loaded' : '❌ Missing')
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing')
console.log('='.repeat(50))

if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ ERROR: Environment variables not loaded correctly!')
    console.error('   Make sure .env.local file exists in the app/ directory')
    process.exit(1)
}

// Crea client Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    try {
        console.log('\n🔌 Testing connection to Supabase...')

        // Test 1: Verifica che possiamo fare una query generica
        const { data, error } = await supabase
            .from('tokens')
            .select('count')
            .limit(1)

        // Se la tabella non esiste (errore PGRST116), va bene
        // Significa che siamo connessi ma dobbiamo creare le tabelle
        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                console.log('✅ Connection successful!')
                console.log('⚠️  Table "tokens" does not exist yet (this is OK)')
                console.log('   We will create it in the next step.\n')
                console.log('='.repeat(50))
                console.log('✅ STEP 1 COMPLETED: Supabase connection works!')
                console.log('='.repeat(50))
                process.exit(0)
            } else {
                console.error('❌ Unexpected error:', error.message)
                console.error('   Code:', error.code)
                process.exit(1)
            }
        }

        // Se non c'è errore, la tabella esiste già
        console.log('✅ Connection successful!')
        console.log('✅ Table "tokens" exists')
        console.log('\n' + '='.repeat(50))
        console.log('✅ STEP 1 COMPLETED: Supabase connection works!')
        console.log('='.repeat(50))
        process.exit(0)

    } catch (err) {
        console.error('\n❌ Connection test failed!')
        console.error('   Error:', err.message)
        console.error('\n🔍 Possible issues:')
        console.error('   1. Check your internet connection')
        console.error('   2. Verify Supabase credentials in .env.local')
        console.error('   3. Make sure Supabase project is active')
        process.exit(1)
    }
}

testConnection()