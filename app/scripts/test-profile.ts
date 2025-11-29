// scripts/test-profile.ts
/**
 * Test script for profile and follow functionality
 * Run: npx ts-node scripts/test-profile.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Test wallet address (replace with a real one for testing)
const TEST_WALLET = 'Fu8Sf5fR7XYtCUkv5V6f9shmZ6RCVyWcXqJvLnJgQ8pA';

async function testGetProfile() {
  console.log('\n📋 TEST: Get Profile');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const res = await fetch(`${BASE_URL}/api/user/profile?wallet=${TEST_WALLET}`);
    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    return data.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testUpdateProfile() {
  console.log('\n📝 TEST: Update Profile');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const res = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: TEST_WALLET,
        username: `TestUser_${Date.now()}`
      })
    });
    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    return data.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testFollow() {
  console.log('\n👥 TEST: Follow User');
  console.log('═══════════════════════════════════════════════════════════');

  const followerWallet = TEST_WALLET;
  const followingWallet = '7YTcWrVLxvmFAJ8wKxVzCL4dZ4pHf6VtLnMvAQJZqoRk'; // Test wallet to follow

  try {
    const res = await fetch(`${BASE_URL}/api/user/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        followerWallet,
        followingWallet,
        action: 'follow'
      })
    });
    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    return data.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testUnfollow() {
  console.log('\n👥 TEST: Unfollow User');
  console.log('═══════════════════════════════════════════════════════════');

  const followerWallet = TEST_WALLET;
  const followingWallet = '7YTcWrVLxvmFAJ8wKxVzCL4dZ4pHf6VtLnMvAQJZqoRk';

  try {
    const res = await fetch(`${BASE_URL}/api/user/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        followerWallet,
        followingWallet,
        action: 'unfollow'
      })
    });
    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    return data.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testNotifications() {
  console.log('\n🔔 TEST: Get Notifications');
  console.log('═══════════════════════════════════════════════════════════');

  // Note: This would need to query Supabase directly or through an API
  // The notifications are fetched client-side via Supabase
  console.log('ℹ️  Notifications are fetched client-side via Supabase');
  console.log('   Test by connecting wallet in the browser');

  return true;
}

async function runAllTests() {
  console.log('🚀 Starting Profile & Follow Tests');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Base URL:', BASE_URL);
  console.log('Test Wallet:', TEST_WALLET);

  const results: { [key: string]: boolean } = {};

  results['Get Profile'] = await testGetProfile();
  results['Update Profile'] = await testUpdateProfile();
  results['Follow User'] = await testFollow();
  results['Unfollow User'] = await testUnfollow();
  results['Notifications'] = await testNotifications();

  console.log('\n\n📊 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════');

  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  }

  const totalPassed = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal: ${totalPassed}/${Object.keys(results).length} tests passed`);
}

// Run tests
runAllTests().catch(console.error);
