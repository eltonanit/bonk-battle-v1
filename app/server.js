// server.js
// Backend per ricevere webhook da Helius e sincronizzare con Supabase

require('dotenv').config({ path: '.env.local' })
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { Connection, PublicKey } = require('@solana/web3.js')

const app = express()
const PORT = process.env.PORT || 3001

// Setup
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Usa service role per write
)

const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL)
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID)

console.log('🚀 BONK BATTLE Backend Starting...')
console.log('📡 Program ID:', PROGRAM_ID.toString())
console.log('🗄️  Database:', process.env.NEXT_PUBLIC_SUPABASE_URL)

// ==================================================================
// HELIUS WEBHOOK ENDPOINT
// ==================================================================
app.post('/api/webhooks/helius', async (req, res) => {
    try {
        console.log('\n🔔 Webhook received from Helius')
        console.log('='.repeat(60))

        const events = Array.isArray(req.body) ? req.body : [req.body]

        for (const event of events) {
            console.log('📦 Processing event...')
            console.log('   Type:', event.type)
            console.log('   Signature:', event.signature)

            // Parse transaction events
            if (event.type === 'ENHANCED_TRANSACTION') {
                await processTransaction(event)
            }
        }

        res.status(200).json({ success: true })

    } catch (error) {
        console.error('❌ Webhook error:', error.message)
        res.status(500).json({ error: error.message })
    }
})

// ==================================================================
// PROCESS TRANSACTION
// ==================================================================
async function processTransaction(event) {
    try {
        const { signature, timestamp, events: txEvents, accountData } = event

        // Check if transaction involves our program
        const programInvolved = accountData?.some(
            acc => acc.account === PROGRAM_ID.toString()
        )

        if (!programInvolved) {
            console.log('   ⏭️  Skipping: Not our program')
            return
        }

        console.log('   ✅ Our program detected!')

        // Parse instruction logs to detect event types
        const logs = event.logs || []

        // Detect "GladiatorForged" (Token Created)
        if (logs.some(log => log.includes('GladiatorForged'))) {
            console.log('   🪙 Event: Token Created')
            await handleTokenCreated(event, signature, timestamp)
        }

        // Detect "TokenPurchased" (Buy)
        if (logs.some(log => log.includes('TokenPurchased'))) {
            console.log('   💰 Event: Token Bought')
            await handleTokenPurchased(event, signature, timestamp)
        }

        // Detect "TokenSold" (Sell)
        if (logs.some(log => log.includes('TokenSold'))) {
            console.log('   💸 Event: Token Sold')
            await handleTokenSold(event, signature, timestamp)
        }

        // Detect "BattleStarted"
        if (logs.some(log => log.includes('BattleStarted'))) {
            console.log('   ⚔️  Event: Battle Started')
            await handleBattleStarted(event, signature, timestamp)
        }

        // Detect "VictoryAchieved"
        if (logs.some(log => log.includes('VictoryAchieved'))) {
            console.log('   🏆 Event: Victory!')
            await handleVictory(event, signature, timestamp)
        }

    } catch (error) {
        console.error('   ❌ Error processing transaction:', error.message)
    }
}

// ==================================================================
// EVENT HANDLERS
// ==================================================================

async function handleTokenCreated(event, signature, timestamp) {
    try {
        // Parse accounts from transaction
        const accounts = event.accountData || []

        // Find mint account (look for token program)
        const mintAccount = accounts.find(acc =>
            acc.tokenProgramId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        )

        if (!mintAccount) {
            console.log('   ⚠️  Could not find mint account')
            return
        }

        const mint = mintAccount.account
        const creator = event.feePayer // Transaction signer is creator

        console.log('   Mint:', mint)
        console.log('   Creator:', creator)

        // Save to database
        const { data, error } = await supabase
            .from('tokens')
            .insert({
                mint,
                symbol: 'UNKNOWN', // We'll fetch metadata separately
                name: 'Unknown Token',
                creator_wallet: creator,
                status: 'created',
                market_cap_usd: 5000,
                sol_collected: 0,
                created_at: new Date(timestamp * 1000).toISOString()
            })
            .select()

        if (error) {
            console.error('   ❌ DB Error:', error.message)
            return
        }

        console.log('   ✅ Token saved to database!')

        // Create activity feed entry
        await supabase.from('activity_feed').insert({
            user_wallet: creator,
            action_type: 'created_token',
            token_mint: mint,
            data: { signature },
            created_at: new Date(timestamp * 1000).toISOString()
        })

        console.log('   ✅ Activity feed updated!')

        // Award points
        await awardPoints(creator, 50, 'create_token', { mint })

    } catch (error) {
        console.error('   ❌ handleTokenCreated error:', error.message)
    }
}

