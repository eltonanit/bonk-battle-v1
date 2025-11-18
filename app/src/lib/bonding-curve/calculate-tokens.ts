// Bonding Curve: Constant Product (k = x * y)
// x = SOL reserves (virtual + raised)
// y = token reserves (virtual)
// When user adds dx SOL, they get dy tokens where:
// (x + dx) * (y - dy) = k
// dy = y - (k / (x + dx))

export function calculateTokensFromSol(
  solAmount: number,
  currentVirtualSol: number,
  constantK: string
): number {
  try {
    const k = BigInt(constantK);
    const x = BigInt(Math.floor(currentVirtualSol * 1e9)); // SOL in lamports
    const dx = BigInt(Math.floor(solAmount * 1e9)); // Added SOL in lamports
    
    const y = k / x; // current token supply
    const newY = k / (x + dx); // token supply after buy
    const dy = y - newY; // tokens user receives
    
    return Number(dy) / 1e6; // Convert to token decimals (6)
  } catch (error) {
    console.error('Error calculating tokens:', error);
    return 0;
  }
}

export function calculateSolFromTokens(
  tokenAmount: number,
  currentVirtualSol: number,
  constantK: string
): number {
  try {
    const k = BigInt(constantK);
    const x = BigInt(Math.floor(currentVirtualSol * 1e9));
    
    const y = k / x; // current token supply
    const dy = BigInt(Math.floor(tokenAmount * 1e6)); // tokens in raw units
    const newY = y + dy;
    const newX = k / newY;
    const dx = x - newX;
    
    return Number(dx) / 1e9; // Convert to SOL
  } catch (error) {
    console.error('Error calculating SOL:', error);
    return 0;
  }
}
