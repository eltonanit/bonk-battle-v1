// =================================================================
// FILE: contracts/programs/contracts/src/lib.rs
// BONK BATTLE V2 - SOL-BASED BONDING CURVE + TIER SYSTEM
// All victory conditions in SOL (price-independent!)
// =================================================================
// ⭐ FIX V3: Use tokens_sold directly in bonding curve calculations
// =================================================================

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::rent::Rent;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, MintTo},
};

declare_id!("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

// =================================================================
// SECURITY CONSTANTS - HARDCODED FOR BULLETPROOF OPERATION
// =================================================================

const TREASURY_WALLET: &str = "5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf";
const KEEPER_AUTHORITY: &str = "65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea";

// =================================================================
// TOKEN SUPPLY PARAMETERS (SAME FOR ALL TIERS)
// =================================================================

const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1B * 10^9 = 10^18
const BONDING_CURVE_SUPPLY: u64 = 793_100_000_000_000_000; // 793.1M * 10^9 (79.31%)
const RAYDIUM_RESERVED_SUPPLY: u64 = 206_900_000_000_000_000; // 206.9M * 10^9 (20.69%)

// =================================================================
// TIER SYSTEM - ALL VALUES IN SOL (LAMPORTS) - PRICE INDEPENDENT!
// =================================================================

// Active tier selector (change this to switch tiers)
// Set to true for TEST tier, false for PRODUCTION tier
const USE_TEST_TIER: bool = false;

// ============ TIER TEST ============
// MC Iniziale: ~$280 | MC Finale: ~$820 (@ $137/SOL) | Multiplier: ~2.93x
// Per testing rapido su devnet - battaglie in minuti

/// Target SOL per graduation TIER TEST
const TEST_TARGET_SOL: u64 = 6_000_000_000; // 6 SOL in lamports

/// Volume target per vittoria TIER TEST (110% di TARGET_SOL)
const TEST_VICTORY_VOLUME_SOL: u64 = 6_600_000_000; // 6.6 SOL in lamports

/// Qualification threshold TIER TEST (circa 2% del target)
const TEST_QUALIFICATION_SOL: u64 = 120_000_000; // 0.12 SOL (~$16 @ $137)


// ============ TIER PRODUCTION (AGGRESSIVO) ============
// MC Iniziale: ~$1,700 | MC Finale: ~$25,000 (@ $137/SOL) | Multiplier: ~14.68x
// Battaglie veloci: 4-12 ore

/// Target SOL per graduation TIER PROD
const PROD_TARGET_SOL: u64 = 37_700_000_000; // 37.7 SOL in lamports

/// Volume target per vittoria TIER PROD (110% di TARGET_SOL)
const PROD_VICTORY_VOLUME_SOL: u64 = 41_500_000_000; // 41.5 SOL in lamports

/// Qualification threshold TIER PROD (circa 2% del target)
const PROD_QUALIFICATION_SOL: u64 = 750_000_000; // 0.75 SOL (~$103 @ $137)


// =================================================================
// COMPUTED TIER PARAMETERS (based on USE_TEST_TIER flag)
// =================================================================

/// Get the target SOL for current tier
const fn get_target_sol() -> u64 {
    if USE_TEST_TIER { TEST_TARGET_SOL } else { PROD_TARGET_SOL }
}

/// Get the victory volume for current tier  
const fn get_victory_volume_sol() -> u64 {
    if USE_TEST_TIER { TEST_VICTORY_VOLUME_SOL } else { PROD_VICTORY_VOLUME_SOL }
}

/// Get the qualification threshold for current tier
const fn get_qualification_sol() -> u64 {
    if USE_TEST_TIER { TEST_QUALIFICATION_SOL } else { PROD_QUALIFICATION_SOL }
}

// Use computed values
const TARGET_SOL: u64 = get_target_sol();
const VICTORY_VOLUME_SOL: u64 = get_victory_volume_sol();
const QUALIFICATION_SOL: u64 = get_qualification_sol();

// =================================================================
// MATCHMAKING & BATTLE PARAMETERS
// =================================================================

/// Matchmaking tolerance (quanto possono differire due token per fare match)
/// 50% del target SOL
const MATCHMAKING_TOLERANCE_SOL: u64 = if USE_TEST_TIER { 
    3_000_000_000  // 3 SOL for test
} else { 
    18_850_000_000 // 18.85 SOL for prod (50% of 37.7)
};

// =================================================================
// FEE STRUCTURE
// =================================================================

const TRADING_FEE_BPS: u64 = 200; // 2.00%
const PLATFORM_FEE_BPS: u64 = 500; // 5.00%

// =================================================================
// SECURITY LIMITS
// =================================================================

const MAX_SOL_PER_TX: u64 = 100_000_000_000; // 100 SOL max
const MIN_SOL_PER_TX: u64 = 1_000_000; // 0.001 SOL min

// =================================================================
// ORACLE UPDATE INTERVAL
// =================================================================

const PRICE_UPDATE_INTERVAL: i64 = 86400; // 24 ore in secondi

#[program]
pub mod bonk_battle {
    use super::*;

    // =================================================================
    // ORACLE PRICE MANAGEMENT (for display purposes only!)
    // =================================================================
    
    pub fn initialize_price_oracle(
        ctx: Context<InitializePriceOracle>,
        initial_sol_price: u64,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.price_oracle;
        let current_time = Clock::get()?.unix_timestamp;
        
        oracle.sol_price_usd = initial_sol_price;
        oracle.last_update_timestamp = current_time;
        oracle.next_update_timestamp = current_time + PRICE_UPDATE_INTERVAL;
        oracle.keeper_authority = ctx.accounts.keeper_authority.key();
        oracle.update_count = 0;
        
        msg!("📊 Oracle initialized: SOL price = ${}.{} USD", 
             initial_sol_price / 1_000_000, 
             (initial_sol_price % 1_000_000) / 10_000);
        
        Ok(())
    }
    
    pub fn update_sol_price(
        ctx: Context<UpdateSolPrice>,
        new_sol_price: u64,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.price_oracle;
        let current_time = Clock::get()?.unix_timestamp;
        
        let previous_price = oracle.sol_price_usd;
        
        oracle.sol_price_usd = new_sol_price;
        oracle.last_update_timestamp = current_time;
        oracle.next_update_timestamp = current_time + PRICE_UPDATE_INTERVAL;
        oracle.update_count = oracle.update_count.saturating_add(1);
        
        emit!(PriceUpdated {
            previous_price,
            new_price: new_sol_price,
            timestamp: current_time,
            update_number: oracle.update_count,
        });
        
        msg!("💹 SOL price updated: ${}.{} → ${}.{} USD", 
             previous_price / 1_000_000, (previous_price % 1_000_000) / 10_000,
             new_sol_price / 1_000_000, (new_sol_price % 1_000_000) / 10_000);
        
        Ok(())
    }

    // =================================================================
    // PHASE 1: GLADIATOR CREATION
    // =================================================================

    pub fn create_battle_token(
        ctx: Context<CreateBattleToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(
            name.len() <= 50 && !name.is_empty(),
            BonkError::InvalidTokenName
        );
        require!(
            symbol.len() <= 10 && !symbol.is_empty(),
            BonkError::InvalidTokenSymbol
        );
        require!(uri.len() <= 200, BonkError::InvalidTokenUri);

        msg!("🏛️ FORGING GLADIATOR: {} ({})", name, symbol);
        msg!("⚙️ TIER: {} | Target: {} SOL | Volume: {} SOL",
             if USE_TEST_TIER { "TEST" } else { "PRODUCTION" },
             TARGET_SOL / 1_000_000_000,
             VICTORY_VOLUME_SOL / 1_000_000_000);

        let battle_state_info = ctx.accounts.token_battle_state.to_account_info();
        let mint_key = ctx.accounts.mint.key();
        
        let battle_state = &mut ctx.accounts.token_battle_state;

        battle_state.mint = mint_key;
        battle_state.sol_collected = 0;
        battle_state.tokens_sold = 0;
        battle_state.total_trade_volume = 0;
        battle_state.is_active = true;
        battle_state.battle_status = BattleStatus::Created;
        battle_state.opponent_mint = Pubkey::default();
        battle_state.creation_timestamp = Clock::get()?.unix_timestamp;
        battle_state.last_trade_timestamp = 0;
        battle_state.battle_start_timestamp = 0;
        battle_state.victory_timestamp = 0;
        battle_state.listing_timestamp = 0;
        battle_state.bump = ctx.bumps.token_battle_state;
        // ⭐ SALVA METADATA
        battle_state.name = name.clone();
        battle_state.symbol = symbol.clone();
        battle_state.uri = uri.clone();

        let seeds = &[b"battle_state", mint_key.as_ref(), &[battle_state.bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_interface::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.contract_token_account.to_account_info(),
                    authority: battle_state_info,
                },
                signer_seeds,
            ),
            TOTAL_SUPPLY,
        )?;

        // Calculate initial MC in USD for display (using oracle price)
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let initial_mc_usd = calculate_market_cap_usd_from_sol(0, sol_price)?;

        emit!(GladiatorForged {
            mint: mint_key,
            creator: ctx.accounts.user.key(),
            target_sol: TARGET_SOL,
            victory_volume_sol: VICTORY_VOLUME_SOL,
            initial_market_cap_usd: initial_mc_usd,
            sol_price_at_creation: sol_price,
            is_test_tier: USE_TEST_TIER,
            timestamp: battle_state.creation_timestamp,
        });

        msg!(
            "✅ GLADIATOR FORGED! Target: {} SOL | Volume: {} SOL | Initial MC: ~${} USD",
            TARGET_SOL / 1_000_000_000,
            VICTORY_VOLUME_SOL / 1_000_000_000,
            initial_mc_usd
        );
        Ok(())
    }

    // =================================================================
    // PHASE 2: BONDING CURVE TRADING
    // =================================================================

    pub fn buy_token(ctx: Context<BuyToken>, sol_amount: u64) -> Result<()> {
        require!(sol_amount >= MIN_SOL_PER_TX, BonkError::AmountTooSmall);
        require!(sol_amount <= MAX_SOL_PER_TX, BonkError::AmountTooLarge);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        // ⭐ FIX: Calculate fee first to use NET amount for graduation check
        let fee_for_check = sol_amount
            .checked_mul(TRADING_FEE_BPS)
            .ok_or(BonkError::MathOverflow)?
            .checked_div(10000)
            .ok_or(BonkError::MathOverflow)?;
        let net_amount_for_check = sol_amount
            .checked_sub(fee_for_check)
            .ok_or(BonkError::MathOverflow)?;

        // Check with NET amount
        let total_sol_after = ctx.accounts.token_battle_state.sol_collected
            .checked_add(net_amount_for_check)
            .ok_or(BonkError::MathOverflow)?;

        // ⭐ AUTO-CAP LOGIC - Instead of rejecting, cap the amount
        let mut actual_sol_amount = sol_amount;
        let mut was_capped = false;

        if total_sol_after > TARGET_SOL {
            let remaining_capacity = TARGET_SOL
                .saturating_sub(ctx.accounts.token_battle_state.sol_collected);

            if remaining_capacity == 0 {
                msg!("🎓 Graduation threshold reached! Call check_victory_conditions.");
                return Err(BonkError::WouldExceedGraduation.into());
            }

            // Convert net remaining to gross amount needed
            // net = gross * (1 - fee), so gross = net * 10000 / (10000 - fee_bps)
            actual_sol_amount = remaining_capacity
                .checked_mul(10000)
                .ok_or(BonkError::MathOverflow)?
                .checked_div(10000 - TRADING_FEE_BPS)
                .ok_or(BonkError::MathOverflow)?;

            // Clamp to requested amount
            if actual_sol_amount > sol_amount {
                actual_sol_amount = sol_amount;
            }

            if actual_sol_amount < MIN_SOL_PER_TX {
                msg!("⚠️ Cannot buy: auto-capped amount {} below minimum {}",
                     actual_sol_amount, MIN_SOL_PER_TX);
                return Err(BonkError::WouldExceedGraduation.into());
            }

            was_capped = true;
            msg!("📊 AUTO-CAP: {} → {} lamports", sol_amount, actual_sol_amount);
        }

        // Use the (possibly capped) amount for rest of transaction
        let sol_amount = actual_sol_amount;

        // ⭐ FIX V3: Pass tokens_sold directly instead of deriving from sol_collected
        let tokens_to_give = calculate_buy_amount_optimized(
            sol_amount,
            ctx.accounts.token_battle_state.sol_collected,
            ctx.accounts.token_battle_state.tokens_sold,  // ⭐ NEW: Pass actual tokens_sold
        )?;

        require!(tokens_to_give > 0, BonkError::InsufficientOutput);

        let fee = sol_amount
            .checked_mul(TRADING_FEE_BPS)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let amount_to_collect = sol_amount.checked_sub(fee).unwrap();

        // Transfer SOL to battle state
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.token_battle_state.to_account_info(),
                },
            ),
            amount_to_collect,
        )?;

        // Transfer fee to treasury
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury_wallet.to_account_info(),
                },
            ),
            fee,
        )?;

        // Transfer tokens to user
        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.token_battle_state.bump;
        let seeds = &[b"battle_state", mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.contract_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.token_battle_state.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_to_give,
            9,
        )?;

        // Update state
        let battle_state = &mut ctx.accounts.token_battle_state;
        let old_status = battle_state.battle_status.clone();

        battle_state.sol_collected = battle_state
            .sol_collected
            .checked_add(amount_to_collect)
            .unwrap();
        battle_state.tokens_sold = battle_state.tokens_sold.checked_add(tokens_to_give).unwrap();
        battle_state.total_trade_volume = battle_state
            .total_trade_volume
            .checked_add(sol_amount) // Volume includes full amount (before fee)
            .unwrap();
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;

        // ⭐ SOL-BASED QUALIFICATION CHECK
        if battle_state.sol_collected >= QUALIFICATION_SOL && old_status == BattleStatus::Created {
            battle_state.battle_status = BattleStatus::Qualified;

            emit!(GladiatorQualified {
                mint: battle_state.mint,
                sol_collected: battle_state.sol_collected,
                qualification_threshold: QUALIFICATION_SOL,
                timestamp: battle_state.last_trade_timestamp,
            });

            msg!("🎯 GLADIATOR QUALIFIED! SOL: {}/{}",
                 battle_state.sol_collected / 1_000_000_000,
                 QUALIFICATION_SOL / 1_000_000_000);
        }

        // Check if graduation reached
        if battle_state.sol_collected >= TARGET_SOL {
            msg!(
                "🎓 GRADUATION REACHED! {} SOL collected (target: {} SOL)",
                battle_state.sol_collected / 1_000_000_000,
                TARGET_SOL / 1_000_000_000
            );
        }

        // Calculate USD values for display
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let current_mc_usd = calculate_market_cap_usd_from_sol(battle_state.sol_collected, sol_price)?;

        emit!(TokenPurchased {
            mint: battle_state.mint,
            buyer: ctx.accounts.user.key(),
            sol_amount,
            tokens_received: tokens_to_give,
            sol_collected: battle_state.sol_collected,
            total_volume_sol: battle_state.total_trade_volume,
            market_cap_usd: current_mc_usd,
            sol_price,
        });

        let progress_percent = (battle_state.sol_collected as u128)
            .checked_mul(100).unwrap()
            .checked_div(TARGET_SOL as u128).unwrap() as u64;

        if was_capped {
            msg!(
                "💰 BUY (AUTO-CAPPED): {} tokens for {} SOL | Progress: {}% ({}/{} SOL)",
                tokens_to_give / 1_000_000_000,
                sol_amount / 1_000_000_000,
                progress_percent,
                battle_state.sol_collected / 1_000_000_000,
                TARGET_SOL / 1_000_000_000
            );
        } else {
            msg!(
                "💰 BUY: {} tokens for {} SOL | Progress: {}% ({}/{} SOL) | Status: {:?}",
                tokens_to_give / 1_000_000_000,
                sol_amount / 1_000_000_000,
                progress_percent,
                battle_state.sol_collected / 1_000_000_000,
                TARGET_SOL / 1_000_000_000,
                battle_state.battle_status
            );
        }
        Ok(())
    }
    
    pub fn sell_token(ctx: Context<SellToken>, token_amount: u64) -> Result<()> {
        require!(token_amount > 0, BonkError::AmountTooSmall);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        // ⭐ FIX V3: Pass tokens_sold directly instead of deriving from sol_collected
        let sol_to_return = calculate_sell_amount_optimized(
            token_amount,
            ctx.accounts.token_battle_state.sol_collected,
            ctx.accounts.token_battle_state.tokens_sold,  // ⭐ NEW: Pass actual tokens_sold
        )?;
        require!(sol_to_return > 0, BonkError::InsufficientOutput);
        require!(
            ctx.accounts.token_battle_state.sol_collected >= sol_to_return,
            BonkError::InsufficientLiquidity
        );

        // ⭐ FIX: Transfer tokens BACK to contract pool (instead of burning)
        // This preserves the tokens for:
        // 1. Future buys by other users
        // 2. Final Raydium liquidity (206.9M reserved)
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.contract_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            token_amount,
            9, // decimals
        )?;

        // Calculate fees
        let fee = sol_to_return
            .checked_mul(TRADING_FEE_BPS)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let amount_to_user = sol_to_return.checked_sub(fee).unwrap();

        // Transfer SOL
        let battle_state_account_info = ctx.accounts.token_battle_state.to_account_info();

        **battle_state_account_info.try_borrow_mut_lamports()? -= amount_to_user;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount_to_user;
        
        **battle_state_account_info.try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.treasury_wallet.to_account_info().try_borrow_mut_lamports()? += fee;
        
        // Update state
        let battle_state = &mut ctx.accounts.token_battle_state;
        battle_state.sol_collected = battle_state
            .sol_collected
            .checked_sub(sol_to_return)
            .unwrap();
        battle_state.tokens_sold = battle_state
            .tokens_sold
            .checked_sub(token_amount)
            .unwrap();
        // ⭐ SELL ADDS TO VOLUME TOO!
        battle_state.total_trade_volume = battle_state
            .total_trade_volume
            .checked_add(sol_to_return)
            .unwrap();
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;
        
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let new_mc_usd = calculate_market_cap_usd_from_sol(battle_state.sol_collected, sol_price)?;

        emit!(TokenSold {
            mint: battle_state.mint,
            seller: ctx.accounts.user.key(),
            token_amount,
            sol_received: amount_to_user,
            sol_collected: battle_state.sol_collected,
            total_volume_sol: battle_state.total_trade_volume,
            market_cap_usd: new_mc_usd,
            sol_price,
        });

        msg!(
            "💸 SELL: {} tokens for {} SOL | Volume: {} SOL",
            token_amount / 1_000_000_000,
            sol_to_return / 1_000_000_000,
            battle_state.total_trade_volume / 1_000_000_000
        );
        Ok(())
    }

    // =================================================================
    // BATTLE MECHANICS
    // =================================================================

    pub fn start_battle(ctx: Context<StartBattle>) -> Result<()> {
        msg!("⚔️ BATTLE COMMENCES!");
        
        let token_a = &mut ctx.accounts.token_a_state;
        let token_b = &mut ctx.accounts.token_b_state;

        require!(token_a.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_b.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_a.mint != token_b.mint, BonkError::SelfBattle);
        require!(token_a.is_active && token_b.is_active, BonkError::TradingInactive);

        // ⭐ SOL-BASED MATCHMAKING
        let sol_a = token_a.sol_collected;
        let sol_b = token_b.sol_collected;
        
        let sol_diff = if sol_a > sol_b { 
            sol_a - sol_b 
        } else { 
            sol_b - sol_a 
        };
        
        require!(sol_diff <= MATCHMAKING_TOLERANCE_SOL, BonkError::UnfairMatch);

        let battle_timestamp = Clock::get()?.unix_timestamp;
        
        token_a.battle_status = BattleStatus::InBattle;
        token_a.opponent_mint = token_b.mint;
        token_a.battle_start_timestamp = battle_timestamp;
        
        token_b.battle_status = BattleStatus::InBattle;
        token_b.opponent_mint = token_a.mint;
        token_b.battle_start_timestamp = battle_timestamp;

        emit!(BattleStarted {
            token_a: token_a.mint,
            token_b: token_b.mint,
            sol_a,
            sol_b,
            target_sol: TARGET_SOL,
            victory_volume_sol: VICTORY_VOLUME_SOL,
            timestamp: battle_timestamp,
        });

        msg!("🏟️ BATTLE STARTED! {} vs {} | SOL: {} vs {}", 
             token_a.mint, token_b.mint, 
             sol_a / 1_000_000_000, sol_b / 1_000_000_000);
        Ok(())
    }

    // =================================================================
    // ⭐ VICTORY CHECK - 100% SOL-BASED!
    // =================================================================

    pub fn check_victory_conditions(ctx: Context<CheckVictory>) -> Result<()> {
        let token_state = &mut ctx.accounts.token_battle_state;
        let oracle = &ctx.accounts.price_oracle;
        
        require!(token_state.battle_status == BattleStatus::InBattle, BonkError::NotInBattle);
        require!(token_state.is_active, BonkError::TradingInactive);

        // ⭐ ALL CHECKS ARE SOL-BASED (price independent!)
        let sol_collected = token_state.sol_collected;
        let total_volume = token_state.total_trade_volume;

        // ⭐ FIX: 99.5% tolerance for edge cases (fee rounding near graduation)
        let sol_threshold = TARGET_SOL.checked_mul(995).unwrap().checked_div(1000).unwrap();
        let has_sol_victory = sol_collected >= sol_threshold;
        let has_volume_victory = total_volume >= VICTORY_VOLUME_SOL;

        // Calculate USD values only for logging/events (display only!)
        let sol_price = oracle.sol_price_usd;
        let final_mc_usd = calculate_market_cap_usd_from_sol(sol_collected, sol_price)?;
        let final_volume_usd = lamports_to_usd(total_volume, sol_price)?;

        if has_sol_victory && has_volume_victory {
            token_state.battle_status = BattleStatus::VictoryPending;
            token_state.victory_timestamp = Clock::get()?.unix_timestamp;
            
            emit!(VictoryAchieved {
                winner_mint: token_state.mint,
                sol_collected,
                volume_sol: total_volume,
                target_sol: TARGET_SOL,
                victory_volume_sol: VICTORY_VOLUME_SOL,
                final_mc_usd,
                final_volume_usd,
                victory_timestamp: token_state.victory_timestamp,
            });
            
            msg!("🏆 VICTORY ACHIEVED!");
            msg!("   SOL Collected: {}/{} (threshold: 99.5%) ✅", 
                 sol_collected / 1_000_000_000, TARGET_SOL / 1_000_000_000);
            msg!("   Volume: {}/{} SOL ✅", 
                 total_volume / 1_000_000_000, VICTORY_VOLUME_SOL / 1_000_000_000);
            msg!("   MC: ~${} USD | Volume: ~${} USD", final_mc_usd, final_volume_usd);
        } else {
            msg!("⚔️ Battle continues...");
            msg!("   SOL: {}/{} ({}%)", 
                 sol_collected / 1_000_000_000, 
                 TARGET_SOL / 1_000_000_000,
                 (sol_collected as u128 * 100 / TARGET_SOL as u128));
            msg!("   Volume: {}/{} SOL ({}%)", 
                 total_volume / 1_000_000_000, 
                 VICTORY_VOLUME_SOL / 1_000_000_000,
                 (total_volume as u128 * 100 / VICTORY_VOLUME_SOL as u128));
        }

        Ok(())
    }
    
    pub fn finalize_duel(ctx: Context<FinalizeDuel>) -> Result<()> {
        msg!("👑 FINALIZING DUEL - WINNER TAKES ALL!");

        let winner_state = &mut ctx.accounts.winner_state;
        let loser_state = &mut ctx.accounts.loser_state;

        require!(winner_state.battle_status == BattleStatus::VictoryPending, BonkError::NoVictoryAchieved);
        require!(loser_state.battle_status == BattleStatus::InBattle, BonkError::InvalidBattleState);
        require!(winner_state.opponent_mint == loser_state.mint, BonkError::NotOpponents);
        require!(loser_state.opponent_mint == winner_state.mint, BonkError::NotOpponents);

        // Stop trading for winner (preparing for DEX listing)
        winner_state.is_active = false;

        // Calculate spoils (50% of loser's liquidity)
        let loser_liquidity = loser_state.sol_collected;
        let spoils_of_war = loser_liquidity.checked_div(2).unwrap();

        // Calculate platform fee (5% of winner's total after plunder)
        let winner_current = winner_state.sol_collected;
        let total_after_plunder = winner_current.checked_add(spoils_of_war).unwrap();
        let platform_fee = total_after_plunder
            .checked_mul(PLATFORM_FEE_BPS).unwrap()
            .checked_div(10000).unwrap();

        // Split platform fee: 80% keeper, 20% treasury
        let keeper_share = platform_fee.checked_mul(80).unwrap().checked_div(100).unwrap();
        let treasury_share = platform_fee.checked_sub(keeper_share).unwrap(); // Remainder to treasury

        // ⭐ FIX: Calculate winner's final SOL
        let winner_final_sol = total_after_plunder.checked_sub(platform_fee).unwrap();

        msg!("📊 DUEL MATH:");
        msg!("   Winner current: {} SOL", winner_current / 1_000_000_000);
        msg!("   Loser liquidity: {} SOL", loser_liquidity / 1_000_000_000);
        msg!("   Spoils (50%): {} SOL", spoils_of_war / 1_000_000_000);
        msg!("   Total after plunder: {} SOL", total_after_plunder / 1_000_000_000);
        msg!("   Platform fee (5%): {} SOL", platform_fee / 1_000_000_000);
        msg!("   Winner final: {} SOL", winner_final_sol / 1_000_000_000);

        // ⭐ FIX: Handle lamport transfers correctly for both cases
        if spoils_of_war > 0 || platform_fee > 0 {
            // Get mutable references to lamports
            let loser_account = loser_state.to_account_info();
            let winner_account = winner_state.to_account_info();
            let keeper_account = ctx.accounts.keeper_authority.to_account_info();
            let treasury_account = ctx.accounts.treasury_wallet.to_account_info();

            if spoils_of_war >= platform_fee {
                // ✅ CASE 1: Spoils cover the fee (normal case)
                // Winner receives: spoils - fee
                let net_to_winner = spoils_of_war.checked_sub(platform_fee).unwrap();

                msg!("   Case: Spoils >= Fee (winner gains {} SOL)", net_to_winner / 1_000_000_000);

                // Transfers
                **loser_account.try_borrow_mut_lamports()? -= spoils_of_war;
                **winner_account.try_borrow_mut_lamports()? += net_to_winner;
                **keeper_account.try_borrow_mut_lamports()? += keeper_share;
                **treasury_account.try_borrow_mut_lamports()? += treasury_share;

            } else {
                // ⭐ CASE 2: Fee > Spoils (winner must contribute from existing liquidity)
                // Winner must pay: fee - spoils from their own funds
                let winner_contribution = platform_fee.checked_sub(spoils_of_war).unwrap();

                msg!("   Case: Fee > Spoils (winner contributes {} SOL)", winner_contribution / 1_000_000_000);

                // Transfers:
                // - Loser gives all spoils
                // - Winner pays the difference (fee - spoils)
                // - Keeper and treasury get full fee
                **loser_account.try_borrow_mut_lamports()? -= spoils_of_war;
                **winner_account.try_borrow_mut_lamports()? -= winner_contribution;
                **keeper_account.try_borrow_mut_lamports()? += keeper_share;
                **treasury_account.try_borrow_mut_lamports()? += treasury_share;
            }

            // Update sol_collected for both states
            winner_state.sol_collected = winner_final_sol;
            loser_state.sol_collected = loser_state.sol_collected.checked_sub(spoils_of_war).unwrap();
        }

        let finalization_timestamp = Clock::get()?.unix_timestamp;

        // Winner goes to listing
        winner_state.battle_status = BattleStatus::Listed;
        winner_state.listing_timestamp = finalization_timestamp;
        winner_state.opponent_mint = Pubkey::default();

        // Loser can retry (goes back to Qualified)
        loser_state.battle_status = BattleStatus::Qualified;
        loser_state.is_active = true;
        loser_state.opponent_mint = Pubkey::default();

        emit!(DuelFinalized {
            winner_mint: winner_state.mint,
            loser_mint: loser_state.mint,
            spoils_transferred: spoils_of_war,
            platform_fee_collected: platform_fee,
            total_winner_liquidity: winner_state.sol_collected,
            loser_remaining_liquidity: loser_state.sol_collected,
            loser_can_retry: true,
            timestamp: finalization_timestamp,
        });

        msg!("🎉 DUEL FINALIZED!");
        msg!("   Winner final liquidity: {} SOL", winner_state.sol_collected / 1_000_000_000);
        msg!("   Loser remaining: {} SOL (can retry!)", loser_state.sol_collected / 1_000_000_000);
        msg!("   Platform fee collected: {} SOL", platform_fee / 1_000_000_000);

        Ok(())
    }

    pub fn withdraw_for_listing(ctx: Context<WithdrawForListing>) -> Result<()> {
        require!(
            ctx.accounts.token_battle_state.battle_status == BattleStatus::Listed,
            BonkError::NotReadyForListing
        );

        // ⭐ FIX: Get all values FIRST, before any mutations
        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.token_battle_state.bump;
        let tokens_amount = ctx.accounts.contract_token_account.amount;

        let battle_state_info = ctx.accounts.token_battle_state.to_account_info();
        let rent = Rent::get()?.minimum_balance(battle_state_info.data_len());
        let current_lamports = battle_state_info.lamports();
        let available_lamports = current_lamports.checked_sub(rent).unwrap_or(0);

        require!(available_lamports > 0, BonkError::NoLiquidityToWithdraw);

        // ⭐ FIX: Update account DATA first (before lamport manipulation)
        let battle_state = &mut ctx.accounts.token_battle_state;
        battle_state.sol_collected = 0;

        // ⭐ FIX: Now do token transfer (CPI)
        let seeds = &[b"battle_state", mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.contract_token_account.to_account_info(),
                    to: ctx.accounts.keeper_token_account.to_account_info(),
                    authority: ctx.accounts.token_battle_state.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_amount,
            9,
        )?;

        // ⭐ FIX: SOL transfer LAST using raw account_info (after Anchor is done with the account)
        let battle_state_info = ctx.accounts.token_battle_state.to_account_info();
        let keeper_info = ctx.accounts.keeper_authority.to_account_info();

        **battle_state_info.try_borrow_mut_lamports()? = rent; // Leave only rent
        **keeper_info.try_borrow_mut_lamports()? = keeper_info
            .lamports()
            .checked_add(available_lamports)
            .unwrap();

        emit!(ListingWithdrawal {
            mint: mint_key,
            sol_withdrawn: available_lamports,
            tokens_withdrawn: tokens_amount,
            keeper: ctx.accounts.keeper_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("📤 WITHDRAWAL FOR LISTING:");
        msg!("   SOL: {} sent to Keeper", available_lamports / 1_000_000_000);
        msg!("   Tokens: {} sent to Keeper", tokens_amount / 1_000_000_000);

        Ok(())
    }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/// Calculate market cap in USD based on SOL collected and current SOL price
/// MC grows linearly from initial to final as SOL is collected
fn calculate_market_cap_usd_from_sol(sol_collected: u64, sol_price_usd: u64) -> Result<u64> {
    // Simple formula: MC in USD = SOL collected * SOL price
    // With bonding curve multiplier applied
    
    if sol_collected == 0 {
        // Initial MC when nothing collected
        // Approximately: (TARGET_SOL / 14.68) * SOL_PRICE
        let initial_mc_lamports = (TARGET_SOL as u128)
            .checked_mul(1_000_000).unwrap()
            .checked_div(14_680_000).unwrap() as u64; // ~1/14.68
        
        return lamports_to_usd(initial_mc_lamports, sol_price_usd);
    }
    
    // Progress through bonding curve
    let progress = (sol_collected as u128)
        .checked_mul(1_000_000).unwrap()
        .checked_div(TARGET_SOL as u128).unwrap();
    
    // MC scales with progress (14.68x multiplier at completion)
    // At 0%: ~1/14.68 of target
    // At 100%: full target value
    let base_mc_lamports = (TARGET_SOL as u128)
        .checked_mul(1_000_000).unwrap()
        .checked_div(14_680_000).unwrap(); // Initial MC in lamports
    
    let mc_range = TARGET_SOL as u128 - base_mc_lamports;
    let additional_mc = mc_range
        .checked_mul(progress).unwrap()
        .checked_div(1_000_000).unwrap();
    
    let current_mc_lamports = (base_mc_lamports + additional_mc) as u64;
    
    lamports_to_usd(current_mc_lamports, sol_price_usd)
}

/// Convert lamports to USD using oracle price
fn lamports_to_usd(lamports: u64, sol_price_usd: u64) -> Result<u64> {
    // sol_price_usd is in millionths (e.g., 137_000_000 = $137)
    // lamports is in billionths of SOL (1 SOL = 1_000_000_000 lamports)
    
    let usd = (lamports as u128)
        .checked_mul(sol_price_usd as u128).unwrap()
        .checked_div(1_000_000_000_u128).unwrap() // Convert lamports to SOL
        .checked_div(1_000_000_u128).unwrap() as u64; // Convert price format to dollars
    
    Ok(usd)
}

// =================================================================
// ⭐ FIX V3: BONDING CURVE CALCULATIONS WITH DIRECT tokens_sold
// =================================================================

/// Calculate tokens to give for a SOL buy
/// ⭐ FIX: Now uses tokens_sold directly instead of deriving from sol_collected
fn calculate_buy_amount_optimized(
    sol_amount: u64, 
    sol_already_collected: u64,
    tokens_already_sold: u64,  // ⭐ NEW: Use actual tokens_sold from state
) -> Result<u64> {
    // ⭐ FIX: Use tokens_sold directly (not calculated from sol_collected)
    // This prevents inconsistencies after multiple buy/sell operations
    let tokens_remaining = BONDING_CURVE_SUPPLY
        .checked_sub(tokens_already_sold)
        .ok_or(BonkError::MathOverflow)?;
    
    if tokens_remaining == 0 {
        return Ok(0);
    }
    
    let sol_remaining = TARGET_SOL
        .saturating_sub(sol_already_collected);
    
    if sol_remaining == 0 {
        return Ok(0);
    }
    
    // Tokens out = (SOL in / SOL remaining) * Tokens remaining * 0.98 (2% slippage buffer)
    let tokens_out = (sol_amount as u128)
        .checked_mul(tokens_remaining as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(sol_remaining as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_mul(98)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(100)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    // Cap at remaining tokens
    if tokens_out > tokens_remaining {
        return Ok(tokens_remaining.checked_mul(90).unwrap().checked_div(100).unwrap());
    }
    
    Ok(tokens_out)
}

/// Calculate SOL to return for a token sell
/// ⭐ FIX: Now uses tokens_sold directly instead of deriving from sol_collected
fn calculate_sell_amount_optimized(
    token_amount: u64, 
    sol_collected: u64,
    tokens_sold: u64,  // ⭐ NEW: Use actual tokens_sold from state
) -> Result<u64> {
    // ⭐ FIX: Early return if either value is 0 (prevents division by zero)
    if sol_collected == 0 || tokens_sold == 0 {
        return Ok(0);
    }
    
    // SOL out = (Token amount / Tokens sold) * SOL collected
    // This gives the proportional share of SOL for the tokens being sold
    let sol_out = (token_amount as u128)
        .checked_mul(sol_collected as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(tokens_sold as u128)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    // Cap at available SOL (90% max to leave buffer)
    if sol_out > sol_collected {
        return Ok(sol_collected.checked_mul(90).unwrap().checked_div(100).unwrap());
    }
    
    Ok(sol_out)
}

// =================================================================
// ACCOUNT STRUCTURES
// =================================================================

#[account]
pub struct PriceOracle {
    pub sol_price_usd: u64,      // Price in millionths (137_000_000 = $137)
    pub last_update_timestamp: i64,
    pub next_update_timestamp: i64,
    pub keeper_authority: Pubkey,
    pub update_count: u64,
}

#[account]
pub struct TokenBattleState {
    pub mint: Pubkey,
    pub sol_collected: u64,       // SOL collected (in lamports)
    pub tokens_sold: u64,         // Tokens sold from bonding curve
    pub total_trade_volume: u64,  // Total trading volume (in lamports)
    pub is_active: bool,
    pub battle_status: BattleStatus,
    pub opponent_mint: Pubkey,
    pub creation_timestamp: i64,
    pub last_trade_timestamp: i64,
    pub battle_start_timestamp: i64,
    pub victory_timestamp: i64,
    pub listing_timestamp: i64,
    pub bump: u8,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BattleStatus {
    Created,        // Token created, not yet qualified
    Qualified,      // Met qualification threshold, ready for battle
    InBattle,       // Currently in a battle
    VictoryPending, // Won battle, awaiting finalization
    Listed,         // Battle finalized, ready for DEX listing
    Defeated,       // Lost battle (unused - losers go back to Qualified)
}

// =================================================================
// ACCOUNT CONTEXTS
// =================================================================

#[derive(Accounts)]
pub struct InitializePriceOracle<'info> {
    #[account(
        init,
        payer = keeper_authority,
        space = 8 + 8 + 8 + 8 + 32 + 8,
        seeds = [b"price_oracle"],
        bump
    )]
    pub price_oracle: Account<'info, PriceOracle>,
    
    #[account(
        mut,
        signer,
        address = KEEPER_AUTHORITY.parse::<Pubkey>().unwrap() @ BonkError::Unauthorized
    )]
    pub keeper_authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSolPrice<'info> {
    #[account(
        mut,
        seeds = [b"price_oracle"],
        bump
    )]
    pub price_oracle: Account<'info, PriceOracle>,
    
    #[account(
        signer,
        address = KEEPER_AUTHORITY.parse::<Pubkey>().unwrap() @ BonkError::Unauthorized
    )]
    pub keeper_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateBattleToken<'info> {
    #[account(
        init,
        payer = user,
        mint::decimals = 9,
        mint::authority = token_battle_state,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + (4 + 50) + (4 + 10) + (4 + 200) + 64,
        seeds = [b"battle_state", mint.key().as_ref()],
        bump
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = token_battle_state,
        associated_token::token_program = token_program,
    )]
    pub contract_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(seeds = [b"price_oracle"], bump)]
    pub price_oracle: Account<'info, PriceOracle>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", mint.key().as_ref()],
        bump = token_battle_state.bump
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = token_battle_state,
        associated_token::token_program = token_program,
    )]
    pub contract_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(seeds = [b"price_oracle"], bump)]
    pub price_oracle: Account<'info, PriceOracle>,

    #[account(
        mut,
        address = TREASURY_WALLET.parse::<Pubkey>().unwrap() @ BonkError::InvalidTreasury
    )]
    /// CHECK: Treasury wallet address is hardcoded and verified
    pub treasury_wallet: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", mint.key().as_ref()],
        bump = token_battle_state.bump
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    // ⭐ AGGIUNTO: Contract token account per ricevere i token venduti
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = token_battle_state,
        associated_token::token_program = token_program,
    )]
    pub contract_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(seeds = [b"price_oracle"], bump)]
    pub price_oracle: Account<'info, PriceOracle>,

    #[account(
        mut,
        address = TREASURY_WALLET.parse::<Pubkey>().unwrap() @ BonkError::InvalidTreasury
    )]
    /// CHECK: Treasury wallet address is hardcoded and verified
    pub treasury_wallet: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct StartBattle<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", token_a_state.mint.as_ref()],
        bump = token_a_state.bump
    )]
    pub token_a_state: Account<'info, TokenBattleState>,
    
    #[account(
        mut,
        seeds = [b"battle_state", token_b_state.mint.as_ref()],
        bump = token_b_state.bump
    )]
    pub token_b_state: Account<'info, TokenBattleState>,
    
    #[account(
        signer,
        address = KEEPER_AUTHORITY.parse::<Pubkey>().unwrap() @ BonkError::Unauthorized
    )]
    pub keeper_authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckVictory<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", token_battle_state.mint.as_ref()],
        bump = token_battle_state.bump,
        constraint = token_battle_state.battle_status == BattleStatus::InBattle @ BonkError::NotInBattle
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,
    
    #[account(seeds = [b"price_oracle"], bump)]
    pub price_oracle: Account<'info, PriceOracle>,
}

