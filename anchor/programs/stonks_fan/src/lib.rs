use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, MintTo, FreezeAccount, ThawAccount, SetAuthority};
use anchor_spl::token::spl_token;
use anchor_spl::associated_token::AssociatedToken;
 
declare_id!("DxchSpAi7A14f9o1LGPr18HikXEjMT6VXj1oy24VXAgN");

// Treasury e Admin constants
const TREASURY: Pubkey = pubkey!("A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn");
pub const KEEPER: Pubkey = pubkey!("AdGyjsrkKsCmyVisJvasCAiUDmJ6qRjoaceg1gCeExdE");
const ADMIN: Pubkey = pubkey!("BNSr8S88xncQGmWjVLW82MnKJcasEXDvaQqYmgKSuAXB");

// ============ STONKS.FUN - MULTI-TIER BONDING CURVE ============
//
// 🎯 Ogni tier ha parametri diversi per scaling 10x:
// - Tier 1: 18.64 SOL init, k=20T, target=255 SOL ($50k)
// - Tier 2: 186.41 SOL init, k=200T, target=2,551 SOL ($500k)
// - Tier 3: 1,864.98 SOL init, k=2,000T, target=25,510 SOL ($5M)
// - Tier 4: 18,649.79 SOL init, k=20,000T, target=255,102 SOL ($50M)
//
// ✅ Moltiplicatore costante 14.68x per tutti i tier
// ✅ Perfect 10x scaling tra tier
//
// ============================================================
pub const POOL_SOL_VAULT_SEED: &[u8] = b"pool_sol_vault";
pub const POOL_TOKEN_VAULT_SEED: &[u8] = b"pool_token_vault";
// ============ Constants - BONDING CURVE ============

/// Token decimals (come Pump.fun)
pub const TOKEN_DECIMALS: u8 = 6;

/// ⭐ FISSO: Virtual token supply iniziale (1.073B tokens con 6 decimals)
pub const VIRTUAL_SUPPLY: u64 = 1_073_000_000_000_000_000;

/// Total supply reale (1 miliardo)
pub const REAL_SUPPLY: u64 = 1_000_000_000_000_000_000;

/// Token disponibili sulla bonding curve (793.1M = 79.31%)
pub const CURVE_TOKENS: u64 = 793_100_000_000_000_000;

/// Token riservati per Meteora (206.9M = 20.69%)
pub const METEORA_TOKENS: u64 = 206_900_000_000_000;

// PDA Seeds
pub const LAUNCH_SEED: &[u8] = b"launch";
pub const MINT_SEED: &[u8] = b"mint";
pub const BUYER_SEED: &[u8] = b"buyer";

// Fees
pub const PLATFORM_FEE_BPS: u16 = 200; // 2%
pub const REFUND_FEE_BPS: u16 = 200;   // 2%
pub const CREATION_FEE: u64 = 10_000_000; // 0.01 SOL

// ⭐ TIER TARGETS - CORRETTI (in lamports)
pub const TIER_1_TARGET_SOL: u64 = 1_000_000_000;       // 1 SOL per testing
pub const TIER_2_TARGET_SOL: u64 = 2_551_000_000_000;     // 2,551 SOL (~$500k)
pub const TIER_3_TARGET_SOL: u64 = 25_510_000_000_000;    // 25,510 SOL (~$5M)
pub const TIER_4_TARGET_SOL: u64 = 255_102_000_000_000;   // 255,102 SOL (~$50M)

// Tier Durations
pub const TIER_1_DURATION: i64 = 3 * 60;  // 3 minuti
pub const TIER_2_DURATION: i64 = 7 * 24 * 60 * 60;   // 7 giorni
pub const TIER_3_DURATION: i64 = 15 * 24 * 60 * 60;  // 15 giorni
pub const TIER_4_DURATION: i64 = 30 * 24 * 60 * 60;  // 30 giorni

// Meteora - Distribution model (Pump.fun style!)
pub const METEORA_LIQUIDITY_PERCENT: u8 = 93;  // 93% to pool
pub const TREASURY_FEE_PERCENT: u8 = 7;         // 7% to treasury
pub const METEORA_POOL_CREATION_COST: u64 = 22_000_000;

// Limiti
pub const MAX_SOL_PER_TX: u64 = 100_000_000_000;
pub const MIN_SOL_PER_TX: u64 = 10_000_000;
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_URI_LENGTH: usize = 200;
pub const MAX_THAW_PER_TX: usize = 10;

// Price (fisso per MVP)
pub const FIXED_SOL_PRICE_USD: u64 = 100_000_000; // $100 (6 decimals)

#[program]
pub mod stonks_fan {
    use super::*;