async function handleTokenPurchased(event, signature, timestamp) {
    try {
        const buyer = event.feePayer
        // Parse mint from transaction (simplified)
        console.log('   Buyer:', buyer)

        // Create activity feed entry
        await supabase.from('activity_feed').insert({
            user_wallet: buyer,
            action_type: 'bought_token',
            data: { signature },
            created_at: new Date(timestamp * 1000).toISOString()
        })

        // Award points
        await awardPoints(buyer, 200, 'buy_token', { signature })

        console.log('   ✅ Buy event recorded!')

    } catch (error) {
        console.error('   ❌ handleTokenPurchased error:', error.message)
    }
}

async function handleTokenSold(event, signature, timestamp) {
    try {
        const seller = event.feePayer
        console.log('   Seller:', seller)

        // Create activity feed entry
        await supabase.from('activity_feed').insert({
            user_wallet: seller,
            action_type: 'sold_token',
            data: { signature },
            created_at: new Date(timestamp * 1000).toISOString()
        })

        console.log('   ✅ Sell event recorded!')

    } catch (error) {
        console.error('   ❌ handleTokenSold error:', error.message)
    }
}

async function handleBattleStarted(event, signature, timestamp) {
    console.log('   ⚔️  Battle started (handler to implement)')
}

async function handleVictory(event, signature, timestamp) {
    console.log('   🏆 Victory (handler to implement)')
}

// ==================================================================
// POINTS SYSTEM
// ==================================================================
async function awardPoints(wallet, amount, reason, metadata = {}) {
    try {
        // Ensure user exists
        const { data: user } = await supabase
            .from('users')
            .select('wallet_address, points')
            .eq('wallet_address', wallet)
            .single()

        if (!user) {
            // Create user with welcome bonus
            await supabase.from('users').insert({
                wallet_address: wallet,
                points: 1000 + amount, // Welcome bonus + action points
                welcome_bonus_claimed: true
            })

            // Record welcome bonus
            await supabase.from('points_history').insert({
                user_wallet: wallet,
                amount: 1000,
                reason: 'welcome_bonus'
            })
        } else {
            // Update points
            await supabase
                .from('users')
                .update({ points: user.points + amount })
                .eq('wallet_address', wallet)
        }

        // Record points history
        await supabase.from('points_history').insert({
            user_wallet: wallet,
            amount,
            reason,
            metadata
        })

        console.log(`   ⭐ Awarded ${amount} points to ${wallet}`)

    } catch (error) {
        console.error('   ❌ awardPoints error:', error.message)
    }
}

// ==================================================================
// API ENDPOINTS (For Frontend)
// ==================================================================

// Get recent events for FOMO ticker
app.get('/api/events/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50

        const { data, error } = await supabase
            .from('activity_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get user notifications
app.get('/api/notifications/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_wallet', wallet)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('wallet_address, username, points, tier, avatar_url')
            .order('points', { ascending: false })
            .limit(100)

        if (error) throw error

        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ==================================================================
// START SERVER
// ==================================================================
const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60))
    console.log(`✅ Server running on http://localhost:${PORT}`)
    console.log('='.repeat(60))
    console.log('📡 Webhook endpoint: POST /api/webhooks/helius')
    console.log('🔥 Events endpoint: GET /api/events/recent')
    console.log('🔔 Notifications: GET /api/notifications/:wallet')
    console.log('🏆 Leaderboard: GET /api/leaderboard')
    console.log('='.repeat(60))
    console.log('\n⏳ Waiting for Helius webhooks...\n')
})

// Prevent server from closing
server.on('error', (error) => {
    console.error('❌ Server error:', error)
})

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error)
})

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error)
})

// Keep alive
setInterval(() => {
    // Ping every 30 seconds to keep process alive
}, 30000)