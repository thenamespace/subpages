import type { NextConfig } from "next";

/**
 * Builds with webpack rather than Turbopack (see the `--webpack` flag in
 * package.json). Turbopack bundles postcss in a way that breaks its runtime
 * `require("picocolors")`, which takes down the Tailwind v4 pipeline. Nothing
 * here depends on webpack specifically — drop the flag once that's fixed.
 */
const nextConfig: NextConfig = {
  webpack: (config) => {
    // @coinbase/cdp-sdk declares the @x402/* packages as OPTIONAL peer
    // dependencies but imports them with a static `import`, so any bundler
    // tries to resolve them whether or not the code path is reachable. It
    // arrives here through wagmi's connectors barrel:
    //
    //   wagmi/connectors -> @wagmi/connectors/baseAccount
    //     -> @base-org/account -> @coinbase/cdp-sdk -> @x402/*
    //
    // We never use the Base Account connector, so `false` resolves each one
    // to an empty module instead of installing four unused packages.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/svm": false,
      "@x402/extensions": false,
    };
    // @metamask/sdk ships one bundle for web and React Native and references
    // RN's async-storage unconditionally. Harmless in a browser build, but it
    // prints on every compile and trains people to ignore warnings.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@metamask\/sdk/, message: /async-storage/ },
    ];

    return config;
  },
};

export default nextConfig;