    /// Crea un nuovo token launch
    pub fn create_token(
        ctx: Context<CreateToken>,
        _mint_seed: u64,
        tier: u8,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(tier >= 1 && tier <= 4, ErrorCode::InvalidTier);
        require!(name.len() > 0 && name.len() <= MAX_NAME_LENGTH, ErrorCode::NameTooLong);
        require!(symbol.len() > 0 && symbol.len() <= MAX_SYMBOL_LENGTH, ErrorCode::SymbolTooLong);
        require!(uri.len() > 0 && uri.len() <= MAX_URI_LENGTH, ErrorCode::UriTooLong);
        
        require!(
            name.chars().all(|c| c.is_ascii_alphanumeric() || c.is_ascii_whitespace()),
            ErrorCode::InvalidCharacters
        );
        require!(
            symbol.chars().all(|c| c.is_ascii_alphanumeric()),
            ErrorCode::InvalidCharacters
        );
        
        // Transfer creation fee
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.creator.key,
            &TREASURY,
            CREATION_FEE,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let clock = Clock::get()?;
        let launch = &mut ctx.accounts.token_launch;
        
        // ⭐ NUOVO: Get parametri per tier
        let (virtual_sol_init, constant_k, target_sol) = get_tier_params(tier)?;
        
        launch.creator = *ctx.accounts.creator.key;
        launch.mint = ctx.accounts.mint.key();
        launch.tier = tier;
        launch.virtual_sol_init = virtual_sol_init;  // ⭐ NUOVO
        launch.constant_k = constant_k;              // ⭐ NUOVO
        launch.target_sol = target_sol;
        launch.deadline = clock
            .unix_timestamp
            .checked_add(get_tier_duration(tier)?)
            .ok_or(ErrorCode::MathOverflow)?;
        launch.sol_raised = 0;
        launch.status = LaunchStatus::Active;
        launch.created_at = clock.unix_timestamp;
        launch.graduated_at = None;
        launch.meteora_pool = None;
        launch.total_buyers = 0;
        launch.total_tokens_sold = 0;
        launch.name = name.clone();
        launch.symbol = symbol.clone();
        launch.uri = uri.clone();
        launch.bump = ctx.bumps.token_launch;
        
        emit!(TokenCreated {
            mint: launch.mint,
            creator: launch.creator,
            tier,
            virtual_sol_init,
            constant_k,
            target_sol,
            deadline: launch.deadline,
        });
        
        msg!("✅ Token created: {}", launch.mint);
        msg!("🎯 Tier {}: {} SOL init, target {} SOL", 
            tier,
            virtual_sol_init / 1_000_000_000,
            target_sol / 1_000_000_000
        );
        
        Ok(())
    }

    /// Compra token dalla bonding curve
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        require!(sol_amount >= MIN_SOL_PER_TX, ErrorCode::AmountTooSmall);
        require!(sol_amount <= MAX_SOL_PER_TX, ErrorCode::AmountTooLarge);
        
        let launch = &mut ctx.accounts.token_launch;
        let clock = Clock::get()?;
        
        require!(
            launch.status == LaunchStatus::Active || launch.status == LaunchStatus::ReadyToGraduate,
            ErrorCode::NotActive
        );
        require!(clock.unix_timestamp < launch.deadline, ErrorCode::DeadlinePassed);
        
        let sol_price_usd = FIXED_SOL_PRICE_USD;
        
        // Platform fee
        let fee = sol_amount
            .checked_mul(PLATFORM_FEE_BPS as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;
        
        let sol_to_curve = sol_amount
            .checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?;
        
        // ⭐ BONDING CURVE: Usa parametri per-tier
        let tokens_out = calculate_tokens_out(
            sol_to_curve,
            launch.sol_raised,
            launch.virtual_sol_init,  // ⭐ Per-tier
            launch.constant_k,        // ⭐ Per-tier
        )?;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out > 0, ErrorCode::InsufficientOutput);
        
        let new_total_sold = launch
            .total_tokens_sold
            .checked_add(tokens_out)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(new_total_sold <= CURVE_TOKENS, ErrorCode::ExceededCurveSupply);
        
        // Transfers
        let transfer_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.buyer.key,
            &TREASURY,
            fee,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_fee_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let transfer_sol_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.buyer.key,
            launch.to_account_info().key,
            sol_to_curve,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_sol_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                launch.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Mint tokens
        let seeds = &[
            LAUNCH_SEED,
            launch.mint.as_ref(),
            &[launch.bump],
        ];
        let signer = &[&seeds[..]];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: launch.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;
        
        // Buyer record
        let buyer_record = &mut ctx.accounts.buyer_record;
        buyer_record.launch = launch.key();
        buyer_record.buyer = *ctx.accounts.buyer.key;
        buyer_record.sol_spent = sol_amount;
        buyer_record.tokens_received = tokens_out;
        buyer_record.refund_claimed = false;
        buyer_record.first_buy_timestamp = clock.unix_timestamp;
        buyer_record.last_buy_timestamp = clock.unix_timestamp;
        buyer_record.bump = ctx.bumps.buyer_record;
        
