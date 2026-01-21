// Polymarket-style gradient avatar generator
// Generates deterministic gradients from wallet addresses

// 20 vibrant color pairs for gradients
export const GRADIENT_PAIRS: [string, string][] = [
  ['#FF00FF', '#00FF00'], // Magenta → Green
  ['#FF69B4', '#00FFFF'], // Pink → Cyan
  ['#8B5CF6', '#FFD700'], // Violet → Gold
  ['#FF4500', '#00CED1'], // OrangeRed → DarkTurquoise
  ['#FF1493', '#7FFF00'], // DeepPink → Chartreuse
  ['#9400D3', '#FF8C00'], // DarkViolet → DarkOrange
  ['#00FF7F', '#FF00FF'], // SpringGreen → Magenta
  ['#FF6347', '#4169E1'], // Tomato → RoyalBlue
  ['#ADFF2F', '#FF1493'], // GreenYellow → DeepPink
  ['#00BFFF', '#FF4500'], // DeepSkyBlue → OrangeRed
  ['#FFD700', '#FF00FF'], // Gold → Magenta
  ['#7B68EE', '#00FA9A'], // MediumSlateBlue → MediumSpringGreen
  ['#FF69B4', '#32CD32'], // HotPink → LimeGreen
  ['#00CED1', '#FF6347'], // DarkTurquoise → Tomato
  ['#9932CC', '#00FF00'], // DarkOrchid → Lime
  ['#FF8C00', '#00FFFF'], // DarkOrange → Cyan
  ['#BA55D3', '#ADFF2F'], // MediumOrchid → GreenYellow
  ['#20B2AA', '#FF1493'], // LightSeaGreen → DeepPink
  ['#FF00FF', '#FFD700'], // Magenta → Gold
  ['#00FF00', '#FF69B4'], // Lime → HotPink
];

/**
 * Generates a numeric hash from a string (wallet address)
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator for deterministic results
 */
export function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export interface GradientConfig {
  color1: string;
  color2: string;
  angle: number;
  type: 'linear' | 'radial';
}

/**
 * Generates a gradient configuration from a wallet address
 */
export function generateGradientConfig(walletAddress: string): GradientConfig {
  const hash = hashString(walletAddress);
  const random = seededRandom(hash);

  // Select color pair
  const pairIndex = Math.floor(random() * GRADIENT_PAIRS.length);
  const [color1, color2] = GRADIENT_PAIRS[pairIndex];

  // Generate angle (0-360)
  const angle = Math.floor(random() * 360);

  // Select gradient type (80% linear, 20% radial)
  const type = random() < 0.8 ? 'linear' : 'radial';

  return { color1, color2, angle, type };
}

/**
 * Generates CSS gradient string from config
 */
export function generateGradientCSS(config: GradientConfig): string {
  if (config.type === 'radial') {
    return `radial-gradient(circle at 30% 30%, ${config.color1}, ${config.color2})`;
  }
  return `linear-gradient(${config.angle}deg, ${config.color1}, ${config.color2})`;
}

/**
 * Main function to get CSS gradient from wallet address
 */
export function getAvatarGradient(walletAddress: string): string {
  if (!walletAddress) {
    // Default gradient for empty/invalid addresses
    return 'linear-gradient(135deg, #667eea, #764ba2)';
  }
  const config = generateGradientConfig(walletAddress);
  return generateGradientCSS(config);
}

/**
 * Generates an SVG representation of the avatar
 */
export function generateAvatarSVG(walletAddress: string, size: number = 100): string {
  const config = generateGradientConfig(walletAddress);
  const gradientId = `gradient-${hashString(walletAddress)}`;

  let gradientDef: string;
  if (config.type === 'radial') {
    gradientDef = `
      <radialGradient id="${gradientId}" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${config.color1}" />
        <stop offset="100%" stop-color="${config.color2}" />
      </radialGradient>
    `;
  } else {
    // Convert angle to x1,y1,x2,y2
    const angleRad = (config.angle * Math.PI) / 180;
    const x1 = 50 - Math.cos(angleRad) * 50;
    const y1 = 50 - Math.sin(angleRad) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;

    gradientDef = `
      <linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        <stop offset="0%" stop-color="${config.color1}" />
        <stop offset="100%" stop-color="${config.color2}" />
      </linearGradient>
    `;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradientDef}</defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#${gradientId})" />
    </svg>
  `.trim();
}

/**
 * Creates a data URL for use in img src
 */
export function getAvatarDataURL(walletAddress: string, size: number = 100): string {
  const svg = generateAvatarSVG(walletAddress, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
