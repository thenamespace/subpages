import { addEnsContracts, ensPublicActions, ensSubgraphActions } from "@ensdomains/ensjs";
import { createPublicClient } from "viem";
import { mainnet } from "viem/chains";
import { http } from "viem";

export const ENS_CLIENT = createPublicClient({
    chain: {
        ...addEnsContracts(mainnet),
        subgraphs: {
            ens: {
                url: "https://api.mainnet.ensnode.io/subgraph"
            }
        }
    },
    transport: http()
}).extend(ensSubgraphActions).extend(ensPublicActions)