        launch.total_buyers = launch
            .total_buyers
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        
        launch.sol_raised = launch
            .sol_raised
            .checked_add(sol_to_curve)
            .ok_or(ErrorCode::MathOverflow)?;
        launch.total_tokens_sold = new_total_sold;
        
        // ⭐ Market cap usando parametri per-tier
        let current_mc = calculate_market_cap(
            launch.sol_raised,
            sol_price_usd,
            launch.virtual_sol_init,
            launch.constant_k,
        )?;
        
        let progress = ((launch.sol_raised as u128)
            .checked_mul(10000)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(launch.target_sol as u128)
            .ok_or(ErrorCode::MathOverflow)?) as u16;
        
        emit!(TokensPurchased {
            mint: launch.mint,
            buyer: *ctx.accounts.buyer.key,
            sol_amount,
            tokens_received: tokens_out,
            sol_raised: launch.sol_raised,
            current_market_cap: current_mc,
            progress_bps: progress,
        });
        
        if launch.sol_raised >= launch.target_sol && launch.status == LaunchStatus::Active {
            launch.status = LaunchStatus::ReadyToGraduate;
            msg!("🎉 TARGET REACHED! {} SOL collected", launch.sol_raised / 1_000_000_000);
        }
        
        Ok(())
    }

    /// Compra più token
    pub fn buy_more_tokens(
        ctx: Context<BuyMoreTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        require!(sol_amount >= MIN_SOL_PER_TX, ErrorCode::AmountTooSmall);
        require!(sol_amount <= MAX_SOL_PER_TX, ErrorCode::AmountTooLarge);
        
        let launch = &mut ctx.accounts.token_launch;
        let clock = Clock::get()?;
        
        require!(
            launch.status == LaunchStatus::Active || launch.status == LaunchStatus::ReadyToGraduate,
            ErrorCode::NotActive
        );
        require!(clock.unix_timestamp < launch.deadline, ErrorCode::DeadlinePassed);
        
        let sol_price_usd = FIXED_SOL_PRICE_USD;
        
        let fee = sol_amount
            .checked_mul(PLATFORM_FEE_BPS as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;
        
        let sol_to_curve = sol_amount
            .checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?;
        
        // ⭐ Usa parametri per-tier
        let tokens_out = calculate_tokens_out(
            sol_to_curve,
            launch.sol_raised,
            launch.virtual_sol_init,
            launch.constant_k,
        )?;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out > 0, ErrorCode::InsufficientOutput);
        
        let new_total_sold = launch
            .total_tokens_sold
            .checked_add(tokens_out)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(new_total_sold <= CURVE_TOKENS, ErrorCode::ExceededCurveSupply);
        
        // Transfers
        let transfer_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.buyer.key,
            &TREASURY,
            fee,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_fee_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let transfer_sol_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.buyer.key,
            launch.to_account_info().key,
            sol_to_curve,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_sol_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                launch.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let seeds = &[
            LAUNCH_SEED,
            launch.mint.as_ref(),
            &[launch.bump],
        ];
        let signer = &[&seeds[..]];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: launch.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;
        
        let buyer_record = &mut ctx.accounts.buyer_record;
        buyer_record.sol_spent = buyer_record
            .sol_spent
            .checked_add(sol_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        buyer_record.tokens_received = buyer_record
            .tokens_received
            .checked_add(tokens_out)
            .ok_or(ErrorCode::MathOverflow)?;
        buyer_record.last_buy_timestamp = clock.unix_timestamp;
        
        launch.sol_raised = launch
            .sol_raised
            .checked_add(sol_to_curve)
            .ok_or(ErrorCode::MathOverflow)?;
        launch.total_tokens_sold = new_total_sold;
        
        let current_mc = calculate_market_cap(
            launch.sol_raised,
            sol_price_usd,
            launch.virtual_sol_init,
            launch.constant_k,
        )?;
        
        let progress = ((launch.sol_raised as u128)
            .checked_mul(10000)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(launch.target_sol as u128)
            .ok_or(ErrorCode::MathOverflow)?) as u16;
        
        emit!(TokensPurchased {
            mint: launch.mint,
            buyer: *ctx.accounts.buyer.key,
            sol_amount,
            tokens_received: tokens_out,
            sol_raised: launch.sol_raised,
            current_market_cap: current_mc,
            progress_bps: progress,
        });
        
        if launch.sol_raised >= launch.target_sol && launch.status == LaunchStatus::Active {
            launch.status = LaunchStatus::ReadyToGraduate;
            msg!("🎉 TARGET REACHED! {} SOL collected", launch.sol_raised / 1_000_000_000);
        }
        
        Ok(())
    }

/// Step 1: Transfer SOL to treasury and pool
pub fn finalize_graduation_step1(ctx: Context<FinalizeGraduationStep1>) -> Result<()> {
    let launch = &mut ctx.accounts.token_launch;
    
    // Verify ready to graduate
    require!(
        launch.status == LaunchStatus::ReadyToGraduate,
        ErrorCode::NotReadyToGraduate
    );
    require!(
        launch.sol_raised >= launch.target_sol,
        ErrorCode::TargetNotReached
    );
    
    // ⭐ COPIA DA claim_refund: calcola rent-exempt dinamicamente
    let rent = Rent::get()?;
    let launch_rent_exempt = rent.minimum_balance(launch.to_account_info().data_len());
    
    // Get current vault balance
    let launch_balance = **launch.to_account_info().try_borrow_lamports()?;
    
    // Calculate available SOL (exclude rent-exempt)
    let total_sol = launch_balance
        .checked_sub(launch_rent_exempt)
        .ok_or(ErrorCode::InsufficientBalance)?;
    
    msg!("💼 Vault balance: {} lamports", launch_balance);
    msg!("💰 Rent-exempt: {} lamports", launch_rent_exempt);
    msg!("💵 Available SOL: {} lamports", total_sol);
    
    // Calculate treasury fee (7%)
    let treasury_fee = total_sol
        .checked_mul(7)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Pool gets the rest
    let liquidity_sol = total_sol
        .checked_sub(treasury_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // ⭐ COPIA DA claim_refund: verifica balance_after
    let total_to_withdraw = treasury_fee
        .checked_add(liquidity_sol)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let balance_after = launch_balance
        .checked_sub(total_to_withdraw)
        .ok_or(ErrorCode::InsufficientBalance)?;
    
    require!(
        balance_after >= launch_rent_exempt,
        ErrorCode::InsufficientBalance
    );
    
msg!("💰 Keeper fee (7%): {} SOL", treasury_fee / 1_000_000_000);    msg!("🏊 Pool liquidity (93%): {} SOL", liquidity_sol / 1_000_000_000);
    
    // Transfer keeper fee (7% for graduation)
    
    if treasury_fee > 0 {
    **launch.to_account_info().try_borrow_mut_lamports()? -= treasury_fee;
    **ctx.accounts.keeper.try_borrow_mut_lamports()? += treasury_fee;
    msg!("✅ Keeper fee transferred (7%)");
}
    // Transfer SOL to pool vault
    **launch.to_account_info().try_borrow_mut_lamports()? -= liquidity_sol;
    **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? += liquidity_sol;
    msg!("✅ SOL transferred to pool vault");
    
    // Update status
    launch.status = LaunchStatus::GraduationInProgress;
    
    msg!("🚀 STEP 1 COMPLETE - SOL transferred!");
    
    Ok(())
}

/// Step 2: Mint tokens and revoke authorities
pub fn finalize_graduation_step2(ctx: Context<FinalizeGraduationStep2>) -> Result<()> {
    let launch = &mut ctx.accounts.token_launch;
    
    // Verify status
    require!(
        launch.status == LaunchStatus::GraduationInProgress,
        ErrorCode::InvalidStatus
    );
    
    // Calculate tokens for liquidity (FISSO: 206.9M)
    let tokens_for_liquidity = METEORA_TOKENS;
    
    msg!("🪙 Tokens for liquidity: {} ({}M)", 
        tokens_for_liquidity,
        tokens_for_liquidity / 1_000_000
    );
    
    let seeds = &[
        LAUNCH_SEED,
        launch.mint.as_ref(),
        &[launch.bump],
    ];
    let signer = &[&seeds[..]];
    
    // Mint tokens to pool vault
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.pool_token_vault.to_account_info(),
                authority: launch.to_account_info(),
            },
            signer,
        ),
        tokens_for_liquidity,
    )?;
    
    msg!("✅ Tokens minted to pool vault");
    
    // Revoke mint authority
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: launch.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
            signer,
        ),
        spl_token::instruction::AuthorityType::MintTokens,
        None,
    )?;
    
    msg!("✅ Mint authority revoked");
    
    // Revoke freeze authority
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: launch.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
            signer,
        ),
        spl_token::instruction::AuthorityType::FreezeAccount,
        None,
    )?;
    
    msg!("✅ Freeze authority revoked");
    
    // Update status
    let clock = Clock::get()?;
    launch.status = LaunchStatus::Graduated;
    launch.graduated_at = Some(clock.unix_timestamp);
    launch.meteora_pool = Some(ctx.accounts.meteora_pool.key());
    
    let sol_price_usd = FIXED_SOL_PRICE_USD;
    let final_mc = calculate_market_cap(
        launch.sol_raised,
        sol_price_usd,
        launch.virtual_sol_init,
        launch.constant_k,
    )?;
    
    emit!(TokenGraduated {
        mint: launch.mint,
        sol_raised: launch.sol_raised,
        final_market_cap: final_mc,
        liquidity_provided: 0, // Già trasferito in step1
        tokens_for_liquidity,
        meteora_pool: ctx.accounts.meteora_pool.key(),
    });
    
    msg!("🎉 GRADUATION COMPLETE!");
    
    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeGraduationStep2<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
    
    #[account(
        mut,
        constraint = mint.key() == token_launch.mint @ ErrorCode::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: Meteora pool placeholder
    pub meteora_pool: UncheckedAccount<'info>,  // ⭐ RIMETTI QUESTO!
    
    // ⭐ FIX: Inizializza l'account automaticamente!
    #[account(
        init,
        payer = caller,
        seeds = [POOL_TOKEN_VAULT_SEED, token_launch.mint.as_ref()],
        bump,
        token::mint = mint,
        token::authority = token_launch,
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,  // ⭐ Aggiungi questo!
    pub rent: Sysvar<'info, Rent>,  // ⭐ Aggiungi questo!
}
/// Withdraw liquidity from vaults to create Raydium pool
/// Can only be called by keeper after graduation
pub fn withdraw_for_pool(ctx: Context<WithdrawForPool>) -> Result<()> {
    let launch = &ctx.accounts.token_launch;
    
    // Verify status
    require!(
        launch.status == LaunchStatus::Graduated,
        ErrorCode::InvalidStatus
    );
    
    msg!("🏦 Withdrawing liquidity for pool creation...");
    
    let seeds = &[
        LAUNCH_SEED,
        launch.mint.as_ref(),
        &[launch.bump],
    ];
    let signer = &[&seeds[..]];
    
    // Get vault balances
    let sol_balance = ctx.accounts.pool_sol_vault.lamports();
    let token_balance = ctx.accounts.pool_token_vault.amount;
    
    msg!("  SOL: {} lamports", sol_balance);
    msg!("  Tokens: {}", token_balance);
    
    // ⭐ FIX: Transfer SOL using invoke_signed (vault is PDA!)
    let sol_vault_seeds = &[
        POOL_SOL_VAULT_SEED,
        launch.mint.as_ref(),
        &[ctx.bumps.pool_sol_vault],
    ];
    
    // Keep minimum rent-exempt amount in vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(0);
    let transferable = sol_balance.saturating_sub(min_balance);
    
    require!(transferable > 0, ErrorCode::InsufficientBalance);
    
    msg!("  Transferring {} lamports to keeper", transferable);
    
    // Transfer SOL from vault to keeper
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.pool_sol_vault.to_account_info(),
                to: ctx.accounts.keeper.to_account_info(),
            },
            &[sol_vault_seeds],
        ),
        transferable,
    )?;
    
    msg!("✅ SOL transferred to keeper");
    
    // Transfer tokens from vault to keeper
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.pool_token_vault.to_account_info(),
                to: ctx.accounts.keeper_token_account.to_account_info(),
                authority: launch.to_account_info(),
            },
            signer,
        ),
        token_balance,
    )?;
    
    msg!("✅ Tokens transferred to keeper");
    msg!("🎉 Liquidity ready for pool creation!");
    
    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawForPool<'info> {
    /// CHECK: Only keeper can withdraw
    #[account(mut, address = KEEPER)]
    pub keeper: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
    
    /// Pool SOL vault (PDA)
    #[account(
        mut,
        seeds = [POOL_SOL_VAULT_SEED, token_launch.mint.as_ref()],
        bump,
    )]
    pub pool_sol_vault: SystemAccount<'info>,
    
    /// Pool token vault (PDA)
    #[account(
        mut,
        seeds = [POOL_TOKEN_VAULT_SEED, token_launch.mint.as_ref()],
        bump,
        token::mint = token_launch.mint,
        token::authority = token_launch,
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,
    
    /// Keeper's token account to receive tokens
    #[account(mut)]
    pub keeper_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>, // ⭐ AGGIUNGI!
}
    /// Mark as failed
    pub fn mark_as_failed(ctx: Context<MarkAsFailed>) -> Result<()> {
        let launch = &mut ctx.accounts.token_launch;
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp > launch.deadline, ErrorCode::DeadlineNotPassed);
        require!(
            launch.status == LaunchStatus::Active || launch.status == LaunchStatus::ReadyToGraduate,
            ErrorCode::InvalidStatus
        );
        require!(launch.sol_raised < launch.target_sol, ErrorCode::TargetReached);
        
        launch.status = LaunchStatus::Failed;
        
        let sol_missed = launch.target_sol
            .checked_sub(launch.sol_raised)
            .ok_or(ErrorCode::MathOverflow)?;
        
        let sol_price_usd = FIXED_SOL_PRICE_USD;
        let final_mc = calculate_market_cap(
            launch.sol_raised,
            sol_price_usd,
            launch.virtual_sol_init,
            launch.constant_k,
        )?;
        
        emit!(TokenFailed {
            mint: launch.mint,
            sol_raised: launch.sol_raised,
            target_sol: launch.target_sol,
            sol_missed,
            final_market_cap: final_mc,
        });
        
        msg!("❌ Failed. Raised {} / {} SOL", 
            launch.sol_raised / 1_000_000_000,
            launch.target_sol / 1_000_000_000
        );
        
        Ok(())
    }

