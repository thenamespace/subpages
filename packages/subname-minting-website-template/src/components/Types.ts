export interface Subname {
    expiry: number;
    label: string;
    name: string;
    texts: Record<string, string>;
    addresses: Record<string, string>;
}

export interface EnsListing {
    name: string
    type: "l1" | "l2"
    isVerified: boolean
    l2Metadata?: {
        isExpirable: boolean
    }
}