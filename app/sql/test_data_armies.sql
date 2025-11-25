-- =============================================
-- BONK BATTLE - ARMY SYSTEM TEST DATA
-- =============================================
-- Esegui queste query su Supabase SQL Editor per popolare il database con dati fake

-- =============================================
-- 1. ARMIES FAKE
-- =============================================

INSERT INTO armies (name, icon, image_url, twitter_url, telegram_url, capitano_wallet, member_count, member_count_checkpoint, created_at, last_join_at, is_active) VALUES
-- Army #1: Grande army (TOP)
('Bonk Crushers', '⚔️', 'https://img.icons8.com/emoji/96/crossed-swords.png', 'https://x.com/bonkcrushers', 'https://t.me/bonkcrushers', '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf', 342, 340, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 hours', true),

-- Army #2: Media army (TOP)
('Moon Squad', '🚀', 'https://img.icons8.com/emoji/96/rocket-emjoi.png', 'https://x.com/moonsquad', NULL, 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH', 127, 120, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour', true),

-- Army #3: Piccola army (TOP)
('Cyber Warriors', '🤖', 'https://img.icons8.com/emoji/96/robot.png', NULL, 'https://t.me/cyberwarriors', '753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3', 89, 80, NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes', true),

-- Army #4: ON FIRE (12 nuovi membri)
('Diamond Hands', '💎', 'https://img.icons8.com/emoji/96/gem-stone.png', 'https://x.com/diamondhands', 'https://t.me/diamondhands', '2kZx8F3qJv9KqP7mN5wL1rYtBsWdVcX4gHjE6aUiOpQs', 67, 55, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 minutes', true),

-- Army #5: ON FIRE (15 nuovi membri)
('Degen Lords', '👑', 'https://img.icons8.com/emoji/96/crown.png', 'https://x.com/degenlords', NULL, '9mFkP2nQ7vL8wX3rB4yT6cU5dH1jN0oS2eG8iAuKpMqR', 45, 30, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 minutes', true),

-- Army #6: Nuova army (pochi membri)
('Spartans', '🛡️', 'https://img.icons8.com/emoji/96/shield.png', NULL, NULL, '7hRtS3mP9vL2wX6nB8yT4cU1dH5jN0oQ3eG7iAuKpMqF', 23, 20, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '15 minutes', true),

-- Army #7: Army media
('Whale Hunters', '🐋', 'https://img.icons8.com/emoji/96/whale.png', 'https://x.com/whalehunters', 'https://t.me/whalehunters', '4kLpN2vQ8mR7wX1nB5yT9cU3dH6jN0oS2eG4iAuKpMqA', 198, 190, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 hour', true),

-- Army #8: Army piccola
('FOMO Squad', '🔥', 'https://img.icons8.com/emoji/96/fire.png', NULL, 'https://t.me/fomosquad', '6jMpL3nQ9vR8wX2nB7yT5cU4dH1jN0oS3eG6iAuKpMqC', 34, 30, NOW() - INTERVAL '18 hours', NOW() - INTERVAL '20 minutes', true);


-- =============================================
-- 2. ARMY MEMBERS FAKE
-- =============================================
-- Aggiungiamo membri fake per ogni army

-- Bonk Crushers (342 membri) - aggiungiamo il capitano + alcuni membri
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Bonk Crushers' LIMIT 1),
  '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf', -- capitano
  NOW() - INTERVAL '7 days';

-- Moon Squad (127 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Moon Squad' LIMIT 1),
  'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH',
  NOW() - INTERVAL '5 days';

-- Cyber Warriors (89 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Cyber Warriors' LIMIT 1),
  '753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3',
  NOW() - INTERVAL '3 days';

-- Diamond Hands (67 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Diamond Hands' LIMIT 1),
  '2kZx8F3qJv9KqP7mN5wL1rYtBsWdVcX4gHjE6aUiOpQs',
  NOW() - INTERVAL '2 days';

-- Degen Lords (45 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Degen Lords' LIMIT 1),
  '9mFkP2nQ7vL8wX3rB4yT6cU5dH1jN0oS2eG8iAuKpMqR',
  NOW() - INTERVAL '1 day';

-- Spartans (23 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Spartans' LIMIT 1),
  '7hRtS3mP9vL2wX6nB8yT4cU1dH5jN0oQ3eG7iAuKpMqF',
  NOW() - INTERVAL '12 hours';

-- Whale Hunters (198 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Whale Hunters' LIMIT 1),
  '4kLpN2vQ8mR7wX1nB5yT9cU3dH6jN0oS2eG4iAuKpMqA',
  NOW() - INTERVAL '6 days';

-- FOMO Squad (34 membri) - aggiungiamo il capitano
INSERT INTO army_members (army_id, wallet_address, joined_at)
SELECT
  (SELECT id FROM armies WHERE name = 'FOMO Squad' LIMIT 1),
  '6jMpL3nQ9vR8wX2nB7yT5cU4dH1jN0oS3eG6iAuKpMqC',
  NOW() - INTERVAL '18 hours';


-- =============================================
-- 3. ARMY ORDERS FAKE (solo alcuni ordini)
-- =============================================

-- Bonk Crushers - ordini del capitano
INSERT INTO army_orders (army_id, capitano_wallet, message, token_mint, created_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Bonk Crushers' LIMIT 1),
  '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf',
  'ATTENZIONE SOLDATI! Alle 21:00 attacchiamo $PEPE! Non comprate prima del mio segnale! 🔥',
  NULL,
  NOW() - INTERVAL '2 hours';

INSERT INTO army_orders (army_id, capitano_wallet, message, token_mint, created_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Bonk Crushers' LIMIT 1),
  '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf',
  'TUTTI SU QUESTO TOKEN! Investite 0.5 SOL ciascuno e teniamo fino a 2x! 💎',
  'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9',
  NOW() - INTERVAL '3 hours';

-- Moon Squad - ordini del capitano
INSERT INTO army_orders (army_id, capitano_wallet, message, token_mint, created_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Moon Squad' LIMIT 1),
  'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH',
  'Ragazzi, oggi voliamo sulla luna! 🚀 Comprare questo token appena esce dalla battaglia!',
  '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq',
  NOW() - INTERVAL '1 hour';

-- Diamond Hands - ordini del capitano
INSERT INTO army_orders (army_id, capitano_wallet, message, token_mint, created_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Diamond Hands' LIMIT 1),
  '2kZx8F3qJv9KqP7mN5wL1rYtBsWdVcX4gHjE6aUiOpQs',
  'Mai vendere! Diamond hands only! 💎✋ Chi vende è un traditore!',
  NULL,
  NOW() - INTERVAL '30 minutes';

-- Degen Lords - ordini del capitano
INSERT INTO army_orders (army_id, capitano_wallet, message, token_mint, created_at)
SELECT
  (SELECT id FROM armies WHERE name = 'Degen Lords' LIMIT 1),
  '9mFkP2nQ7vL8wX3rB4yT6cU5dH1jN0oS2eG8iAuKpMqR',
  'YOLO MODE ACTIVATED! Buttiamo tutto su questo token! 👑🎲',
  'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9',
  NOW() - INTERVAL '10 minutes';


-- =============================================
-- 4. VERIFICA DATI INSERITI
-- =============================================

-- Query di verifica (esegui dopo l'insert)
SELECT 'ARMIES COUNT:' as label, COUNT(*) as count FROM armies;
SELECT 'MEMBERS COUNT:' as label, COUNT(*) as count FROM army_members;
SELECT 'ORDERS COUNT:' as label, COUNT(*) as count FROM army_orders;

-- Mostra army con membri (TOP)
SELECT
  name,
  icon,
  member_count,
  capitano_wallet,
  created_at
FROM armies
ORDER BY member_count DESC;

-- Mostra army ON FIRE (almeno 10 nuovi membri)
SELECT
  name,
  icon,
  member_count,
  member_count_checkpoint,
  (member_count - member_count_checkpoint) as new_members,
  last_join_at
FROM armies
WHERE (member_count - member_count_checkpoint) >= 10
ORDER BY last_join_at DESC;