/// Claim refund
pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
    let launch = &ctx.accounts.token_launch;
    let buyer_record = &mut ctx.accounts.buyer_record;
    
    require!(launch.status == LaunchStatus::Failed, ErrorCode::NotFailed);
    require!(!buyer_record.refund_claimed, ErrorCode::RefundAlreadyClaimed);
    require!(buyer_record.sol_spent > 0, ErrorCode::NothingToRefund);
    
    // ⭐ NEW: Refund dal SOL EFFETTIVAMENTE nel vault, non da sol_spent!
    // sol_spent include platform fee che è già stato inviato a treasury
    // Quindi dobbiamo calcolare quanto SOL è VERAMENTE nel vault per questo buyer
    
    // Il vault riceve: sol_spent - platform_fee_at_buy (2%)
    let sol_in_vault = buyer_record
        .sol_spent
        .checked_mul(9800) // 98% (dopo fee 2% alla creazione)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Refund: 98% del sol_in_vault (2% refund fee)
    let refund_amount = sol_in_vault
        .checked_mul(9800)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let fee_amount = sol_in_vault
        .checked_sub(refund_amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Get rent-exempt minimum for TokenLaunch
    let rent = Rent::get()?;
    let launch_rent_exempt = rent.minimum_balance(launch.to_account_info().data_len());
    
    let launch_balance = **launch.to_account_info().try_borrow_lamports()?;
    let total_to_withdraw = refund_amount
        .checked_add(fee_amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Check vault will keep rent-exempt after refund
    let balance_after = launch_balance
        .checked_sub(total_to_withdraw)
        .ok_or(ErrorCode::InsufficientBalance)?;
    
    require!(
        balance_after >= launch_rent_exempt,
        ErrorCode::InsufficientBalance
    );
    
    // Transfer refund to buyer
    **launch.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.buyer.try_borrow_mut_lamports()? += refund_amount;
    
    // Transfer fee to treasury
    **launch.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee_amount;
    
    // Close BuyerRecord (return rent to buyer)
    let buyer_record_lamports = buyer_record.to_account_info().lamports();
    **buyer_record.to_account_info().try_borrow_mut_lamports()? = 0;
    **ctx.accounts.buyer.try_borrow_mut_lamports()? += buyer_record_lamports;
    
    buyer_record.refund_claimed = true;
    
    emit!(RefundClaimed {
        mint: launch.mint,
        buyer: *ctx.accounts.buyer.key,
        refund_amount,
        fee_collected: fee_amount,
    });
    
    msg!("💰 Refund: {} SOL (+ {} SOL rent)", 
        refund_amount as f64 / 1_000_000_000.0,
        buyer_record_lamports as f64 / 1_000_000_000.0
    );
    
    Ok(())
}

    /// Emergency pause
    pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
        let launch = &mut ctx.accounts.token_launch;
        let clock = Clock::get()?;
        
        let emergency_window = launch
            .created_at
            .checked_add(30 * 24 * 60 * 60)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(clock.unix_timestamp < emergency_window, ErrorCode::EmergencyPeriodExpired);
        
        launch.status = LaunchStatus::Paused;
        
        emit!(EmergencyPaused {
            mint: launch.mint,
            admin: *ctx.accounts.admin.key,
            reason: "Emergency pause".to_string(),
            timestamp: clock.unix_timestamp,
        });
        
        msg!("⛔ PAUSED");
        
        Ok(())
    }

    /// Emergency resume
    pub fn emergency_resume(ctx: Context<EmergencyResume>) -> Result<()> {
        let launch = &mut ctx.accounts.token_launch;
        
        require!(launch.status == LaunchStatus::Paused, ErrorCode::NotPaused);
        
        let clock = Clock::get()?;
        
        if clock.unix_timestamp > launch.deadline {
            launch.status = LaunchStatus::Failed;
        } else {
            launch.status = LaunchStatus::Active;
        }
        
        emit!(EmergencyResumed {
            mint: launch.mint,
            admin: *ctx.accounts.admin.key,
            new_status: launch.status.clone(),
            timestamp: clock.unix_timestamp,
        });
        
        msg!("✅ Resumed");
        
        Ok(())
    }

