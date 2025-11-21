// =================================================================
// FILE: contracts/programs/contracts/src/lib.rs
// BONK BATTLE - OOPTIMIZED BONDING CURVE + DAILY PRICE ORACLE
// Graduation: $5,000 → $5,500 | 10.78 SOL Collection
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
// SECURITY CONSTANTS - HARDCODED FOR BULLETPROOF OPERATION
// =================================================================

const TREASURY_WALLET: &str = "5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf";
const KEEPER_AUTHORITY: &str = "753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3";

// =================================================================
// OPTIMIZED BONDING CURVE PARAMETERS (MATHEMATICALLY PROVEN)
// =================================================================

const TOTAL_SUPPLY: u64 = 1000000000000000000; // 1B * 10^9 = 10^18
const BONDING_CURVE_SUPPLY: u64 = 800000000000000000; // 800M * 10^9 = 8*10^17
const RAYDIUM_RESERVED_SUPPLY: u64 = 200000000000000000; // 200M * 10^9 = 2*10^17

// GRADUATION PARAMETERS - CORRETTI PER ALLINEARSI ALLA VITTORIA
// NUOVI VALORI CORRETTI: Ora graduation = vittoria a $5,500
const SOL_FOR_GRADUATION: u64 = 10_784_313_725; // 10.78 SOL in lamports (per $5,500 finale)
const TARGET_MARKET_CAP_USD: u64 = 5_500; // $5,500 USD (uguale alla vittoria)
const INITIAL_MARKET_CAP_USD: u64 = 5_000; // $5,000 USD

// BATTLE THRESHOLDS - IN USD
const QUALIFICATION_MC_USD: u64 = 5_100; // $5,100 per qualificarsi
const VICTORY_MC_USD: u64 = 5_500; // $5,500 per vittoria (ora allineato con graduation)
const VICTORY_VOLUME_USD: u64 = 100; // $100 volume
const MATCHMAKING_TOLERANCE_USD: u64 = 5_000; // $5,000 tolleranza

// FEE STRUCTURE
const TRADING_FEE_BPS: u64 = 200; // 2.00%
const PLATFORM_FEE_BPS: u64 = 500; // 5.00%

// SECURITY LIMITS
const MAX_SOL_PER_TX: u64 = 100_000_000_000; // 100 SOL max
const MIN_SOL_PER_TX: u64 = 1_000_000; // 0.001 SOL min

