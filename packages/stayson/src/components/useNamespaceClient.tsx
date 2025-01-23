import { createNamespaceClient, L2Chain, Listing, MintRequest, MintTransactionParameters, SupportedChain } from "namespace-sdk"
import { Address, Hash, namehash } from "viem"
import { mainnet, sepolia } from "viem/chains"
import { usePublicClient, useSignTypedData, useWalletClient } from "wagmi"
import { AppEnv } from "../environment"
import { getChainName } from "namespace-sdk"


const fullName = AppEnv.name
const nameChainId = Number(AppEnv.chainId)

export const LISTEN_NAME: Listing = {
    fullName: fullName,
    label: fullName.split('.')[0],
    network: "mainnet",
    node: namehash(fullName),
    listingType: [mainnet.id, sepolia.id].includes(nameChainId as 1 | 11155111) ? "sellUnruggable" : "l2",
    registryNetwork: [mainnet.id, sepolia.id].includes(nameChainId as 1 | 11155111) ? getChainName(nameChainId) as L2Chain : undefined
}

const client = createNamespaceClient({
    chainId: nameChainId,
    //mintSource: "test",
    mode: "production",
})

export const useNamepsaceClient = () => {

    const publicClient = usePublicClient({chainId: nameChainId})
    const { data: walletClient } = useWalletClient({ chainId: nameChainId })
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