// ============ Account Structures ============

#[account]
pub struct TokenLaunch {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub tier: u8,
    pub virtual_sol_init: u64,  // ⭐ NUOVO: Parametro per-tier
    pub constant_k: u128,        // ⭐ NUOVO: Parametro per-tier
    pub target_sol: u64,
    pub deadline: i64,
    pub sol_raised: u64,
    pub status: LaunchStatus,
    pub created_at: i64,
    pub graduated_at: Option<i64>,
    pub meteora_pool: Option<Pubkey>,
    pub total_buyers: u32,
    pub total_tokens_sold: u64,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub bump: u8,
}

impl TokenLaunch {
    // ⭐ AGGIORNATO: +8 (u64) +16 (u128) = +24 bytes
        // Removed holders_thawed (u32 = 4 bytes)
    pub const SIZE: usize = 32 + 32 + 1 + 8 + 16 + 8 + 8 + 8 + 1 + 8 + 9 + 33 + 4 + 8 + 36 + 14 + 204 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum LaunchStatus {
    Active = 0,
    ReadyToGraduate = 1,
    GraduationInProgress = 2,  // ⭐ NUOVO!
    Graduated = 3,
    Failed = 4,
    Paused = 5,
}

#[account]
pub struct BuyerRecord {
    pub launch: Pubkey,
    pub buyer: Pubkey,
    pub sol_spent: u64,
    pub tokens_received: u64,
    pub refund_claimed: bool,
    pub first_buy_timestamp: i64,
    pub last_buy_timestamp: i64,
    pub bump: u8,
}

impl BuyerRecord {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1 + 8 + 8 + 1;
}

// ============ Context Structures ============

#[derive(Accounts)]
#[instruction(mint_seed: u64)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + TokenLaunch::SIZE,
        seeds = [LAUNCH_SEED, mint.key().as_ref()],
        bump
    )]
    pub token_launch: Account<'info, TokenLaunch>,
    
    #[account(
        init,
        payer = creator,
        seeds = [MINT_SEED, creator.key().as_ref(), &mint_seed.to_le_bytes()],
        bump,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = token_launch,
        mint::freeze_authority = token_launch
    )]
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Treasury
    #[account(mut, address = TREASURY)]
    pub treasury: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        constraint = token_launch.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub token_launch: Account<'info, TokenLaunch>,
    
    #[account(
        init,
        payer = buyer,
        space = 8 + BuyerRecord::SIZE,
        seeds = [BUYER_SEED, token_launch.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_record: Account<'info, BuyerRecord>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Treasury
    #[account(mut, address = TREASURY)]
    pub treasury: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyMoreTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        constraint = token_launch.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub token_launch: Account<'info, TokenLaunch>,
    
    #[account(
        mut,
        seeds = [BUYER_SEED, token_launch.key().as_ref(), buyer.key().as_ref()],
        bump = buyer_record.bump
    )]
    pub buyer_record: Account<'info, BuyerRecord>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Treasury
    #[account(mut, address = TREASURY)]
    pub treasury: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct FinalizeGraduationStep1<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
    
    /// CHECK: Keeper wallet (receives 7% graduation fee)
    #[account(mut, address = KEEPER)]
    pub keeper: UncheckedAccount<'info>,
    
    /// CHECK: Pool SOL vault
    #[account(mut)]
    pub pool_sol_vault: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MarkAsFailed<'info> {
    pub caller: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
    
    #[account(
        mut,
        // ❌ RIMUOVI close = buyer (lo facciamo manualmente nella funzione!)
        constraint = buyer_record.buyer == *buyer.key @ ErrorCode::Unauthorized,
        constraint = buyer_record.launch == token_launch.key() @ ErrorCode::InvalidLaunch
    )]
    pub buyer_record: Account<'info, BuyerRecord>,
    
    /// CHECK: Treasury
    #[account(mut, address = TREASURY)]
    pub treasury: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(address = ADMIN)]
    pub admin: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
}

