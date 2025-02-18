import axios from "axios";
import { SiweMessage } from "siwe";
import { Address, Hash } from "viem";
import { Buffer } from "buffer";



type SignerFunc = ({ message }: { message: any }) => Promise<Hash>;

export const nonce = async (): Promise<string> => {
  return axios.get<string>("https://api.namespace.tech/siwe/nonce").then((res) => res.data);
};

export const generateMintAccessToken = async (
  princial: Address,
  signerFunc: SignerFunc
) => {

  const _nonce = await nonce()

  const message = {
     princial,
     nonce: _nonce
  }

  const jsonMessage = JSON.stringify(message);
  const signature = await signerFunc({ message: jsonMessage })

  const encodedMessage = Buffer.from(jsonMessage).toString("base64");
  const encodedSignature = Buffer.from(signature).toString("base64");

  return `${encodedMessage}.${encodedSignature}`
};

export const generateAuthToken = async (
  principal: Address,
  message: string,
  signerFunc: SignerFunc
) => {
  const _nonce = await nonce();
  const siweMessage = new SiweMessage({
    domain: window.location.host,
    address: principal,
    statement: message,
    uri: window.location.origin,
    version: "1",
    chainId: 1,
    nonce: _nonce,
  });
  const signature = await signerFunc({ message: siweMessage.prepareMessage() });
  const siweJSON = JSON.stringify(siweMessage);
  const encodedMessage = Buffer.from(siweJSON).toString("base64");
  const encodedSignature = Buffer.from(signature).toString("base64");

  return `${encodedMessage}.${encodedSignature}`;
};