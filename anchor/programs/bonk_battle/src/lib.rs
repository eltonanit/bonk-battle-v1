// =================================================================
// FILE: contracts/programs/contracts/src/lib.rs
// BONK BATTLE V2 - CONSTANT PRODUCT BONDING CURVE (xy = k)
// Like Pump.fun/Stonks with 3x multiplier (TEST MODE)
// =================================================================

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::rent::Rent;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, Burn, MintTo},
};

declare_id!("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

// =================================================================
// SECURITY CONSTANTS
// =================================================================

const TREASURY_WALLET: &str = "5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf";
const KEEPER_AUTHORITY: &str = "753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3";

// =================================================================
// TOKEN SUPPLY CONSTANTS (come Pump.fun)
// =================================================================

/// Token decimals (9 come il tuo contratto attuale)
pub const TOKEN_DECIMALS: u8 = 9;

/// Total supply: 1 miliardo con 9 decimals
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1B * 10^9

/// Virtual token reserves iniziali (1.073B per formula Pump.fun)
pub const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000_000; // 1.073B * 10^9

/// Token per bonding curve (79.31% = 793.1M)
pub const BONDING_CURVE_SUPPLY: u64 = 793_100_000_000_000_000; // 793.1M * 10^9

/// Token riservati per Raydium (20.69% = 206.9M)
pub const RAYDIUM_RESERVED_SUPPLY: u64 = 206_900_000_000_000_000; // 206.9M * 10^9

// =================================================================
// TIER CONFIGURATION - CONSTANT PRODUCT BONDING CURVE
// =================================================================

/// Tier enum per distinguere TEST vs PRODUCTION
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BattleTier {
    Test = 0,       // Per testing su devnet
    Production = 1, // Per mainnet
}

impl Default for BattleTier {
    fn default() -> Self {
        BattleTier::Test
    }
}

// ============ TIER TEST (3x MULTIPLIER) ============
// Target: ~$1,200 MC | Moltiplicatore: 3x
// MC Iniziale: ~$375 | SOL raccolti: ~4 SOL

/// Virtual SOL iniziali per TIER TEST (2.05 SOL)
pub const TEST_VIRTUAL_SOL_INIT: u64 = 2_050_000_000; // 2.05 SOL in lamports

/// Costante k per TIER TEST (virtual_sol * virtual_token)
pub const TEST_CONSTANT_K: u128 = 2_199_650_000_000_000_000_000_000_000;

/// Target SOL per graduation TIER TEST (6 SOL per ~$1,200 MC) - 3x MULTIPLIER
pub const TEST_TARGET_SOL: u64 = 6_000_000_000; // 6 SOL in lamports

/// Volume check per vittoria TIER TEST
pub const TEST_VICTORY_VOLUME_USD: u64 = 200; // $200

/// MC vittoria TIER TEST - 3x MULTIPLIER
pub const TEST_VICTORY_MC_USD: u64 = 1_200; // $1,200

// ============ TIER PRODUCTION ============
// Target: $25,000 MC | Moltiplicatore: 14.68x
// MC Iniziale: ~$1,700 | SOL raccolti: ~26 SOL

/// Virtual SOL iniziali per TIER PROD (9.3 SOL)
pub const PROD_VIRTUAL_SOL_INIT: u64 = 9_300_000_000; // 9.3 SOL in lamports

/// Costante k per TIER PROD
pub const PROD_CONSTANT_K: u128 = 9_978_900_000_000_000_000_000_000_000;

/// Target SOL per graduation TIER PROD (~127.5 SOL per $25,000 MC a $196/SOL)
pub const PROD_TARGET_SOL: u64 = 127_500_000_000; // 127.5 SOL in lamports

/// Volume check per vittoria TIER PROD
pub const PROD_VICTORY_VOLUME_USD: u64 = 20_000; // $20,000

/// MC vittoria TIER PROD
pub const PROD_VICTORY_MC_USD: u64 = 25_000; // $25,000

// =================================================================
// BATTLE THRESHOLDS (comuni a entrambi i tier)
// =================================================================

/// Qualificazione: $10 (facilissimo entrare in battaglia!)
const QUALIFICATION_MC_USD: u64 = 10; // $10 per qualificarsi

/// Tolleranza matchmaking
const MATCHMAKING_TOLERANCE_USD: u64 = 5_000; // $5,000 tolleranza

// =================================================================
// FEE STRUCTURE
// =================================================================

const TRADING_FEE_BPS: u64 = 200; // 2.00% su ogni trade
const PLATFORM_FEE_BPS: u64 = 500; // 5.00% sulla vittoria

// =================================================================
// SECURITY LIMITS
// =================================================================

const MAX_SOL_PER_TX: u64 = 100_000_000_000; // 100 SOL max
const MIN_SOL_PER_TX: u64 = 1_000_000; // 0.001 SOL min

// =================================================================
// ORACLE
// =================================================================

const PRICE_UPDATE_INTERVAL: i64 = 86400; // 24 ore

#[program]
pub mod bonk_battle {
    use super::*;

    // =================================================================
    // ORACLE PRICE MANAGEMENT
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
        tier: u8,
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
        require!(tier <= 1, BonkError::InvalidTier);

        let battle_tier = if tier == 0 { BattleTier::Test } else { BattleTier::Production };
        
        msg!("🏛️ FORGING GLADIATOR: {} ({}) - Tier {:?}", name, symbol, battle_tier);

        let battle_state_info = ctx.accounts.token_battle_state.to_account_info();
        let mint_key = ctx.accounts.mint.key();
        
        // Get tier-specific parameters
        let (virtual_sol_init, constant_k, target_sol, victory_mc, victory_volume) = get_tier_params(battle_tier);
        
        let battle_state = &mut ctx.accounts.token_battle_state;

        battle_state.mint = mint_key;
        battle_state.tier = battle_tier;
        battle_state.virtual_sol_reserves = virtual_sol_init;
        battle_state.virtual_token_reserves = VIRTUAL_TOKEN_RESERVES;
        battle_state.real_sol_reserves = 0;
        battle_state.real_token_reserves = BONDING_CURVE_SUPPLY;
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
        battle_state.name = name.clone();
        battle_state.symbol = symbol.clone();
        battle_state.uri = uri.clone();

        // Mint total supply to contract
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

        // Calculate initial market cap
        let initial_mc_usd = calculate_market_cap_usd(
            battle_state.virtual_sol_reserves,
            battle_state.virtual_token_reserves,
            ctx.accounts.price_oracle.sol_price_usd,
        )?;

        emit!(GladiatorForged {
            mint: mint_key,
            creator: ctx.accounts.user.key(),
            tier: battle_tier,
            initial_market_cap_usd: initial_mc_usd,
            virtual_sol_init,
            constant_k,
            target_sol,
            timestamp: battle_state.creation_timestamp,
        });

        msg!(
            "✅ GLADIATOR FORGED! Tier {:?} | Initial MC: ${} USD | Target: {} SOL",
            battle_tier,
            initial_mc_usd,
            target_sol / 1_000_000_000
        );
        Ok(())
    }

    // =================================================================
    // PHASE 2: CONSTANT PRODUCT BONDING CURVE TRADING
    // =================================================================

    pub fn buy_token(ctx: Context<BuyToken>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        require!(sol_amount >= MIN_SOL_PER_TX, BonkError::AmountTooSmall);
        require!(sol_amount <= MAX_SOL_PER_TX, BonkError::AmountTooLarge);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        let battle_state = &ctx.accounts.token_battle_state;
        let (_, _, target_sol, _, _) = get_tier_params(battle_state.tier);
        
        // Check if would exceed graduation
        let total_sol_after = battle_state.real_sol_reserves
            .checked_add(sol_amount)
            .ok_or(BonkError::MathOverflow)?;
        
        require!(
            total_sol_after <= target_sol,
            BonkError::WouldExceedGraduation
        );

        // Calculate tokens out using constant product formula
        let tokens_to_give = calculate_tokens_out(
            sol_amount,
            battle_state.virtual_sol_reserves,
            battle_state.virtual_token_reserves,
        )?;
        
        require!(tokens_to_give >= min_tokens_out, BonkError::SlippageExceeded);
        require!(tokens_to_give > 0, BonkError::InsufficientOutput);
        require!(tokens_to_give <= battle_state.real_token_reserves, BonkError::ExceedsSupply);

        // Calculate fees
        let fee = sol_amount
            .checked_mul(TRADING_FEE_BPS)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let sol_to_curve = sol_amount.checked_sub(fee).unwrap();

        // Transfer SOL to battle state (curve)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.token_battle_state.to_account_info(),
                },
            ),
            sol_to_curve,
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

        // Transfer tokens to buyer
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
            TOKEN_DECIMALS,
        )?;

        // Update state with constant product formula
        let battle_state = &mut ctx.accounts.token_battle_state;
        let old_status = battle_state.battle_status.clone();
        
        // Update virtual reserves (constant product)
        battle_state.virtual_sol_reserves = battle_state.virtual_sol_reserves
            .checked_add(sol_to_curve)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.virtual_token_reserves = battle_state.virtual_token_reserves
            .checked_sub(tokens_to_give)
            .ok_or(BonkError::MathOverflow)?;
        
        // Update real reserves
        battle_state.real_sol_reserves = battle_state.real_sol_reserves
            .checked_add(sol_to_curve)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.real_token_reserves = battle_state.real_token_reserves
            .checked_sub(tokens_to_give)
            .ok_or(BonkError::MathOverflow)?;
        
        battle_state.tokens_sold = battle_state.tokens_sold
            .checked_add(tokens_to_give)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.total_trade_volume = battle_state.total_trade_volume
            .checked_add(sol_amount)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;

        // Calculate current market cap
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let current_mc_usd = calculate_market_cap_usd(
            battle_state.virtual_sol_reserves,
            battle_state.virtual_token_reserves,
            sol_price,
        )?;
        
        // Check qualification ($10)
        if current_mc_usd >= QUALIFICATION_MC_USD && old_status == BattleStatus::Created {
            battle_state.battle_status = BattleStatus::Qualified;
            
            emit!(GladiatorQualified {
                mint: battle_state.mint,
                market_cap_usd: current_mc_usd,
                sol_collected: battle_state.real_sol_reserves,
                timestamp: battle_state.last_trade_timestamp,
            });
            
            msg!("🎯 GLADIATOR QUALIFIED! MC: ${} USD", current_mc_usd);
        }

        emit!(TokenPurchased {
            mint: battle_state.mint,
            buyer: ctx.accounts.user.key(),
            sol_amount,
            tokens_received: tokens_to_give,
            new_market_cap_usd: current_mc_usd,
            virtual_sol_reserves: battle_state.virtual_sol_reserves,
            virtual_token_reserves: battle_state.virtual_token_reserves,
            sol_price,
        });

        msg!(
            "💰 BUY: {} tokens for {} SOL. MC: ${} USD | Status: {:?}",
            tokens_to_give / 1_000_000_000,
            sol_amount / 1_000_000_000,
            current_mc_usd,
            battle_state.battle_status
        );
        Ok(())
    }
    
    pub fn sell_token(ctx: Context<SellToken>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        require!(token_amount > 0, BonkError::AmountTooSmall);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        let battle_state = &ctx.accounts.token_battle_state;
        
        // Calculate SOL out using constant product formula
        let sol_to_return = calculate_sol_out(
            token_amount,
            battle_state.virtual_sol_reserves,
            battle_state.virtual_token_reserves,
        )?;
        
        require!(sol_to_return >= min_sol_out, BonkError::SlippageExceeded);
        require!(sol_to_return > 0, BonkError::InsufficientOutput);
        require!(
            sol_to_return <= battle_state.real_sol_reserves,
            BonkError::InsufficientLiquidity
        );

        // Burn tokens from user
        anchor_spl::token_interface::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // Calculate fees
        let fee = sol_to_return
            .checked_mul(TRADING_FEE_BPS)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let sol_to_user = sol_to_return.checked_sub(fee).unwrap();

        // Transfer SOL to user
        let battle_state_account_info = ctx.accounts.token_battle_state.to_account_info();
        **battle_state_account_info.try_borrow_mut_lamports()? -= sol_to_user;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += sol_to_user;
        
        // Transfer fee to treasury
        **battle_state_account_info.try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.treasury_wallet.to_account_info().try_borrow_mut_lamports()? += fee;
        
        // Update state with constant product formula
        let battle_state = &mut ctx.accounts.token_battle_state;
        
        // Update virtual reserves
        battle_state.virtual_sol_reserves = battle_state.virtual_sol_reserves
            .checked_sub(sol_to_return)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.virtual_token_reserves = battle_state.virtual_token_reserves
            .checked_add(token_amount)
            .ok_or(BonkError::MathOverflow)?;
        
        // Update real reserves
        battle_state.real_sol_reserves = battle_state.real_sol_reserves
            .checked_sub(sol_to_return)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.real_token_reserves = battle_state.real_token_reserves
            .checked_add(token_amount)
            .ok_or(BonkError::MathOverflow)?;
        
        battle_state.tokens_sold = battle_state.tokens_sold
            .checked_sub(token_amount)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.total_trade_volume = battle_state.total_trade_volume
            .checked_add(sol_to_return)
            .ok_or(BonkError::MathOverflow)?;
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;
        
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let new_mc_usd = calculate_market_cap_usd(
            battle_state.virtual_sol_reserves,
            battle_state.virtual_token_reserves,
            sol_price,
        )?;

        emit!(TokenSold {
            mint: battle_state.mint,
            seller: ctx.accounts.user.key(),
            token_amount,
            sol_received: sol_to_user,
            new_market_cap_usd: new_mc_usd,
            virtual_sol_reserves: battle_state.virtual_sol_reserves,
            virtual_token_reserves: battle_state.virtual_token_reserves,
            sol_price,
        });

        msg!(
            "💸 SELL: {} tokens for {} SOL. MC: ${} USD",
            token_amount / 1_000_000_000,
            sol_to_return / 1_000_000_000,
            new_mc_usd
        );
        Ok(())
    }

    // =================================================================
    // BATTLE MECHANICS
    // =================================================================

    pub fn start_battle(ctx: Context<StartBattle>) -> Result<()> {
        msg!("⚔️ BATTLE COMMENCES!");
        
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        
        let token_a = &mut ctx.accounts.token_a_state;
        let token_b = &mut ctx.accounts.token_b_state;

        require!(token_a.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_b.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_a.mint != token_b.mint, BonkError::SelfBattle);
        require!(token_a.is_active && token_b.is_active, BonkError::TradingInactive);
        require!(token_a.tier == token_b.tier, BonkError::TierMismatch);

        let mc_a_usd = calculate_market_cap_usd(
            token_a.virtual_sol_reserves,
            token_a.virtual_token_reserves,
            sol_price,
        )?;
        let mc_b_usd = calculate_market_cap_usd(
            token_b.virtual_sol_reserves,
            token_b.virtual_token_reserves,
            sol_price,
        )?;
        
        let mc_diff = if mc_a_usd > mc_b_usd { 
            mc_a_usd - mc_b_usd 
        } else { 
            mc_b_usd - mc_a_usd 
        };
        
        require!(mc_diff <= MATCHMAKING_TOLERANCE_USD, BonkError::UnfairMatch);

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
            mc_a_usd,
            mc_b_usd,
            tier: token_a.tier,
            timestamp: battle_timestamp,
        });

        msg!("🏟️ BATTLE STARTED! {} vs {} | MC: ${} vs ${}", 
             token_a.mint, token_b.mint, mc_a_usd, mc_b_usd);
        Ok(())
    }

    pub fn check_victory_conditions(ctx: Context<CheckVictory>) -> Result<()> {
        let token_state = &mut ctx.accounts.token_battle_state;
        let oracle = &ctx.accounts.price_oracle;
        
        require!(token_state.battle_status == BattleStatus::InBattle, BonkError::NotInBattle);
        require!(token_state.is_active, BonkError::TradingInactive);

        let (_, _, _, victory_mc, victory_volume) = get_tier_params(token_state.tier);
        
        let current_mc_usd = calculate_market_cap_usd(
            token_state.virtual_sol_reserves,
            token_state.virtual_token_reserves,
            oracle.sol_price_usd,
        )?;
        
        // Calculate volume in USD
        let volume_usd = (token_state.total_trade_volume as u128)
            .checked_mul(oracle.sol_price_usd as u128).unwrap()
            .checked_div(1_000_000_000 as u128).unwrap()
            .checked_div(1_000_000 as u128).unwrap() as u64;

        let has_mc_victory = current_mc_usd >= victory_mc;
        let has_volume_victory = volume_usd >= victory_volume;

        if has_mc_victory && has_volume_victory {
            token_state.battle_status = BattleStatus::VictoryPending;
            token_state.victory_timestamp = Clock::get()?.unix_timestamp;
            
            emit!(VictoryAchieved {
                winner_mint: token_state.mint,
                final_mc_usd: current_mc_usd,
                final_volume_usd: volume_usd,
                sol_collected: token_state.real_sol_reserves,
                victory_timestamp: token_state.victory_timestamp,
            });
            
            msg!("🏆 VICTORY! MC: ${} | Volume: ${} | SOL: {}", 
                 current_mc_usd, volume_usd, token_state.real_sol_reserves / 1_000_000_000);
        } else {
            msg!("⚔️ Battle continues... MC: ${}/{} | Volume: ${}/{}", 
                 current_mc_usd, victory_mc,
                 volume_usd, victory_volume);
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

        // Stop trading on winner (preparing for Raydium)
        winner_state.is_active = false;

        // Calculate spoils: 50% of loser's liquidity
        let loser_liquidity = loser_state.real_sol_reserves;
        let spoils_of_war = loser_liquidity.checked_div(2).unwrap();
        
        // Calculate platform fee: 5% of total (winner + spoils)
        let winner_current = winner_state.real_sol_reserves;
        let total_after_plunder = winner_current.checked_add(spoils_of_war).unwrap();
        let platform_fee = total_after_plunder
            .checked_mul(PLATFORM_FEE_BPS).unwrap()
            .checked_div(10000).unwrap();
        
        // Split fee: 80% keeper, 20% treasury
        let keeper_share = platform_fee * 80 / 100;
        let treasury_share = platform_fee * 20 / 100;
        
        let net_to_winner = spoils_of_war.checked_sub(platform_fee).unwrap();

        // Execute transfers
        if spoils_of_war > 0 {
            **loser_state.to_account_info().try_borrow_mut_lamports()? -= spoils_of_war;
            **winner_state.to_account_info().try_borrow_mut_lamports()? += net_to_winner;
            **ctx.accounts.keeper_authority.to_account_info().try_borrow_mut_lamports()? += keeper_share;
            **ctx.accounts.treasury_wallet.to_account_info().try_borrow_mut_lamports()? += treasury_share;

            winner_state.real_sol_reserves = winner_state.real_sol_reserves.checked_add(net_to_winner).unwrap();
            loser_state.real_sol_reserves = loser_state.real_sol_reserves.checked_sub(spoils_of_war).unwrap();
        }

        let finalization_timestamp = Clock::get()?.unix_timestamp;
        
        // Winner goes to listing
        winner_state.battle_status = BattleStatus::Listed;
        winner_state.listing_timestamp = finalization_timestamp;
        winner_state.opponent_mint = Pubkey::default();

        // Loser can try again
        loser_state.battle_status = BattleStatus::Qualified;
        loser_state.is_active = true;
        loser_state.opponent_mint = Pubkey::default();

        emit!(DuelFinalized {
            winner_mint: winner_state.mint,
            loser_mint: loser_state.mint,
            spoils_transferred: net_to_winner,
            platform_fee_collected: platform_fee,
            total_winner_liquidity: winner_state.real_sol_reserves,
            loser_can_retry: true,
            timestamp: finalization_timestamp,
        });

        msg!("🎉 DUEL FINALIZED! Winner liquidity: {} SOL | Platform fee: {} SOL", 
             winner_state.real_sol_reserves / 1_000_000_000, 
             platform_fee / 1_000_000_000);
        
        Ok(())
    }

    // =================================================================
    // RAYDIUM LISTING - SIMPLE WITHDRAW
    // =================================================================

    pub fn withdraw_for_listing(ctx: Context<WithdrawForListing>) -> Result<()> {
        require!(
            ctx.accounts.token_battle_state.battle_status == BattleStatus::Listed,
            BonkError::NotReadyForListing
        );
        
        let battle_state = &ctx.accounts.token_battle_state;
        let account_info = battle_state.to_account_info();
        let rent = Rent::get()?.minimum_balance(account_info.data_len());
        let available_lamports = account_info.lamports().checked_sub(rent).unwrap_or(0);
        
        require!(available_lamports > 0, BonkError::NoLiquidityToWithdraw);
        
        // Transfer SOL to keeper
        **ctx.accounts.token_battle_state.to_account_info().try_borrow_mut_lamports()? -= available_lamports;
        **ctx.accounts.keeper_authority.to_account_info().try_borrow_mut_lamports()? += available_lamports;
        
        // Transfer reserved tokens to keeper
        let mint_key = ctx.accounts.mint.key();
        let bump = battle_state.bump;
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
            RAYDIUM_RESERVED_SUPPLY,
            TOKEN_DECIMALS,
        )?;
        
        // Update state
        let battle_state = &mut ctx.accounts.token_battle_state;
        battle_state.battle_status = BattleStatus::PoolCreated;
        battle_state.real_sol_reserves = 0;
        battle_state.listing_timestamp = Clock::get()?.unix_timestamp;
        
        emit!(ListingWithdrawal {
            mint: ctx.accounts.mint.key(),
            sol_withdrawn: available_lamports,
            tokens_withdrawn: RAYDIUM_RESERVED_SUPPLY,
            keeper: ctx.accounts.keeper_authority.key(),
            timestamp: battle_state.listing_timestamp,
        });
        
        msg!("📤 WITHDRAWAL FOR LISTING: {} SOL + {}M tokens sent to Keeper", 
             available_lamports / 1_000_000_000,
             RAYDIUM_RESERVED_SUPPLY / 1_000_000_000 / 1_000_000);
        
        Ok(())
    }
}