#[derive(Accounts)]
pub struct EmergencyResume<'info> {
    #[account(address = ADMIN)]
    pub admin: Signer<'info>,
    
    #[account(mut)]
    pub token_launch: Account<'info, TokenLaunch>,
}

// ============ Events ============

#[event]
pub struct TokenCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub tier: u8,
    pub virtual_sol_init: u64,  // ⭐ NUOVO
    pub constant_k: u128,        // ⭐ NUOVO
    pub target_sol: u64,
    pub deadline: i64,
}

#[event]
pub struct TokensPurchased {
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub tokens_received: u64,
    pub sol_raised: u64,
    pub current_market_cap: u64,
    pub progress_bps: u16,
}


#[event]
pub struct TokenGraduated {
    pub mint: Pubkey,
    pub sol_raised: u64,
    pub final_market_cap: u64,
    pub liquidity_provided: u64,
    pub tokens_for_liquidity: u64,
    pub meteora_pool: Pubkey,
}

#[event]
pub struct TokenFailed {
    pub mint: Pubkey,
    pub sol_raised: u64,
    pub target_sol: u64,
    pub sol_missed: u64,
    pub final_market_cap: u64,
}

#[event]
pub struct RefundClaimed {
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub refund_amount: u64,
    pub fee_collected: u64,
}