#[derive(Accounts)]
pub struct FinalizeDuel<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", winner_state.mint.as_ref()],
        bump = winner_state.bump,
        constraint = winner_state.battle_status == BattleStatus::VictoryPending @ BonkError::NoVictoryAchieved
    )]
    pub winner_state: Account<'info, TokenBattleState>,
    
    #[account(
        mut,
        seeds = [b"battle_state", loser_state.mint.as_ref()],
        bump = loser_state.bump,
        constraint = loser_state.battle_status == BattleStatus::InBattle @ BonkError::InvalidBattleState,
        constraint = loser_state.mint == winner_state.opponent_mint @ BonkError::NotOpponents,
        constraint = winner_state.mint == loser_state.opponent_mint @ BonkError::NotOpponents
    )]
    pub loser_state: Account<'info, TokenBattleState>,
    
    #[account(
        mut,
        address = TREASURY_WALLET.parse::<Pubkey>().unwrap() @ BonkError::InvalidTreasury
    )]
    /// CHECK: Treasury wallet address is hardcoded and verified
    pub treasury_wallet: AccountInfo<'info>,
    
    #[account(
        mut,
        address = KEEPER_AUTHORITY.parse::<Pubkey>().unwrap() @ BonkError::Unauthorized
    )]
    pub keeper_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawForListing<'info> {
    #[account(
        mut,
        seeds = [b"battle_state", mint.key().as_ref()],
        bump = token_battle_state.bump,
        constraint = token_battle_state.battle_status == BattleStatus::Listed @ BonkError::NotReadyForListing
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = token_battle_state,
        associated_token::token_program = token_program,
    )]
    pub contract_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = keeper_authority,
        associated_token::token_program = token_program,
    )]
    pub keeper_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        address = KEEPER_AUTHORITY.parse::<Pubkey>().unwrap() @ BonkError::Unauthorized
    )]
    pub keeper_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// =================================================================
