import { Box, Button, Flex, Text, Image, Input } from "@chakra-ui/react";
import { Subname } from "./Types";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { Address, encodeFunctionData, Hash, hexToBytes, isAddress, namehash, parseAbi, toHex, zeroAddress } from "viem";
import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { KnownAddresses, WalletAddress } from "./records/Addresses";
import { KnownText, KnownTexts } from "./records/TextRecords";
import { validate as isValidBtcAddress } from "bitcoin-address-validation";
import { toast, ToastContainer } from "react-toastify";
import { themeVariables } from "@/styles/themeVariables";
import { CgProfile } from "react-icons/cg";
import { IoShareSocialSharp } from "react-icons/io5";
import chainIcon from "../assets/chains/circle.svg";
import { mainnet, sepolia } from "viem/chains";
import { getL2NamespaceContracts, getEnsContracts } from "@namespacesdk/addresses"
import { useAppConfig } from "./AppConfigContext";

const resolverAbi = parseAbi([
  "function setText(bytes32 node, string key, string value) external",
  "function setAddr(bytes32 node, uint256 coinType, bytes value) external",
]);




export const SingleSubname = ({subname, onUpdate}: {subname: Subname; onUpdate: () => void;}) => {

    const { listingChainId } = useAppConfig()

    const publicClient = usePublicClient({ chainId: listingChainId });
    const { data: walletClient } = useWalletClient({ chainId: listingChainId });
    const { switchChain } = useSwitchChain();
    const { chain, address } = useAccount();
  
    const [selectedCoin, setSelectedCoin] = useState(60);
    const [selectedText, setSelectedText] = useState("name");
    const [addresseValues, setAddressValues] = useState<Record<number, string>>(
      {}
    );
  
    const [btnState, setBtnState] = useState<{
      waitingWallet: boolean
      waitingTx: boolean
    }>({
      waitingTx: false,
      waitingWallet: false
    })
  
    const [textValues, setTextValues] = useState<Record<string, string>>({});
    const [currentNav, setCurrentNav] = useState<"text" | "addr">("addr");
  
  
  
    useEffect(() => {
      const _texts: Record<string, string> = {};
      const _addresses: Record<number, string> = {};
  
      Object.keys(subname.addresses || {}).forEach((coinType) => {
        const _coin = parseInt(coinType);
        const coder = getCoderByCoinType(_coin);
        if (coder) {
          _addresses[parseInt(coinType)] = coder.encode(
            hexToBytes(subname.addresses[coinType] as any)
          );
        }
      });
      Object.keys(subname.texts || {}).forEach((textKey) => {
        _texts[textKey] = subname.texts[textKey];
      });
  
      setAddressValues(_addresses);
      setTextValues(_texts);
    }, [subname]);
  
    const addressMetadata: WalletAddress = useMemo(() => {
      return (
        KnownAddresses[selectedCoin] || {
          coinType: -1,
          icon: chainIcon,
          label: "unk",
          name: "Unknown",
        }
      );
    }, [selectedCoin]);
  
    const textMetadata: KnownText = useMemo(() => {
      const defaultt: KnownText = {
        key: "",
        label: "",
        type: "profile",
        disabled: false,
        placeholder: "set text value...",
      };
  
      if (!selectedText || !KnownTexts[selectedText]) {
        return defaultt;
      }
  
      return KnownTexts[selectedText];
    }, [selectedText]);
  
  
    const _isValidAddress = (coin: number, value: string) => {
      if (coin === 0) {
        return isValidBtcAddress(value);
      }
  
      return isAddress(value);
    };
  
    const isValidAddress = useMemo(() => {
      const currentValue = addresseValues[selectedCoin];
      if (!currentValue || currentValue.length === 0) {
        return false;
      }
  
      return _isValidAddress(selectedCoin, currentValue);
    }, [selectedCoin, addresseValues]);
  
    const handleAddressChange = (selectedCoin: number, value: string) => {
      const _addrs = { ...addresseValues };
      _addrs[selectedCoin] = value;
      setAddressValues(_addrs);
    };
  
    const handleTextChange = (_selectedText: string, value: string) => {
      const _txts = { ...textValues };
      _txts[_selectedText] = value;
      setTextValues(_txts);
    };
  
    const getRecordsToUpdate = () => {
      const textsToChange: { key: string; value: string }[] = [];
      const addrsToChange: { coin: number; value: string }[] = [];
  
      Object.keys(textValues).forEach((txt) => {
        let shouldUpdate = false;
        const textValue = textValues[txt];
        const existingTexts: Record<string, string> = subname.texts;
        if (existingTexts[txt] && existingTexts[txt].length > 0) {
          if (textValue !== existingTexts[txt]) {
            shouldUpdate = true;
          }
        } else {
          shouldUpdate = true;
        }
  
        if (shouldUpdate) {
          textsToChange.push({ key: txt, value: textValue });
        }
      });
  
      Object.keys(addresseValues).forEach((coinType) => {
        const coin = parseInt(coinType);
        let shouldUpdate = false;
        const currentAddrValue = addresseValues[coin];
        const existingAddresses = subname.addresses;
        const addrCoder = getCoderByCoinType(coin);
  
        if (_isValidAddress(coin, currentAddrValue)) {
          if (
            existingAddresses[`${coinType}`] &&
            existingAddresses[`${coinType}`].length > 0
          ) {
            if (addrCoder) {
              const enodedValue = addrCoder.encode(
                hexToBytes(subname.addresses[coinType] as any)
              );
  
              if (
                enodedValue.toLocaleLowerCase() !==
                currentAddrValue.toLocaleLowerCase()
              ) {
                shouldUpdate = true;
              }
            }
          } else {
            shouldUpdate = true;
          }
  
          if (shouldUpdate) {
            addrsToChange.push({ coin, value: currentAddrValue });
          }
        }
      });
      return { texts: textsToChange, addrs: addrsToChange };
    };
  
    const hasRecordUpdates = useMemo(() => {
      const { texts, addrs } = getRecordsToUpdate();
  
      return texts.length > 0 || addrs.length > 0;
    }, [textValues, addresseValues]);
  
    const toResolverData = () => {
      const data: Hash[] = [];
  
      const nameNode = namehash(subname.name);
      const { texts, addrs } = getRecordsToUpdate();
  
      console.log("Converting to resolver data", subname.name)

      texts.forEach((txt) => {
        data.push(
          encodeFunctionData({
            abi: resolverAbi,
            args: [nameNode, txt.key, txt.value],
            functionName: "setText",
          })
        );
      });
  
      addrs.forEach((addr) => {
        const coder = getCoderByCoinType(addr.coin);
        if (coder) {
          let value = "0x";
          if (addr.value.length > 0) {
            const decodedAddr = coder.decode(addr.value);
            value = toHex(decodedAddr);
          }
  
          const encodedFunc = encodeFunctionData({
            functionName: "setAddr",
            abi: resolverAbi,
            args: [nameNode, BigInt(addr.coin), value as any],
          });
          data.push(encodedFunc);
        }
      });
      return data;
    };
  
    const handleUpdate = async () => {
      if (chain?.id !== listingChainId) {
        switchChain({ chainId: listingChainId });
      }
  
      const resolverData = toResolverData();

      let resolver: string = zeroAddress;
      if (listingChainId === mainnet.id) {
        resolver = getEnsContracts(false).publicResolver
      } else if (listingChainId === sepolia.id) {
        resolver = getEnsContracts(true).publicResolver
      } else {
        resolver = getL2NamespaceContracts(listingChainId).resolver
      }


  
      try {
        const resp = await publicClient!!.simulateContract({
          abi: parseAbi(["function multicall(bytes[] data) external"]),
          address: resolver as Address,
          functionName: "multicall",
          args: [resolverData],
          account: address!!,
        });
    
        try {
          setBtnState({waitingWallet: true, waitingTx: false})
          const tx =  await walletClient!!.writeContract(resp.request);
          setBtnState({waitingTx: true, waitingWallet: false})
  
  
          await publicClient?.waitForTransactionReceipt({hash: tx, confirmations:2})
          setBtnState({waitingTx: false, waitingWallet: false})
  
          toast("Records updated successfully!", {position: "top-right", closeButton: false, autoClose: 1500})
  
          setTimeout(() => {
            onUpdate()
          },3000)
  
        } catch(err: any) {
          console.error(err);
          if (err.details) {
            sendToast(err.details)
          }
        } finally {
          setBtnState({waitingTx: false, waitingWallet: false})
        }
    
      } catch(err:any) {
        if (err.details) {
          sendToast(err.details)
        } else if (err.response) {
          sendToast(err.response?.data?.message)
        } else {
          sendToast("Unknown error ocurred :(")
        }
        console.error(err)
  
      }
    };
  
    const sendToast = (obj: any) => {
      toast(obj,  {type: "error"});
    }
   
    const mintBtnLabel = btnState.waitingTx ? "Waiting for tx..." : btnState.waitingWallet ? "Waiting for wallet..." : "Update"
    const mintBtnLoading = btnState.waitingTx || btnState.waitingWallet;



    return (
      <Box mt={10}>
      <Flex alignItems="center" flexDirection="column">
        <Image src={subname.texts["avatar"]} width="150px" height="150px" borderRadius="full" outline="3px solid" outlineColor={themeVariables.accent} />
        <Text mt={3} mb={0} fontSize="24px" color={themeVariables.accent}>
          {subname.name}
        </Text>
      </Flex>
      <Flex justifyContent="center" mt={4}>
        <Text
          fontSize="18px"
          cursor="pointer"
          color={currentNav === "addr" ? themeVariables.accent : "inherit"}
          onClick={() => setCurrentNav("addr")}
          mr={2}
        >
          Addresses
        </Text>
        <Text
          fontSize="18px"
          cursor="pointer"
          color={currentNav === "text" ? themeVariables.accent : "inherit"}
          onClick={() => setCurrentNav("text")}
        >
          Texts
        </Text>
      </Flex>
      <Box mt={2}>
        <Flex justifyContent="center">
          <Button
            onClick={handleUpdate}
            disabled={!hasRecordUpdates || mintBtnLoading}
            bg={themeVariables.accent}
            color={themeVariables.light}
            width="90%"
          >
            {mintBtnLabel}
          </Button>
        </Flex>
      </Box>
      <Box p={5} display="flex" flexDirection="column" alignItems="center">
        {currentNav === "addr" && (
          <>
            <Text textAlign="center" color={themeVariables.accent} mt={1} mb={1}>
              Select record to edit
            </Text>
            <Flex flexWrap="wrap" justifyContent="center">
              {Object.values(KnownAddresses).map((knownAddr) => (
                <Flex
                  onClick={() => setSelectedCoin(knownAddr.coinType)}
                  key={knownAddr.coinType}
                  outline="1px solid"
                  outlineColor={themeVariables.accent}
                  alignItems="center"
                  justifyContent="center"
                  color={themeVariables.accent}
                  p={2}
                  m={1}
                  cursor="pointer"
                  transition="all 0.3s linear"
                  _hover={{ transform: "scale(1.1)", outlineColor: "white" }}
                  _selected={{ transform: "scale(1.1)", outlineColor: "white" }}
                >
                  <Image src={knownAddr.icon} width="20px" height="20px" mr={2}/>
                  <Text mb={0}>{knownAddr.name}</Text>
                </Flex>
              ))}
            </Flex>
            <Box width="100%" mt={2}>
              <Text mt={1} mb={1} color={themeVariables.accent}>
                {addressMetadata.name} address
              </Text>
              <Input
                placeholder={`Set ${addressMetadata.name} address...`}
                onChange={(e) => handleAddressChange(selectedCoin, e.target.value)}
                mt={1}
                value={addresseValues[selectedCoin] || ""}
                bg={themeVariables.light}
                color={themeVariables.dark}
              />
              {!isValidAddress && (addresseValues[selectedCoin] || "").length > 0 && (
                <Text mt={2} color={themeVariables.error} mb={0}>
                  {addressMetadata.name} address is not valid
                </Text>
              )}
            </Box>
          </>
        )}
        {currentNav === "text" && (
          <>
            <Text textAlign="center" color={themeVariables.accent} mt={1} mb={1}>
              Select record to edit
            </Text>
            <Flex flexWrap="wrap" justifyContent="center">
              {Object.values(KnownTexts).map((txt) => (
                <Flex
                  key={txt.key}
                  onClick={() => setSelectedText(txt.key)}
                  outline="1px solid"
                  outlineColor={themeVariables.accent}
                  alignItems="center"
                  justifyContent="center"
                  color={themeVariables.accent}
                  p={2}
                  m={1}
                  cursor="pointer"
                  transition="all 0.3s linear"
                  _hover={{ transform: "scale(1.1)", outlineColor: "white" }}
                  _selected={{ transform: "scale(1.1)", outlineColor: "white" }}
                >
                  {txt.type === "profile" ? (
                    <CgProfile color={themeVariables.accent} className="me-2" />
                  ) : (
                    <IoShareSocialSharp color={themeVariables.accent} className="me-2" />
                  )}
                  <Text mb={0}>{txt.label}</Text>
                </Flex>
              ))}
              {Object.keys(textValues)
                .filter((txt) => !KnownTexts[txt] && txt !== "avatar")
                .map((txt) => (
                  <Flex
                    key={txt + "-custom"}
                    onClick={() => setSelectedText(txt)}
                    outline="1px solid"
                    outlineColor={themeVariables.accent}
                    alignItems="center"
                    color={themeVariables.accent}
                    p={2}
                    m={1}
                    cursor="pointer"
                    transition="all 0.3s linear"
                    _hover={{ transform: "scale(1.1)", outlineColor: "white" }}
                    _selected={{ transform: "scale(1.1)", outlineColor: "white" }}
                  >
                    <CgProfile color="#2c124f" className="me-2" />
                    <Text>{txt}</Text>
                  </Flex>
                ))}
            </Flex>
            {selectedText && (
              <Box width="100%">
                <Text mb={1} color={themeVariables.accent}>
                  {textMetadata.label} record
                </Text>
                <Input
                  value={textValues[selectedText] || ""}
                  onChange={(e) => handleTextChange(selectedText, e.target.value)}
                  bg={themeVariables.light}
                  color={themeVariables.dark}
                  placeholder={textMetadata.placeholder}
                  borderRadius="5px"
                />
              </Box>
            )}
          </>
        )}
      </Box>
      <ToastContainer toastStyle={{ backgroundColor: themeVariables.accent, color: themeVariables.light}} hideProgressBar/>
    </Box>
    );
}