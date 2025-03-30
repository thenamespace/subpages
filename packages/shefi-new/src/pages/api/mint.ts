import type { NextApiRequest, NextApiResponse } from "next";
import {
  Address,
  ContractFunctionExecutionError,
  createWalletClient,
  Hash,
  http,
  namehash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createNamespaceClient, Listing } from "namespace-sdk";
import { AxiosError } from "axios";


const ETH_COIN = 60;
const BASE_COIN = 2147492101;

const LISTING: Listing = {
  fullName: "shefi.eth",
  label: "shefi",
  network: "mainnet",
  node: namehash("shefi.eth"),
  listingType: "l2",
  registryNetwork: "base",
};


const SHEFI_AVATAR = "https://ipfs.io/ipfs/bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene";
const wallet_key = process.env.WALLET_KEY as Hash;
const alchemy_key = process.env.ALCHEMY_KEY;
const base_rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;

const wallet = privateKeyToAccount(wallet_key);

const namespaceClient = createNamespaceClient({
    chainId: base.id,
    customTransport: http(base_rpc),
    mintSource: "shefi",
  });

const walletClient = createWalletClient({
  transport: http(base_rpc),
  chain: base,
  account: wallet,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = req.body as { owner: Address; label: string };
    const parameters = await namespaceClient.getMintTransactionParameters(LISTING, {
        minterAddress: wallet.address,
        subnameLabel: body.label,
        records: {
            addresses: [
                {
                    address: body.owner,
                    coinType: ETH_COIN
                },
                {
                    address: body.owner,
                    coinType: BASE_COIN
                }
            ],
            texts: [{
                key: "avatar",
                value: SHEFI_AVATAR
            }]
        },
        subnameOwner: body.owner
    })

    const tx = await walletClient.writeContract({
        abi: parameters.abi,
        address: parameters.contractAddress,
        functionName: parameters.functionName,
        args: parameters.args,
        value: parameters.value
    })
    res.status(200).json({ tx: tx });
  } catch (err: any) {

    if (err instanceof AxiosError) {

        const axiosErr = err as AxiosError;
        res.status(500).json(axiosErr)

    } else if (err instanceof ContractFunctionExecutionError) {
      const contractErr = err as ContractFunctionExecutionError;
      res.status(500).json({ error: JSON.stringify(contractErr.cause) });
    }
  }
}