// EVENTS
// =================================================================

#[event]
pub struct PriceUpdated {
    pub previous_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
    pub update_number: u64,
}

#[event]
pub struct GladiatorForged {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub target_sol: u64,
    pub victory_volume_sol: u64,
    pub initial_market_cap_usd: u64,
    pub sol_price_at_creation: u64,
    pub is_test_tier: bool,
    pub timestamp: i64,
}

#[event]
pub struct GladiatorQualified {
    pub mint: Pubkey,
    pub sol_collected: u64,
    pub qualification_threshold: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenPurchased {
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub tokens_received: u64,
    pub sol_collected: u64,
    pub total_volume_sol: u64,
    pub market_cap_usd: u64,
    pub sol_price: u64,
}

#[event]
pub struct TokenSold {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub token_amount: u64,
    pub sol_received: u64,
    pub sol_collected: u64,
    pub total_volume_sol: u64,
    pub market_cap_usd: u64,
    pub sol_price: u64,
}

#[event]
pub struct BattleStarted {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub sol_a: u64,
    pub sol_b: u64,
    pub target_sol: u64,
    pub victory_volume_sol: u64,
    pub timestamp: i64,
}

#[event]
pub struct VictoryAchieved {
    pub winner_mint: Pubkey,
    pub sol_collected: u64,
    pub volume_sol: u64,
    pub target_sol: u64,
    pub victory_volume_sol: u64,
    pub final_mc_usd: u64,
    pub final_volume_usd: u64,
    pub victory_timestamp: i64,
}

#[event]
pub struct DuelFinalized {
    pub winner_mint: Pubkey,
    pub loser_mint: Pubkey,
    pub spoils_transferred: u64,
    pub platform_fee_collected: u64,
    pub total_winner_liquidity: u64,
    pub loser_remaining_liquidity: u64,
    pub loser_can_retry: bool,
    pub timestamp: i64,
}

#[event]
pub struct ListingWithdrawal {
    pub mint: Pubkey,
    pub sol_withdrawn: u64,
    pub tokens_withdrawn: u64,
    pub keeper: Pubkey,
    pub timestamp: i64,
}

// =================================================================
// ERROR CODES
// =================================================================

#[error_code]
pub enum BonkError {
    #[msg("Invalid token name: must be 1-50 characters")]
    InvalidTokenName,
    #[msg("Invalid token symbol: must be 1-10 characters")]
    InvalidTokenSymbol,
    #[msg("Invalid token URI: must be <= 200 characters")]
    InvalidTokenUri,
    #[msg("Amount too small: minimum transaction required")]
    AmountTooSmall,
    #[msg("Amount too large: maximum transaction exceeded")]
    AmountTooLarge,
    #[msg("Trading is inactive for this token")]
    TradingInactive,
    #[msg("Insufficient output from bonding curve")]
    InsufficientOutput,
    #[msg("Exceeds available token supply")]
    ExceedsSupply,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Token not qualified for battle")]
    NotQualified,
    #[msg("Cannot battle against self")]
    SelfBattle,
    #[msg("Unfair match: SOL difference too large")]
    UnfairMatch,
    #[msg("Token not currently in battle")]
    NotInBattle,
    #[msg("No victory achieved yet")]
    NoVictoryAchieved,
    #[msg("Invalid battle state for this operation")]
    InvalidBattleState,
    #[msg("Tokens are not opponents")]
    NotOpponents,
    #[msg("Invalid treasury wallet address")]
    InvalidTreasury,
    #[msg("Unauthorized: invalid keeper authority")]
    Unauthorized,
    #[msg("Mathematical overflow in calculation")]
    MathOverflow,
    #[msg("Invalid bonding curve state")]
    InvalidCurveState,
    #[msg("Price update too soon, must wait 24 hours")]
    PriceUpdateTooSoon,
    #[msg("Would exceed graduation threshold - bonding curve complete!")]
    WouldExceedGraduation,
    #[msg("Token not ready for listing")]
    NotReadyForListing,
    #[msg("No liquidity to withdraw for listing")]
    NoLiquidityToWithdraw,
}