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
import { AxiosError } from "axios";
import { getWhitelist } from "@/api/api";
import { createMintClient } from "@namespacesdk/mint-manager";

const ETH_COIN = 60;
const BASE_COIN = 2147492101;

const ENS_NAME = "shefi.eth"

const SHEFI_AVATAR =
  "https://ipfs.io/ipfs/bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene";
const wallet_key = process.env.WALLET_KEY as Hash;
const alchemy_key = process.env.ALCHEMY_KEY;
const base_rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;

const wallet = privateKeyToAccount(wallet_key);

const namespaceClient = createMintClient({
  mintSource: "shefi",
  cursomRpcUrls: {
    [base.id]: base_rpc
  }
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

    try {
      const whitelist = await getWhitelist();
      if (whitelist?.whitelist.type !== 0) {
        const minter = body.owner;
        const isWhitelisted = (whitelist.whitelist.wallets || []).find(
          (i) => i.toLocaleLowerCase() === minter.toLocaleLowerCase()
        );

        if (!isWhitelisted) {
          res.status(400).json({ mesasge: "Not Whitelisted" });
          return;
        }
      }
    } catch (err) {}

    const parameters = await namespaceClient.getMintTransactionParameters(
      {
        minterAddress: wallet.address,
        label: body.label,
        parentName: ENS_NAME,
        owner: body.owner,
        records: {
          addresses: [
            {
              value: body.owner,
              coin: ETH_COIN,
            },
            {
              value: body.owner,
              coin: BASE_COIN,
            },
          ],
          texts: [
            {
              key: "avatar",
              value: SHEFI_AVATAR,
            },
          ],
        }
      }
    );

    const tx = await walletClient.writeContract({
      abi: parameters.abi,
      address: parameters.contractAddress,
      functionName: parameters.functionName,
      args: parameters.args,
      value: parameters.value,
    });
    res.status(200).json({ tx: tx });
  } catch (err: any) {
    console.error(err);
    if (err instanceof AxiosError) {
      const axiosErr = err as AxiosError;
      res.status(500).json(axiosErr);
    } else if (err instanceof ContractFunctionExecutionError) {
      const contractErr = err as ContractFunctionExecutionError;
      res
        .status(500)
        .json({
          error: JSON.stringify(contractErr.cause || contractErr.details),
        });
    } else {
      res.status(500).json("Unknown error");
    }
  }
}
