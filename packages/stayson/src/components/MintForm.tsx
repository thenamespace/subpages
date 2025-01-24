import { useCallback, useEffect, useState } from "react";
import { Box, Button, Grid, Input, Link, Spinner, Text, useBreakpointValue } from "@chakra-ui/react";
import { useNamepsaceClient, LISTEN_NAME } from "./useNamespaceClient";
import { normalize } from "viem/ens";
import { debounce } from "lodash";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Hash, namehash } from "viem";
import { AddressRecord } from "namespace-sdk/dist/clients";
import { FaArrowDown, FaArrowUp, FaX } from "react-icons/fa6";
import { AppEnv } from "../environment";
import { hexToRgba, themeVariables } from "@/styles/themeVariables";
import { getChainName } from "namespace-sdk";
import { getKnownAddress } from "./records/Addresses";
import { addReferral, isRenting as isRentingApi } from "@/api/api";

const nameChainId = Number(AppEnv.chainId);
const explorerUrl = AppEnv.explorerUrl;
const avatarUrl = AppEnv.avatarUrl;

enum RegistrationStep {
  START = 0,
  TX_SENT = 1,
  COMPLETE = 2,
}



export const MintForm = () => {
  const [label, setLabel] = useState("");
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    checkAvailable,
    mintParameters,
    generateAuthToken,
    executeTx,
    waitForTx,
  } = useNamepsaceClient();
  const [mintError, setMintError] = useState<string>("");
  const [txHash, setTxHash] = useState<Hash>();
  const { switchChainAsync } = useSwitchChain();
  const [indicators, setIndicators] = useState<{
    checking: boolean;
    available: boolean;
  }>({
    available: false,
    checking: false,
  });
  const [mintIndicators, setMintIndicator] = useState<{
    waiting: boolean;
    btnLabel: string;
  }>({ waiting: false, btnLabel: "Register" });
  const [registrationStep, setRegistrationStep] = useState(
    RegistrationStep.START
  );



  const ETH_COIN = 60;

  let L2_COIN = null;

  const l2Address = getKnownAddress(nameChainId);

  if (l2Address) {
    L2_COIN = l2Address.coinType;
  }






  const [isRenting, setIsRenting] = useState(false);


  const[expiryYears, setExpiryYears] = useState(1);




  useEffect(() => {
    isRentingApi(getChainName(nameChainId), namehash(LISTEN_NAME.fullName)).then((res) => {
      if (res == 1) {
        setIsRenting(true);
      }
    });
  }, [])


  const handleUpdateLabel = (value: string) => {
    const _value = value.toLocaleLowerCase();
    if (_value.includes(".")) {
      return;
    }
    try {
      normalize(_value);
    } catch (err) {
      return;
    }
    setLabel(_value);

    if (_value.length > 0) {
      setIndicators({ available: false, checking: true });
      debouncedCheck(_value);
    } else {
      setIndicators({ available: false, checking: false });
    }
  };

  const check = async (label: string) => {
    const subnameAvailable = await checkAvailable(label);
    setIndicators({
      available: subnameAvailable,
      checking: false,
    });
  };

  const debouncedCheck = useCallback(
    debounce((label) => check(label), 200),
    []
  );


  
  
  const handleAddReferral = async (code: string, subname: string) => {
    try {
      await addReferral(code, subname);

    } catch (err) {
      console.log(err);
    }
  }





  const handleMint = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    if (chainId !== nameChainId) {
      await switchChainAsync({ chainId: nameChainId });
    }

    let token;

    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      token = await generateAuthToken(address);
    } catch (err) {
      return;
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
    }

    const addresses: AddressRecord[] = [
      {
      address: address,
      coinType: ETH_COIN,
      },
    ];

    if (L2_COIN !== null) {
      addresses.push({
        address: address,
        coinType: L2_COIN,
      });
    }

    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      const params = await mintParameters({
        minterAddress: address,
        subnameLabel: label,
        expiryInYears: expiryYears,
        records: {
          addresses: addresses,
          texts: [
            {
              key: "avatar",
              value: avatarUrl,
            },
          ],
        },
        subnameOwner: address,
        token: token.accessToken,
      });
      const tx = await executeTx(params, address);
      setTxHash(tx);
      setRegistrationStep(RegistrationStep.TX_SENT);
      setMintIndicator({ btnLabel: "Registering...", waiting: true });
      await waitForTx(tx);


      const referralCodeStorage = localStorage.getItem("referralCode") || "";
      if (referralCodeStorage) {
        handleAddReferral(referralCodeStorage, `${label}.${LISTEN_NAME.fullName}`);
      }


      setRegistrationStep(RegistrationStep.COMPLETE);
    } catch (err: any) {
      console.error(err);
      if (err?.cause?.details?.includes("User denied transaction signatur")) {
        return;
      } else if (err?.cause?.details?.includes("insufficient funds for")) {
        setMintError(`Insufficient balance`);
      } else {
        parseError(err?.message || "");
      }
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
    }
  };

  const parseError = (errMessage: string) => {
    if (errMessage.includes("MINTER_NOT_TOKEN_OWNER")) {
      setMintError("You don't have enought tokens for minting!");
    } else {
      setMintError("Unknown error ocurred. Check console for more info");
    }
  };

  const noLabel = label.length === 0;
  const subnameTakenErr =
    !noLabel && !indicators.checking && !indicators.available;
  const mintBtnDisabled =
    noLabel ||
    indicators.checking ||
    !indicators.available ||
    mintIndicators.waiting;

    
  const boxWidth = useBreakpointValue({ base: "90%", md: "400px" });
  const boxPadding = useBreakpointValue({ base: 4, md: 6 });
  const headlineFontSize = useBreakpointValue({ base: "40px", md: "70px" });
  const subHeadlineFontSize = useBreakpointValue({ base: "16px", md: "22px" });
  const letterSpacing = useBreakpointValue({ base: 8, md: 15 });


  return (
    <Grid display="flex" flexDirection="column" alignItems="flex-start" justifyContent="flex-start" paddingTop="50px">
        <Box display="flex" flexDirection="column" alignItems="center" mb={10} alignSelf="center">
          <Text mt={0} mb={0} color={themeVariables.accent} fontSize={headlineFontSize} textAlign="center" fontWeight="500">
            {LISTEN_NAME.fullName.toUpperCase()}
          </Text>
          <Text mt={0} mb={0} color={themeVariables.light} fontSize={subHeadlineFontSize} textAlign="center" letterSpacing={letterSpacing}>
            GET YOUR SUBNAME
          </Text>
        </Box>
        <Box bg={hexToRgba(themeVariables.main, 0.8)} p={boxPadding} alignSelf="center" borderRadius="15px" shadow="md" width={boxWidth} position="relative" border="1px solid" borderColor={themeVariables.accent}>
          <Box paddingTop={6}>
          {registrationStep === 0 && (
              <>
                <Box display="flex" justifyContent="center" mb={3}>
                  <Box
                    as="img"
                    //@ts-ignore
                    src={avatarUrl}
                    alt="Avatar"
                    borderRadius="40px"
                    border="2px solid"
                    borderColor={themeVariables.accent}
                    boxSize="120px"
                  />
                </Box>
                <Text textAlign="center" fontSize="20px" color={themeVariables.light} fontWeight="500" mb={4}>
                  <Box as="span" color={themeVariables.accent}>
                  {label.length === 0 ? "{name}" : label}
                  </Box>
                  .{LISTEN_NAME.fullName}
                </Text>
                <Box mb={1} position="relative">
                  <Input
                    value={label}
                    placeholder="Find your perfect subname..."
                    onChange={(e) => handleUpdateLabel(e.target.value)}
                    pr="2.5rem"
                    bg={themeVariables.light}
                    borderRadius="5px"
                  />
                  {indicators.checking && (
                    <Box position="absolute" top="50%" right="0.5rem" transform="translateY(-50%)">
                      <Spinner color={themeVariables.accent} height={21} />
                    </Box>
                  )}
                  {!indicators.checking && indicators.available && (
                    <Box position="absolute" right="0.5rem" transform="translateY(-85%)">
                      <Text color={themeVariables.accent}>Free Mint</Text>
                    </Box>
                  )}
                </Box>
                {isRenting && (
                    <Box display="flex" alignItems="center" mb={3} mt={3}>
                      <Text color={themeVariables.light} fontSize={14} marginRight="0px" mb={0} marginLeft="5px">
                        Expiration in years:
                      </Text>
                      <FaArrowDown style={{ cursor: "pointer", color: themeVariables.accent, marginLeft: "10px", marginRight: "10px" }} onClick={() => setExpiryYears(Math.max(1, expiryYears - 1))} />
                      <Text color={themeVariables.light} fontSize={14} mb={0}>
                        {expiryYears}
                      </Text>
                      <FaArrowUp style={{ cursor: "pointer", color: themeVariables.accent, marginLeft: "10px"}} onClick={() => setExpiryYears(expiryYears + 1)} />
                    </Box>
                )}
                <Button
                  onClick={() => handleMint()}
                  width="100%"
                  disabled={mintBtnDisabled}
                  color={themeVariables.light}
                  bg={themeVariables.accent}
                  mt={isRenting ? 0 : 4}
                >
                  {mintIndicators.btnLabel}
                </Button>
                {subnameTakenErr && (
                  <Text textAlign="center" color={themeVariables.error} mt={5} mb={0}>
                    Subname is already registered
                  </Text>
                )}
                {mintError.length > 0 && (
                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={5} mb={0}>
                    <Text color={themeVariables.error} mb={0}>{mintError}</Text>
                    <FaX style={{ cursor: "pointer", color: themeVariables.accent }} onClick={() => setMintError("")} />
                  </Box>
                )}
              </>
            )}
            {registrationStep === 1 && (
              <Grid templateColumns="1fr" justifyItems="center">
                <Spinner color={themeVariables.accent} width={100} height={100} animationDuration="1.3s" borderWidth="3px"/>
                <Text mt={3} fontSize={20} color="white">
                  Registration in progress
                </Text>
                {txHash && (
                  <Link href={`${explorerUrl}/tx/` + txHash} target="_blank" rel="noopener noreferrer" color={themeVariables.accent} textDecoration="none" _hover={{ textDecoration: "underline", textDecorationColor: themeVariables.accent }}>
                    <Text textAlign="center" color={themeVariables.accent} fontSize={15} mt={0} mb={0}>
                      Click here for transaction
                    </Text>
                  </Link>
                )}
              </Grid>
            )}
            {registrationStep === 2 && (
              <Grid templateColumns="1fr" justifyItems="center">  
                <Text textAlign="center" color={themeVariables.light} fontSize={24} mt={2} mb={4} >
                  You have registered
                </Text>
                <Box display="flex" justifyContent="center" mb={1}>
                  <Box
                    as="img"
                    //@ts-ignore
                    src={avatarUrl}
                    alt="Avatar"
                    borderRadius="40px"
                    border="2px solid"
                    borderColor={themeVariables.accent}
                    boxSize="120px"
                  />
                </Box>
                <Link href={`https://app.ens.domains/${label}.${LISTEN_NAME.fullName}`} target="_blank" rel="noopener noreferrer" mb={2} textDecoration="none" _hover={{ textDecoration: "underline", textDecorationColor: themeVariables.accent }}>
                  <Text color="white" fontSize={30} textAlign="center">
                    <Box as="span" color={themeVariables.accent}>{label}</Box>
                    .{LISTEN_NAME.fullName}
                  </Text>
                </Link>
                <Button
                  onClick={() => {
                    setLabel("");
                    setRegistrationStep(0);
                  }}
                  bg={themeVariables.accent}
                  color={themeVariables.light}
                  width="100%"
                >
                  Great!
                </Button>
              </Grid>
            )}
          </Box>
        </Box>
      </Grid>
  );
};