// =================================================================
// HELPER FUNCTIONS - CONSTANT PRODUCT FORMULA
// =================================================================

/// Get tier-specific parameters
fn get_tier_params(tier: BattleTier) -> (u64, u128, u64, u64, u64) {
    match tier {
        BattleTier::Test => (
            TEST_VIRTUAL_SOL_INIT,
            TEST_CONSTANT_K,
            TEST_TARGET_SOL,
            TEST_VICTORY_MC_USD,
            TEST_VICTORY_VOLUME_USD,
        ),
        BattleTier::Production => (
            PROD_VIRTUAL_SOL_INIT,
            PROD_CONSTANT_K,
            PROD_TARGET_SOL,
            PROD_VICTORY_MC_USD,
            PROD_VICTORY_VOLUME_USD,
        ),
    }
}

/// Calculate market cap in USD using constant product formula
fn calculate_market_cap_usd(
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
    sol_price_usd: u64,
) -> Result<u64> {
    let mc_lamports = (virtual_sol_reserves as u128)
        .checked_mul(TOTAL_SUPPLY as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(virtual_token_reserves as u128)
        .ok_or(BonkError::MathOverflow)?;
    
    let mc_usd = (mc_lamports)
        .checked_mul(sol_price_usd as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(1_000_000)
        .ok_or(BonkError::MathOverflow)?;
    
    Ok(mc_usd as u64)
}

/// Calculate tokens out for a given SOL input (BUY)
fn calculate_tokens_out(
    sol_in: u64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Result<u64> {
    let numerator = (virtual_token_reserves as u128)
        .checked_mul(sol_in as u128)
        .ok_or(BonkError::MathOverflow)?;
    
    let denominator = (virtual_sol_reserves as u128)
        .checked_add(sol_in as u128)
        .ok_or(BonkError::MathOverflow)?;
    
    let tokens_out = numerator
        .checked_div(denominator)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    Ok(tokens_out)
}

/// Calculate SOL out for a given token input (SELL)
fn calculate_sol_out(
    tokens_in: u64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Result<u64> {
    let numerator = (virtual_sol_reserves as u128)
        .checked_mul(tokens_in as u128)
        .ok_or(BonkError::MathOverflow)?;
    
    let denominator = (virtual_token_reserves as u128)
        .checked_add(tokens_in as u128)
        .ok_or(BonkError::MathOverflow)?;
    
    let sol_out = numerator
        .checked_div(denominator)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    Ok(sol_out)
}

// =================================================================
// ACCOUNT STRUCTURES
// =================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BattleStatus {
    Created,
    Qualified,
    InBattle,
    VictoryPending,
    Listed,
    PoolCreated,
}

impl Default for BattleStatus {
    fn default() -> Self {
        BattleStatus::Created
    }
}

#[account]
#[derive(Default)]
pub struct TokenBattleState {
    pub mint: Pubkey,                       // 32
    pub tier: BattleTier,                   // 1
    pub virtual_sol_reserves: u64,          // 8
    pub virtual_token_reserves: u64,        // 8
    pub real_sol_reserves: u64,             // 8
    pub real_token_reserves: u64,           // 8
    pub tokens_sold: u64,                   // 8
    pub total_trade_volume: u64,            // 8
    pub is_active: bool,                    // 1
    pub battle_status: BattleStatus,        // 1
    pub opponent_mint: Pubkey,              // 32
    pub creation_timestamp: i64,            // 8
    pub last_trade_timestamp: i64,          // 8
    pub battle_start_timestamp: i64,        // 8
    pub victory_timestamp: i64,             // 8
    pub listing_timestamp: i64,             // 8
    pub bump: u8,                           // 1
    pub name: String,                       // 4 + 50 = 54
    pub symbol: String,                     // 4 + 10 = 14
    pub uri: String,                        // 4 + 200 = 204
}

#[account]
pub struct PriceOracle {
    pub sol_price_usd: u64,
    pub last_update_timestamp: i64,
    pub next_update_timestamp: i64,
    pub keeper_authority: Pubkey,
    pub update_count: u64,
}

// =================================================================
// INSTRUCTION CONTEXTS
// =================================================================

#[derive(Accounts)]
pub struct InitializePriceOracle<'info> {
    #[account(
        init,
        payer = keeper_authority,
        space = 8 + 72,
        seeds = [b"price_oracle"],
        bump
    )]
    pub price_oracle: Account<'info, PriceOracle>,
    
    #[account(mut)]
    pub keeper_authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSolPrice<'info> {
    #[account(
        mut,
        seeds = [b"price_oracle"],
        bump,
        constraint = price_oracle.keeper_authority == keeper_authority.key() @ BonkError::Unauthorized
    )]
    pub price_oracle: Account<'info, PriceOracle>,
    
    #[account(mut)]
    pub keeper_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateBattleToken<'info> {
    #[account(
        init,
        payer = user,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = token_battle_state,
        mint::freeze_authority = token_battle_state,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 54 + 14 + 204,
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
        bump = token_battle_state.bump,
        constraint = token_battle_state.is_active @ BonkError::TradingInactive
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
        bump = token_battle_state.bump,
        constraint = token_battle_state.is_active @ BonkError::TradingInactive
    )]
    pub token_battle_state: Account<'info, TokenBattleState>,
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
        constraint = user_token_account.amount > 0 @ BonkError::InsufficientBalance
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
        bump = token_a_state.bump,
        constraint = token_a_state.battle_status == BattleStatus::Qualified @ BonkError::NotQualified,
        constraint = token_a_state.is_active @ BonkError::TradingInactive
    )]
    pub token_a_state: Account<'info, TokenBattleState>,
    
    #[account(
        mut,
        seeds = [b"battle_state", token_b_state.mint.as_ref()],
        bump = token_b_state.bump,
        constraint = token_b_state.battle_status == BattleStatus::Qualified @ BonkError::NotQualified,
        constraint = token_b_state.is_active @ BonkError::TradingInactive,
        constraint = token_b_state.mint != token_a_state.mint @ BonkError::SelfBattle
    )]
    pub token_b_state: Account<'info, TokenBattleState>,
    
    #[account(seeds = [b"price_oracle"], bump)]
    pub price_oracle: Account<'info, PriceOracle>,
    
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
    
    #[account(mut)]
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
    
    #[account(mut)]
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
    pub tier: BattleTier,
    pub initial_market_cap_usd: u64,
    pub virtual_sol_init: u64,
    pub constant_k: u128,
    pub target_sol: u64,
    pub timestamp: i64,
}

