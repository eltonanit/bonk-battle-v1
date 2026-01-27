/**
 * ========================================================================
 * BATTLECOIN MARKET - FEATURE FLAGS
 * ========================================================================
 *
 * Season 1: Curated battles only (5 eternal battles)
 * Season 2: Community creation enabled
 *
 * To enable Season 2 features, change SEASON to 2
 * or flip individual flags to true
 *
 * ========================================================================
 */

export const FEATURES = {
  // Current season
  SEASON: 1,

  // ============================================================================
  // SEASON 1: HIDDEN (will be enabled in Season 2)
  // ============================================================================

  // Create Coin - Only platform creates battles in S1
  SHOW_CREATE_COIN: false,

  // Armies system - No armies in S1, only curated battles
  SHOW_ARMIES: false,

  // Join ARMY button - Not needed in S1
  SHOW_JOIN_ARMY: false,

  // New Coins tab - Only 5 curated battles
  SHOW_NEW_COINS: false,

  // Burned page - Not relevant for S1
  SHOW_BURNED: false,

  // Created Ticker - Hide "X CREATED $Y" ticker in S1
  SHOW_CREATED_TICKER: false,

  // Home page tabs - Hidden in S1
  SHOW_BATTLE_TAB: false,
  SHOW_NEW_COINS_TAB: false,
  SHOW_ABOUT_TO_WIN_TAB: false,
  SHOW_WINNERS_TAB: false,

  // ============================================================================
  // POTENTIALS.FUN - HIDDEN BATTLE FEATURES
  // ============================================================================

  // Battle system - Hidden for POTENTIALS.FUN (single token graduation)
  SHOW_VICTORY_MODAL: false,          // Victory celebration modal
  SHOW_BATTLE_PAGE: false,            // /battle/[id] page
  SHOW_FINALIZE_DUEL_API: false,      // finalize-duel API route
  SHOW_QUALIFICATION_POPUP: false,    // Qualification popup

  // Profile page tabs - Hidden in S1
  SHOW_PROFILE_COINS_TAB: false,
  SHOW_PROFILE_ARMY_TAB: false,

  // Potential/Holders page - VISIBLE in S1 (key for virality)
  SHOW_POTENTIAL: true,

  // ============================================================================
  // ALWAYS VISIBLE
  // ============================================================================

  // Battles page - Hidden in S1 (will be replaced by Categories)
  SHOW_BATTLES: false,

  // Core navigation
  SHOW_HOME: true,
  SHOW_LEADERBOARD: true,
  SHOW_PROFILE: true,
  SHOW_NOTIFICATIONS: true,
  SHOW_SUPPORT: true,
  SHOW_HOW_IT_WORKS: true,

  // ============================================================================
  // BRANDING
  // ============================================================================

  // Platform name
  PLATFORM_NAME: 'Battlecoin Market',
  PLATFORM_TAGLINE: 'The World\'s First Battle Market',
  PLATFORM_SUBTITLE: 'Where news, culture and brands battle for the top',

  // ============================================================================
  // BATTLE CONFIG (Season 1)
  // ============================================================================

  // Target market cap for victory
  TARGET_MC_USD: 10_000_000_000, // $10 Billion

  // Number of curated battles
  CURATED_BATTLES_COUNT: 5,
};

/**
 * Helper to check if we're in Season 1
 */
export const isSeason1 = () => FEATURES.SEASON === 1;

/**
 * Helper to check if we're in Season 2
 */
export const isSeason2 = () => FEATURES.SEASON === 2;
