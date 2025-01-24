interface AppEnvironment {
    name: string
    chainId: string
    avatarUrl: string
    explorerUrl: string
}

export const AppEnv: AppEnvironment = {
    name: import.meta.env.VITE_APP_NAME,
    chainId: import.meta.env.VITE_APP_CHAIN_ID || "1",
    avatarUrl: import.meta.env.VITE_APP_AVATAR_URL || "",
    explorerUrl: import.meta.env.VITE_APP_EXPLORER_URL || ""
}