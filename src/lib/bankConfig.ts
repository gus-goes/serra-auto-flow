/**
 * Bank configuration with visual identity
 */

export interface BankConfig {
  id: string;
  name: string;
  slug: string;
  color: string;
  colorHex: string;
  logo?: string;
  isOwn: boolean; // true = Financiamento Próprio Autos da Serra
}

// Base64 logos for each bank (simplified SVG representations)
const BV_LOGO = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDNBNzAiLz48dGV4dCB4PSI1MCIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CVjwvdGV4dD48L3N2Zz4=`;

const BRADESCO_LOGO = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiNDQzA5MkYiLz48dGV4dCB4PSI1MCIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CUkFERVNDTzwvdGV4dD48L3N2Zz4=`;

const C6_LOGO = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMxQTFBMUEiLz48dGV4dCB4PSI1MCIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DNiBCYW5rPC90ZXh0Pjwvc3ZnPg==`;

export const BANK_CONFIGS: BankConfig[] = [
  {
    id: 'bv',
    name: 'BV Financeira',
    slug: 'bv-financeira',
    color: '210 100% 22%',
    colorHex: '#003A70',
    logo: BV_LOGO,
    isOwn: false,
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    slug: 'bradesco',
    color: '350 93% 42%',
    colorHex: '#CC092F',
    logo: BRADESCO_LOGO,
    isOwn: false,
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    slug: 'c6-bank',
    color: '0 0% 10%',
    colorHex: '#1A1A1A',
    logo: C6_LOGO,
    isOwn: false,
  },
  {
    id: 'proprio',
    name: 'Financiamento Próprio Autos da Serra',
    slug: 'autos-da-serra',
    color: '48 100% 50%',
    colorHex: '#FFD700',
    isOwn: true,
  },
];

/**
 * Get bank config by name (partial match)
 */
export function getBankConfigByName(bankName: string): BankConfig | undefined {
  if (!bankName) return undefined;
  
  const lowerName = bankName.toLowerCase();
  
  // Check for exact matches first
  if (lowerName.includes('próprio') || lowerName.includes('proprio') || lowerName.includes('autos da serra')) {
    return BANK_CONFIGS.find(b => b.isOwn);
  }
  if (lowerName.includes('bv')) {
    return BANK_CONFIGS.find(b => b.id === 'bv');
  }
  if (lowerName.includes('bradesco')) {
    return BANK_CONFIGS.find(b => b.id === 'bradesco');
  }
  if (lowerName.includes('c6')) {
    return BANK_CONFIGS.find(b => b.id === 'c6');
  }
  
  return undefined;
}

/**
 * Get colors for PDF based on bank
 * Returns primary and secondary colors as RGB arrays for jsPDF
 */
export function getPDFColors(bankName?: string): {
  primary: [number, number, number];
  secondary: [number, number, number];
  text: [number, number, number];
  isOwn: boolean;
} {
  const bankConfig = bankName ? getBankConfigByName(bankName) : undefined;
  
  if (!bankConfig || bankConfig.isOwn) {
    // Autos da Serra colors - Black and Yellow
    return {
      primary: [26, 26, 26], // Dark gray/black
      secondary: [255, 215, 0], // Gold/Yellow
      text: [255, 255, 255],
      isOwn: true,
    };
  }
  
  // Bank-specific colors
  switch (bankConfig.id) {
    case 'bv':
      return {
        primary: [0, 58, 112], // BV Blue
        secondary: [0, 120, 180],
        text: [255, 255, 255],
        isOwn: false,
      };
    case 'bradesco':
      return {
        primary: [204, 9, 47], // Bradesco Red
        secondary: [160, 7, 37],
        text: [255, 255, 255],
        isOwn: false,
      };
    case 'c6':
      return {
        primary: [26, 26, 26], // C6 Black
        secondary: [64, 64, 64],
        text: [255, 255, 255],
        isOwn: false,
      };
    default:
      return {
        primary: [26, 26, 26],
        secondary: [255, 215, 0],
        text: [255, 255, 255],
        isOwn: true,
      };
  }
}
