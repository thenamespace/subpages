import type { NextApiRequest, NextApiResponse } from "next";
import {
  Address,
  ContractFunctionExecutionError,
  createWalletClient,
  Hash,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { AxiosError } from "axios";
import { getWhitelist } from "@/api/api";
import { ChainName, createMintClient, type EnsRecords } from "@thenamespace/mint-manager";

const ENS_NAME = "shefi.eth";

const SHEFI_AVATAR =
  "https://ipfs.io/ipfs/bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene";
const wallet_key = process.env.WALLET_KEY as Hash;
const alchemy_key = process.env.ALCHEMY_KEY;
const base_rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;

const wallet = privateKeyToAccount(wallet_key);

const namespaceClient = createMintClient({
  mintSource: "shefi",
  cursomRpcUrls: {
    [base.id]: base_rpc,
  },
});

const walletClient = createWalletClient({
  transport: http(base_rpc),
  chain: base,
  account: wallet,
});

interface MintRequestBody {
  owner: Address;
  label: string;
  records?: {
    texts?: Array<{ key: string; value: string }>;
    addresses?: Array<{ coinType: number; value: string }>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = req.body as MintRequestBody;

    // Whitelist check
    try {
      const whitelist = await getWhitelist();
      // Only check whitelist if the feature is enabled (type !== 0) and whitelist data exists
      if (whitelist?.whitelist && whitelist.whitelist.type !== 0) {
        const minter = body.owner;
        const wallets = whitelist.whitelist.wallets || [];
        const isWhitelisted = wallets.find(
          (i) => i.toLocaleLowerCase() === minter.toLocaleLowerCase()
        );

        if (!isWhitelisted) {
          res.status(400).json({ message: "Not Whitelisted" });
          return;
        }
      }
    } catch (err) {
      // Log but don't block minting if whitelist check fails
      console.error("Whitelist check error:", err);
    }

    // Build records - use provided records or default
    const records: EnsRecords = {
      addresses: [
        {
          value: body.owner,
          chain: ChainName.Ethereum,
        },
        {
          value: body.owner,
          chain: ChainName.Base,
        },
      ],
      texts: [
        {
          key: "avatar",
          value: SHEFI_AVATAR,
        },
      ],
    };

    // Merge in user-provided text records
    if (body.records?.texts && body.records.texts.length > 0) {
      body.records.texts.forEach((text) => {
        if (text.value && text.value.length > 0) {
          // Check if this key already exists (like avatar)
          const existingIndex = records.texts?.findIndex((t) => t.key === text.key) ?? -1;
          if (existingIndex >= 0 && records.texts) {
            records.texts[existingIndex].value = text.value;
          } else if (records.texts) {
            records.texts.push(text);
          }
        }
      });
    }

    console.log("Minting with records:", JSON.stringify(records, null, 2));

    const parameters = await namespaceClient.getMintTransactionParameters({
      minterAddress: wallet.address,
      label: body.label,
      parentName: ENS_NAME,
      owner: body.owner,
      records: records,
    });

    const tx = await walletClient.writeContract({
      abi: parameters.abi,
      address: parameters.contractAddress,
      functionName: parameters.functionName,
      args: parameters.args,
      value: parameters.value,
    });

    res.status(200).json({ tx: tx });
  } catch (err: any) {
    console.error("Mint error:", err);
    if (err instanceof AxiosError) {
      const axiosErr = err as AxiosError;
      res.status(500).json({ error: axiosErr.message });
    } else if (err instanceof ContractFunctionExecutionError) {
      const contractErr = err as ContractFunctionExecutionError;
      res.status(500).json({
        error: JSON.stringify(contractErr.cause || contractErr.details),
      });
    } else {
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  }
}
