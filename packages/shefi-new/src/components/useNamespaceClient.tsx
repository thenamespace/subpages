import { Address, Hash } from "viem";
import { usePublicClient, useSignTypedData, useWalletClient } from "wagmi";
import {
  createMintClient,
  MintTransactionRequest,
  MintTransactionResponse,
} from "@thenamespace/mint-manager";

export const ENS_NAME = "shefi.eth";
const nameChainId = 8453;

const mintClient = createMintClient({
  mintSource: "shefi",
});

export const useNamepsaceClient = () => {
  const publicClient = usePublicClient({ chainId: nameChainId });
  const { data: walletClient } = useWalletClient({ chainId: nameChainId });
  const { signTypedDataAsync } = useSignTypedData();

  const checkAvailable = async (label: string) => {
    return mintClient.isL2SubnameAvailable(`${label}.${ENS_NAME}`, nameChainId);
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
