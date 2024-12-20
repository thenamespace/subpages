import { createNamespaceClient, Listing, MintRequest, MintTransactionParameters } from "namespace-sdk"
import { Address, Hash, namehash } from "viem"
import { base } from "viem/chains"
import { usePublicClient, useSignTypedData, useWalletClient } from "wagmi"

export const LISTEN_NAME: Listing = {
    fullName: "nktr.eth",
    label: "nktr",
    network: "mainnet",
    node: namehash("nktr.eth"),
    listingType: "l2",
    registryNetwork: "base"
}

const client = createNamespaceClient({
    chainId: base.id,
    mintSource: "nektar.namespace.ninja",
    mode: "production",
})

export const useNamepsaceClient = () => {

    const publicClient = usePublicClient({chainId: base.id})
    const { data: walletClient } = useWalletClient({ chainId: base.id })
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

    const waitForTx = async (hash: Hash) => {
        await publicClient!.waitForTransactionReceipt({hash, confirmations: 2})
    }
    
    return {
        waitForTx,
        executeTx,
        checkAvailable,
        mintParameters,
        generateAuthToken
    }
}