"use client";

import axios from "axios";

export interface WhitelistResponse {
  whitelist: { type: number, wallets: string[] }
}


export const getWhitelist = async(): Promise<WhitelistResponse> => {
  return await axios
  .get<WhitelistResponse>(
    `https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/shefi.eth`,
    {}
  )
  .then((res) => res.data);
}