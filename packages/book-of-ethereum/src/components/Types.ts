type TokenType = "ERC20" | "ERC721" | "ERC1155"; // Expand as needed
type NetworkType = "MAINNET" | "OPTIMISM" | "BASE" | "SEPOLIA"; // Adjust to supported chains

export interface TokenGatedAccess {
  tokenId: string; // Typically string even for ERC20 (can be "1" or others)
  tokenType: TokenType;
  tokenAddress: string;
  tokenNetwork: NetworkType;
  erc20TokenDecimals: number;
  erc20MinTokenBalance: number;
}

export interface EnsRecords {
    texts: Record<string,string>
    addresses: Record<string,string>
}

export interface EnsListing {
    name: string
    type: "l1" | "l2"
    isVerified: boolean
    l2Metadata?: {
        isExpirable: boolean
    }
    tokenGatedAccess?: TokenGatedAccess[]
    prices: ListingPrices
}

// Type for individual label-based pricing
interface LabelPrice {
  price: number;
  numberOfLetters: number;
}

// Type for special prices (emoji-only, number-only)
interface SpecialPrices {
  emojiOnlyPrice?: number;
  numberOnlyPrice?: number;
}

export interface ListingPrices {
  basePrice: number;
  labelPrices: LabelPrice[];
  specialPrices: SpecialPrices;
}