#[event]
pub struct GladiatorQualified {
    pub mint: Pubkey,
    pub market_cap_usd: u64,
    pub sol_collected: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenPurchased {
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub tokens_received: u64,
    pub new_market_cap_usd: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub sol_price: u64,
}

#[event]
pub struct TokenSold {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub token_amount: u64,
    pub sol_received: u64,
    pub new_market_cap_usd: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub sol_price: u64,
}

#[event]
pub struct BattleStarted {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub mc_a_usd: u64,
    pub mc_b_usd: u64,
    pub tier: BattleTier,
    pub timestamp: i64,
}

#[event]
pub struct VictoryAchieved {
    pub winner_mint: Pubkey,
    pub final_mc_usd: u64,
    pub final_volume_usd: u64,
    pub sol_collected: u64,
    pub victory_timestamp: i64,
}

#[event]
pub struct DuelFinalized {
    pub winner_mint: Pubkey,
    pub loser_mint: Pubkey,
    pub spoils_transferred: u64,
    pub platform_fee_collected: u64,
    pub total_winner_liquidity: u64,
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
    #[msg("Invalid tier: must be 0 (Test) or 1 (Production)")]
    InvalidTier,
    #[msg("Tier mismatch: both tokens must be same tier")]
    TierMismatch,
    #[msg("Amount too small: minimum transaction required")]
    AmountTooSmall,
    #[msg("Amount too large: maximum transaction exceeded")]
    AmountTooLarge,
    #[msg("Trading is inactive for this token")]
    TradingInactive,
    #[msg("Insufficient output from bonding curve")]
    InsufficientOutput,
    #[msg("Slippage exceeded: output less than minimum")]
    SlippageExceeded,
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
    #[msg("Unfair match: market cap difference too large")]
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
    #[msg("Would exceed graduation threshold")]
    WouldExceedGraduation,
    #[msg("Token not ready for listing")]
    NotReadyForListing,
    #[msg("No liquidity to withdraw for listing")]
    NoLiquidityToWithdraw,
}