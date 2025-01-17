interface AppEnvironment {
    name: string
    chainId: string
    avatarUrl: string
    indexerUrl: string
    explorerUrl: string
    backendUrl: string
    referralSecretKey: string
    frontendUrl: string
}

export const AppEnv: AppEnvironment = {
    name: import.meta.env.VITE_APP_NAME,
    chainId: import.meta.env.VITE_APP_CHAIN_ID || "1",
    avatarUrl: import.meta.env.VITE_APP_AVATAR_URL || "",
    indexerUrl: import.meta.env.VITE_APP_INDEXER_URL || "",
    explorerUrl: import.meta.env.VITE_APP_EXPLORER_URL || "",
    backendUrl: import.meta.env.VITE_APP_BACKEND_URL || "",
    referralSecretKey: import.meta.env.VITE_APP_REFERRAL_SECRET_KEY || "",
    frontendUrl: import.meta.env.VITE_APP_FRONTEND_URL || "",
}