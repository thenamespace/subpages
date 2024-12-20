import ethIcon from "../../assets/chains/eth.svg";
import btcIcon from "../../assets/chains/bitcoin.svg";
import baseIcon from "../../assets/chains/base.svg";
import opIcon from "../../assets/chains/op.svg";
import arbIcon from "../../assets/chains/arb.svg";
import maticIcon from "../../assets/chains/matic.svg";


export interface WalletAddress {
    coinType: number
    icon: string
    name: string
    label: string
}

export const KnownAddresses: Record<number, WalletAddress> = {
    60: {
        coinType: 60,
        icon: ethIcon.src,
        label: "eth",
        name: "Ethereum"
    },
    0: {
        coinType: 0,
        icon: btcIcon.src,
        label: "btc",
        name: "Bitcoin"
    },
    2147492101: {
        coinType: 2147492101,
        icon: baseIcon.src,
        label: "base",
        name: "Base"
    },
    2147483658: {
        coinType: 2147483658,
        icon: opIcon.src,
        label: "op",
        name: "Optimism"
    },
    2147525809: {
        coinType: 2147525809,
        icon: arbIcon.src,
        label: "arb",
        name: "Arbitrum"
    },
    2147483785: {
        coinType: 2147483785,
        icon: maticIcon.src,
        label: "matic",
        name: "Polygon"
    },

}