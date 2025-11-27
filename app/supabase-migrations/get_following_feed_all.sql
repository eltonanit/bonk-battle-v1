-- SQL Function: get_following_feed_all
-- This function returns ALL historical activities from users that the given wallet is following
-- Unlike get_following_feed, this does NOT filter by when the follow relationship started
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_following_feed_all(
  p_wallet TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  wallet TEXT,
  action_type TEXT,
  token_mint TEXT,
  token_symbol TEXT,
  token_image TEXT,
  opponent_mint TEXT,
  opponent_symbol TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    af.id,
    af.wallet,
    af.action_type,
    af.token_mint,
    af.token_symbol,
    af.token_image,
    af.opponent_mint,
    af.opponent_symbol,
    af.metadata,
    af.created_at
  FROM activity_feed af
  INNER JOIN follows f ON f.following_wallet = af.wallet
  WHERE f.follower_wallet = p_wallet
  ORDER BY af.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_following_feed_all(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_feed_all(TEXT, INT) TO anon;