#[event]
pub struct EmergencyPaused {
    pub mint: Pubkey,
    pub admin: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyResumed {
    pub mint: Pubkey,
    pub admin: Pubkey,
    pub new_status: LaunchStatus,
    pub timestamp: i64,
}
}
// ============ Helper Functions ============

/// ⭐ NUOVO: Ritorna parametri per ogni tier
fn get_tier_params(tier: u8) -> Result<(u64, u128, u64)> {
    match tier {
        1 => Ok((
            353_000_000,                             // ✅ 0.353 SOL
            378_769_000_000_000_000_000_000,             // ✅ 378.769T
            TIER_1_TARGET_SOL,                       // 1 SOL
        )),
        2 => Ok((
            900_403_000_000,                         // ✅ 900.403 SOL (scaled per 2,551 target)
            966_262_319_000_000_000_000_000,         // ✅ k scaled
            TIER_2_TARGET_SOL,                       // 2,551 SOL
        )),
        3 => Ok((
            9_004_030_000_000,                       // ✅ 9,004.03 SOL (scaled per 25,510 target)
            9_662_623_190_000_000_000_000_000,       // ✅ k scaled
            TIER_3_TARGET_SOL,                       // 25,510 SOL
        )),
        4 => Ok((
            90_040_300_000_000,                      // ✅ 90,040.3 SOL (scaled per 255,102 target)
            96_626_231_900_000_000_000_000_000,      // ✅ k scaled
            TIER_4_TARGET_SOL,                       // 255,102 SOL
        )),
        _ => Err(ErrorCode::InvalidTier.into()),
    }
}