// ORACLE UPDATE INTERVAL
const PRICE_UPDATE_INTERVAL: i64 = 86400; // 24 ore in secondi

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

        let initial_mc_usd = INITIAL_MARKET_CAP_USD;
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        let initial_mc_lamports = calculate_usd_to_lamports(initial_mc_usd, sol_price)?;

        emit!(GladiatorForged {
            mint: mint_key,
            creator: ctx.accounts.user.key(),
            initial_market_cap_usd: initial_mc_usd,
            initial_market_cap_lamports: initial_mc_lamports,
            sol_price_at_creation: sol_price,
            timestamp: battle_state.creation_timestamp,
        });

        msg!(
            "✅ GLADIATOR FORGED! Initial MC: ${} USD ({} lamports at ${}/SOL)",
            initial_mc_usd,
            initial_mc_lamports,
            sol_price / 1_000_000
        );
        Ok(())
    }

    // =================================================================
    // PHASE 2: OPTIMIZED BONDING CURVE TRADING
    // =================================================================

    pub fn buy_token(ctx: Context<BuyToken>, sol_amount: u64) -> Result<()> {
        require!(sol_amount >= MIN_SOL_PER_TX, BonkError::AmountTooSmall);
        require!(sol_amount <= MAX_SOL_PER_TX, BonkError::AmountTooLarge);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        let total_sol_after = ctx.accounts.token_battle_state.sol_collected
            .checked_add(sol_amount)
            .ok_or(BonkError::MathOverflow)?;
        
        require!(
            total_sol_after <= SOL_FOR_GRADUATION,
            BonkError::WouldExceedGraduation
        );

        let tokens_to_give = calculate_buy_amount_optimized(
            sol_amount, 
            ctx.accounts.token_battle_state.sol_collected
        )?;
        
        require!(tokens_to_give > 0, BonkError::InsufficientOutput);

        let fee = sol_amount
            .checked_mul(TRADING_FEE_BPS)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let amount_to_collect = sol_amount.checked_sub(fee).unwrap();

        // Transfer SOL
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

        // Transfer tokens
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
            .checked_add(sol_amount)
            .unwrap();
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;

        let current_mc_usd = calculate_market_cap_usd(battle_state.sol_collected)?;
        
        if current_mc_usd >= QUALIFICATION_MC_USD && old_status == BattleStatus::Created {
            battle_state.battle_status = BattleStatus::Qualified;
            msg!("🎯 GLADIATOR QUALIFIED! MC: ${} USD", current_mc_usd);
        }

        let sol_price = ctx.accounts.price_oracle.sol_price_usd;
        
        if old_status == BattleStatus::Created && battle_state.battle_status == BattleStatus::Qualified {
            emit!(GladiatorQualified {
                mint: battle_state.mint,
                market_cap_usd: current_mc_usd,
                sol_collected: battle_state.sol_collected,
                timestamp: battle_state.last_trade_timestamp,
            });
        }

        if battle_state.sol_collected >= SOL_FOR_GRADUATION {
            msg!(
                "🎓 GRADUATION REACHED! {} SOL collected = ${} Market Cap",
                SOL_FOR_GRADUATION / 1_000_000_000,
                TARGET_MARKET_CAP_USD
            );
        }

        emit!(TokenPurchased {
            mint: battle_state.mint,
            buyer: ctx.accounts.user.key(),
            sol_amount,
            tokens_received: tokens_to_give,
            new_market_cap_usd: current_mc_usd,
            sol_price,
        });

        msg!(
            "💰 BUY: {} tokens for {} SOL. MC: ${} USD | Status: {:?}",
            tokens_to_give / 1_000_000,
            sol_amount / 1_000_000_000,
            current_mc_usd,
            battle_state.battle_status
        );
        Ok(())
    }
    
    pub fn sell_token(ctx: Context<SellToken>, token_amount: u64) -> Result<()> {
        require!(token_amount > 0, BonkError::AmountTooSmall);
        require!(
            ctx.accounts.token_battle_state.is_active,
            BonkError::TradingInactive
        );

        let sol_to_return = calculate_sell_amount_optimized(
            token_amount,
            ctx.accounts.token_battle_state.sol_collected,
        )?;
        require!(sol_to_return > 0, BonkError::InsufficientOutput);
        require!(
            ctx.accounts.token_battle_state.sol_collected >= sol_to_return,
            BonkError::InsufficientLiquidity
        );

        // Burn tokens
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
        battle_state.total_trade_volume = battle_state
            .total_trade_volume
            .checked_add(sol_to_return)
            .unwrap();
        battle_state.last_trade_timestamp = Clock::get()?.unix_timestamp;
        
        let new_mc_usd = calculate_market_cap_usd(battle_state.sol_collected)?;
        let sol_price = ctx.accounts.price_oracle.sol_price_usd;

        emit!(TokenSold {
            mint: battle_state.mint,
            seller: ctx.accounts.user.key(),
            token_amount,
            sol_received: amount_to_user,
            new_market_cap_usd: new_mc_usd,
            sol_price,
        });

        msg!(
            "💸 SELL: {} tokens for {} SOL. MC: ${} USD",
            token_amount / 1_000_000,
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
        
        let token_a = &mut ctx.accounts.token_a_state;
        let token_b = &mut ctx.accounts.token_b_state;

        require!(token_a.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_b.battle_status == BattleStatus::Qualified, BonkError::NotQualified);
        require!(token_a.mint != token_b.mint, BonkError::SelfBattle);
        require!(token_a.is_active && token_b.is_active, BonkError::TradingInactive);

        let mc_a_usd = calculate_market_cap_usd(token_a.sol_collected)?;
        let mc_b_usd = calculate_market_cap_usd(token_b.sol_collected)?;
        
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

        let current_mc_usd = calculate_market_cap_usd(token_state.sol_collected)?;
        let volume_usd = (token_state.total_trade_volume as u128)
            .checked_mul(oracle.sol_price_usd as u128).unwrap()
            .checked_div(1_000_000_000 as u128).unwrap()
            .checked_div(1_000_000 as u128).unwrap() as u64;

        let has_mc_victory = current_mc_usd >= VICTORY_MC_USD;
        let has_volume_victory = volume_usd >= VICTORY_VOLUME_USD;

        if has_mc_victory && has_volume_victory {
            token_state.battle_status = BattleStatus::VictoryPending;
            token_state.victory_timestamp = Clock::get()?.unix_timestamp;
            
            emit!(VictoryAchieved {
                winner_mint: token_state.mint,
                final_mc_usd: current_mc_usd,
                final_volume_usd: volume_usd,
                sol_collected: token_state.sol_collected,
                victory_timestamp: token_state.victory_timestamp,
            });
            
            msg!("🏆 VICTORY! MC: ${} | Volume: ${} | SOL: {}", 
                 current_mc_usd, volume_usd, token_state.sol_collected / 1_000_000_000);
        } else {
            msg!("⚔️ Battle continues... MC: ${}/{} | Volume: ${}/{}", 
                 current_mc_usd, VICTORY_MC_USD,
                 volume_usd, VICTORY_VOLUME_USD);
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

        winner_state.is_active = false;

        let loser_liquidity = loser_state.sol_collected;
        let spoils_of_war = loser_liquidity.checked_div(2).unwrap();
        
        let winner_current = winner_state.sol_collected;
        let total_after_plunder = winner_current.checked_add(spoils_of_war).unwrap();
        let platform_fee = total_after_plunder
            .checked_mul(PLATFORM_FEE_BPS).unwrap()
            .checked_div(10000).unwrap();
        
        let keeper_share = platform_fee * 80 / 100;
        let treasury_share = platform_fee * 20 / 100;
        
        let net_to_winner = spoils_of_war.checked_sub(platform_fee).unwrap();

        if spoils_of_war > 0 {
            **loser_state.to_account_info().try_borrow_mut_lamports()? -= spoils_of_war;
            **winner_state.to_account_info().try_borrow_mut_lamports()? += net_to_winner;
            **ctx.accounts.keeper_authority.to_account_info().try_borrow_mut_lamports()? += keeper_share;
            **ctx.accounts.treasury_wallet.to_account_info().try_borrow_mut_lamports()? += treasury_share;

            winner_state.sol_collected = winner_state.sol_collected.checked_add(net_to_winner).unwrap();
            loser_state.sol_collected = loser_state.sol_collected.checked_sub(spoils_of_war).unwrap();
        }

        let finalization_timestamp = Clock::get()?.unix_timestamp;
        
        winner_state.battle_status = BattleStatus::Listed;
        winner_state.listing_timestamp = finalization_timestamp;
        winner_state.opponent_mint = Pubkey::default();

        loser_state.battle_status = BattleStatus::Qualified;
        loser_state.is_active = true;
        loser_state.opponent_mint = Pubkey::default();

        emit!(DuelFinalized {
            winner_mint: winner_state.mint,
            loser_mint: loser_state.mint,
            spoils_transferred: net_to_winner,
            platform_fee_collected: platform_fee,
            total_winner_liquidity: winner_state.sol_collected,
            loser_can_retry: true,
            timestamp: finalization_timestamp,
        });

        msg!("🎉 DUEL FINALIZED! Winner liquidity: {} SOL | Platform fee: {} SOL", 
             winner_state.sol_collected / 1_000_000_000, 
             platform_fee / 1_000_000_000);
        
        Ok(())
    }

    pub fn withdraw_for_listing(ctx: Context<WithdrawForListing>) -> Result<()> {
        require!(
            ctx.accounts.token_battle_state.battle_status == BattleStatus::Listed,
            BonkError::NotReadyForListing
        );
        
        let account_info = ctx.accounts.token_battle_state.to_account_info();
        let rent = Rent::get()?.minimum_balance(account_info.data_len());
        let available_lamports = account_info.lamports().checked_sub(rent).unwrap_or(0);
        
        require!(available_lamports > 0, BonkError::NoLiquidityToWithdraw);
        
        **account_info.try_borrow_mut_lamports()? -= available_lamports;
        **ctx.accounts.keeper_authority.to_account_info().try_borrow_mut_lamports()? += available_lamports;
        
        let mint_key = ctx.accounts.mint.key();
        let battle_state = &ctx.accounts.token_battle_state;
        let seeds = &[b"battle_state", mint_key.as_ref(), &[battle_state.bump]];
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
            9,
        )?;
        
        let battle_state = &mut ctx.accounts.token_battle_state;
        battle_state.sol_collected = 0;
        
        emit!(ListingWithdrawal {
            mint: ctx.accounts.mint.key(),
            sol_withdrawn: available_lamports,
            tokens_withdrawn: RAYDIUM_RESERVED_SUPPLY,
            keeper: ctx.accounts.keeper_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("📤 WITHDRAWAL FOR LISTING: {} SOL + 200M tokens sent to Keeper", 
             available_lamports / 1_000_000_000);
        
        Ok(())
    }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

fn calculate_market_cap_usd(sol_collected: u64) -> Result<u64> {
    if sol_collected == 0 {
        return Ok(INITIAL_MARKET_CAP_USD);
    }
    
    let progress = (sol_collected as u128)
        .checked_mul(1_000_000).unwrap()
        .checked_div(SOL_FOR_GRADUATION as u128).unwrap();
    
    let mc_range = TARGET_MARKET_CAP_USD - INITIAL_MARKET_CAP_USD;
    let additional_mc = (mc_range as u128)
        .checked_mul(progress).unwrap()
        .checked_div(1_000_000).unwrap() as u64;
    
    Ok(INITIAL_MARKET_CAP_USD + additional_mc)
}

fn calculate_buy_amount_optimized(sol_amount: u64, sol_already_collected: u64) -> Result<u64> {
    let tokens_already_sold = if SOL_FOR_GRADUATION > 0 {
        (sol_already_collected as u128)
            .checked_mul(BONDING_CURVE_SUPPLY as u128)
            .ok_or(BonkError::MathOverflow)?
            .checked_div(SOL_FOR_GRADUATION as u128)
            .ok_or(BonkError::MathOverflow)?
    } else {
        0
    } as u64;
    
    let tokens_remaining = BONDING_CURVE_SUPPLY
        .checked_sub(tokens_already_sold)
        .ok_or(BonkError::MathOverflow)?;
    
    let sol_remaining = SOL_FOR_GRADUATION
        .checked_sub(sol_already_collected)
        .ok_or(BonkError::MathOverflow)?;
    
    if sol_remaining == 0 {
        return Ok(0);
    }
    
    let tokens_out = (sol_amount as u128)
        .checked_mul(tokens_remaining as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(sol_remaining as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_mul(98)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(100)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    if tokens_out > tokens_remaining {
        return Ok(tokens_remaining * 90 / 100);
    }
    
    Ok(tokens_out)
}

fn calculate_sell_amount_optimized(token_amount: u64, sol_collected: u64) -> Result<u64> {
    if sol_collected == 0 {
        return Ok(0);
    }
    
    let tokens_sold = if SOL_FOR_GRADUATION > 0 {
        (sol_collected as u128)
            .checked_mul(BONDING_CURVE_SUPPLY as u128)
            .ok_or(BonkError::MathOverflow)?
            .checked_div(SOL_FOR_GRADUATION as u128)
            .ok_or(BonkError::MathOverflow)?
    } else {
        return Ok(0);
    } as u64;
    
    let sol_out = (token_amount as u128)
        .checked_mul(sol_collected as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(tokens_sold as u128)
        .ok_or(BonkError::MathOverflow)?
        .checked_mul(98)
        .ok_or(BonkError::MathOverflow)?
        .checked_div(100)
        .ok_or(BonkError::MathOverflow)? as u64;
    
    if sol_out > sol_collected {
        return Ok(sol_collected * 90 / 100);
    }
    
    Ok(sol_out)
}

fn calculate_usd_to_lamports(usd_amount: u64, sol_price_usd: u64) -> Result<u64> {
    let lamports = (usd_amount as u128)
        .checked_mul(1_000_000_000).unwrap()
        .checked_mul(1_000_000).unwrap()
        .checked_div(sol_price_usd as u128).unwrap();
    
    Ok(lamports as u64)
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
}

impl Default for BattleStatus {
    fn default() -> Self {
        BattleStatus::Created
    }
}

#[account]
#[derive(Default)]
pub struct TokenBattleState {
    pub mint: Pubkey,                    // 32
    pub sol_collected: u64,              // 8
    pub tokens_sold: u64,                // 8
    pub total_trade_volume: u64,         // 8
    pub is_active: bool,                 // 1
    pub battle_status: BattleStatus,     // 1
    pub opponent_mint: Pubkey,           // 32
    pub creation_timestamp: i64,         // 8
    pub last_trade_timestamp: i64,       // 8
    pub battle_start_timestamp: i64,     // 8
    pub victory_timestamp: i64,          // 8
    pub listing_timestamp: i64,          // 8
    pub qualification_timestamp: i64,    // 8 ← GIÀ C'ERA NEL PARSING
    pub bump: u8,                        // 1
    // ⭐ NUOVI CAMPI METADATA
    pub name: String,                    // 4 + 32 = 36
    pub symbol: String,                  // 4 + 10 = 14
    pub uri: String,                     // 4 + 200 = 204
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
        mint::decimals = 9,
        mint::authority = token_battle_state,
        mint::freeze_authority = token_battle_state,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 36 + 14 + 204, // = 485 bytes
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
    pub initial_market_cap_usd: u64,
    pub initial_market_cap_lamports: u64,
    pub sol_price_at_creation: u64,
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
    pub sol_price: u64,
}

#[event]
pub struct TokenSold {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub token_amount: u64,
    pub sol_received: u64,
    pub new_market_cap_usd: u64,
    pub sol_price: u64,
}

#[event]
pub struct BattleStarted {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub mc_a_usd: u64,
    pub mc_b_usd: u64,
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
    #[msg("Price update too soon, must wait 24 hours")]
    PriceUpdateTooSoon,
    #[msg("Would exceed graduation threshold")]
    WouldExceedGraduation,
    #[msg("Token not ready for listing")]
    NotReadyForListing,
    #[msg("No liquidity to withdraw for listing")]
    NoLiquidityToWithdraw,
}