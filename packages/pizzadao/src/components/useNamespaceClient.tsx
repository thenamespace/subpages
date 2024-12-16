import { createNamespaceClient, Listing, MintRequest, MintTransactionParameters } from "namespace-sdk"
import { Address, Hash, namehash } from "viem"
import { baseSepolia } from "viem/chains"
import { usePublicClient, useSignTypedData, useWalletClient } from "wagmi"

export const LISTEN_NAME: Listing = {
    fullName: "pizzzaa.eth",
    label: "pizzzaa",
    network: "sepolia",
    node: namehash("pizzzaa.eth"),
    listingType: "l2",
    registryNetwork: "baseSepolia"
}

const client = createNamespaceClient({
    chainId: baseSepolia.id,
    mintSource: "pizzadao.namespace.ninja",
})

export const useNamepsaceClient = () => {

    const publicClient = usePublicClient({chainId: baseSepolia.id})
    const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })
    const { signTypedDataAsync } = useSignTypedData()

    const checkAvailable = async (label: string) => {
        return client.isSubnameAvailable(LISTEN_NAME, label)
    }

    const mintParameters = async (req: MintRequest) => {
        return client.getMintTransactionParameters(LISTEN_NAME, req)
    }

    const generateAuthToken = async (principal: Address) => {
        return client.generateAuthToken(principal, signTypedDataAsync, "Generate token");
    }

    const executeTx = async (mintTxParams: MintTransactionParameters, minter: Address) => {
        const {request} = await publicClient!.simulateContract({
            abi: mintTxParams.abi,
            address: mintTxParams.contractAddress,
            functionName: mintTxParams.functionName,
            account: minter,
            args: mintTxParams.args,
            value: mintTxParams.value
        })

        return walletClient!.writeContract(request);
    }

    const simulateMint = async(label: string, minter: Address) => {
        return client.getMintDetails(LISTEN_NAME, label, minter )
    }

    const waitForTx = async (hash: Hash) => {
        await publicClient!.waitForTransactionReceipt({hash, confirmations: 2})
    }
    
    return {
        waitForTx,
        executeTx,
        checkAvailable,
        mintParameters,
        generateAuthToken,
        simulateMint
    }
}