fn get_tier_duration(tier: u8) -> Result<i64> {
    match tier {
        1 => Ok(TIER_1_DURATION),
        2 => Ok(TIER_2_DURATION),
        3 => Ok(TIER_3_DURATION),
        4 => Ok(TIER_4_DURATION),
        _ => Err(ErrorCode::InvalidTier.into()),
    }
}

/// ⭐ MODIFICATO: Usa parametri per-tier
fn calculate_tokens_out(
    sol_in: u64,
    current_sol: u64,
    virtual_sol_init: u64,  // ⭐ Per-tier
    constant_k: u128,       // ⭐ Per-tier
) -> Result<u64> {
    let virtual_sol_before = virtual_sol_init
        .checked_add(current_sol)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let virtual_tokens_before = (constant_k / virtual_sol_before as u128) as u64;
    
    let tokens_sold_before = VIRTUAL_SUPPLY
        .checked_sub(virtual_tokens_before)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let virtual_sol_after = virtual_sol_before
        .checked_add(sol_in)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let virtual_tokens_after = (constant_k / virtual_sol_after as u128) as u64;
    
    let tokens_sold_after = VIRTUAL_SUPPLY
        .checked_sub(virtual_tokens_after)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let tokens_out = tokens_sold_after
        .checked_sub(tokens_sold_before)
        .ok_or(ErrorCode::MathOverflow)?;
    
    Ok(tokens_out)
}

/// ⭐ MODIFICATO: Usa parametri per-tier
fn calculate_market_cap(
    sol_raised: u64,
    sol_price_usd: u64,
    virtual_sol_init: u64,  // ⭐ Per-tier
    constant_k: u128,       // ⭐ Per-tier
) -> Result<u64> {
    let virtual_sol = virtual_sol_init
        .checked_add(sol_raised)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let virtual_tokens = (constant_k / virtual_sol as u128) as u64;
    
    let mc_raw = ((virtual_sol as u128)
        .checked_mul(sol_price_usd as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(REAL_SUPPLY as u128)
        .ok_or(ErrorCode::MathOverflow)?)
        .checked_div(virtual_tokens as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    Ok(mc_raw as u64)
}

// ============ Error Codes ============

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid tier. Must be 1-4")]
    InvalidTier,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Invalid characters")]
    InvalidCharacters,
    #[msg("Not active")]
    NotActive,
    #[msg("Deadline passed")]
    DeadlinePassed,
    #[msg("Deadline not passed")]
    DeadlineNotPassed,
    #[msg("Amount too small")]
    AmountTooSmall,
    #[msg("Amount too large")]
    AmountTooLarge,
    #[msg("Insufficient output")]
    InsufficientOutput,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Exceeded curve supply")]
    ExceededCurveSupply,
    #[msg("Target not reached")]
    TargetNotReached,
    #[msg("Target reached")]
    TargetReached,
    #[msg("Not ready to graduate")]
    NotReadyToGraduate,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Not failed")]
    NotFailed,
    #[msg("Refund already claimed")]
    RefundAlreadyClaimed,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Invalid launch")]
    InvalidLaunch,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Emergency period expired")]
    EmergencyPeriodExpired,
    #[msg("Not paused")]
    NotPaused,
    #[msg("Invalid batch size")]
    InvalidBatchSize,
    #[msg("Invalid account count")]
    InvalidAccountCount,
    #[msg("Already thawed")]
    AlreadyThawed,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid mint")]
    InvalidMint,
}