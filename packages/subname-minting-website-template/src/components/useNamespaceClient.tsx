import { Address, Hash } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import {
  createMintClient,
  MintTransactionRequest,
  MintTransactionResponse,
} from "@namespacesdk/mint-manager";
import { useAppConfig } from "./AppConfigContext";
import { base, baseSepolia, mainnet, optimism, sepolia } from "viem/chains";

const alchemyToken = import.meta.env.VITE_APP_ALCHEMY_TOKEN;
const appSource = import.meta.env.VITE_APP_MINT_SOURCE || "namespacesdk";

const getRPCUrls = () => {
  if (alchemyToken && alchemyToken.length > 0) {
    return {
      [base.id]: generateAlchemyUri("base-mainnet", alchemyToken),
      [baseSepolia.id]: generateAlchemyUri("base-sepolia", alchemyToken),
      [mainnet.id]: generateAlchemyUri("eth-mainnet", alchemyToken),
      [sepolia.id]: generateAlchemyUri("eth-sepolia", alchemyToken),
      [optimism.id]: generateAlchemyUri("opt-mainnet", alchemyToken),
    };
  }
};

const mintClient = createMintClient({
  mintSource: appSource,
  cursomRpcUrls: getRPCUrls(),
});

function generateAlchemyUri(alchemyNetwork: string, token: string) {
  return `https://${alchemyNetwork}.g.alchemy.com/v2/${token}`;
}

export const useNamepsaceClient = () => {
  const { listingChainId, listingType, listedName } = useAppConfig();

  const publicClient = usePublicClient({ chainId: listingChainId });
  const { data: walletClient } = useWalletClient({ chainId: listingChainId });

  const checkAvailable = async (label: string) => {
    if (listingType === "L1") {
      return mintClient.isL1SubnameAvailable(`${label}.${listedName}`);
    }
    return mintClient.isL2SubnameAvailable(
      `${label}.${listedName}`,
      listingChainId
    );
  };

  const mintParameters = async (req: MintTransactionRequest) => {
    return mintClient.getMintTransactionParameters(req);
  };

  const executeTx = async (
    mintTxParams: MintTransactionResponse,
    minter: Address
  ) => {
    const { request } = await publicClient!.simulateContract({
      abi: mintTxParams.abi,
      address: mintTxParams.contractAddress,
      functionName: mintTxParams.functionName,
      account: minter,
      args: mintTxParams.args,
      value: mintTxParams.value,
    });

    return walletClient!.writeContract(request);
  };

  const waitForTx = async (hash: Hash) => {
    await publicClient!.waitForTransactionReceipt({ hash, confirmations: 2 });
  };

  return {
    waitForTx,
    executeTx,
    checkAvailable,
    mintParameters,
  };
};
