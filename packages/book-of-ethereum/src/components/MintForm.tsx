import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Input,
  Link,
  Spinner,
  Text,
  useBreakpointValue,
  Alert,
  Card
} from "@chakra-ui/react";
import { useNamepsaceClient } from "./useNamespaceClient";
import { normalize } from "viem/ens";
import { debounce } from "lodash";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address, Hash, parseAbi } from "viem";
import { FaArrowDown, FaArrowUp, FaX, FaEthereum } from "react-icons/fa6";
import { hexToRgba, themeVariables } from "@/styles/themeVariables";
import { toast, ToastContainer } from "react-toastify";
import { mainnet, sepolia } from "viem/chains";
import { useAppConfig } from "./AppConfigContext";

import "./_styles.scss";
//@ts-ignore
import { MintDetailsResponse } from "@namespacesdk/mint-manager";
import { getSubnamePrice } from "./Utils";

enum RegistrationStep {
  START = 0,
  TX_SENT = 1,
  PRIMARY_NAME = 2,
  COMPLETE = 3,
}

const swapBoeUri = "https://app.uniswap.org/swap?chain=mainnet&inputCurrency=NATIVE&outputCurrency=0x289ff00235d2b98b0145ff5d4435d3e92f9540a6"

const ETH_COIN = 60;
const BASE_COIN = 2147492101;
const OP_COIN = 2147483658;

export const MintForm = () => {
  const { isRenting, listedName, listingChainId, isTestnet, defaultAvatarUri, listing } =
    useAppConfig();

  const [label, setLabel] = useState("");
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [notEnoughBoe, setNotEnoughBoe] = useState<boolean>(false);
  const {
    checkAvailable,
    mintParameters,
    executeTx,
    waitForTx,
    getMintDetails,
  } = useNamepsaceClient();
  const [mintError, setMintError] = useState<string>("");
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [mintPrice, setMintPrice] = useState<{
    mintPrice: number;
    isFetching: boolean;
    isError: boolean;
  }>({
    isError: false,
    isFetching: false,
    mintPrice: 0,
  });
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

  const [primaryNameIndicators, setPrimaryNameIndicators] = useState<{
    waiting: boolean;
    btnLabel: string;
  }>({ waiting: false, btnLabel: "Set primary name!" });

  let reverseRegistarAbi;
  let reverseRegistar;
  let chainForPrimaryName;
  if (!isTestnet) {
    reverseRegistar = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb" as Address;
    reverseRegistarAbi = parseAbi(["function setName(string name)"]);
    chainForPrimaryName = mainnet.id;
  } else {
    reverseRegistar = "0xCF75B92126B02C9811d8c632144288a3eb84afC8" as Address;
    reverseRegistarAbi = parseAbi(["function setName(string _name)"]);
    chainForPrimaryName = sepolia.id;
  }

  const publicClient = usePublicClient({ chainId: chainForPrimaryName });
  const { data: walletClient } = useWalletClient({
    chainId: chainForPrimaryName,
  });
  const [expiryYears, setExpiryYears] = useState(1);

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
      setMintPrice({ ...mintPrice, isFetching: true })
      setIndicators({ available: false, checking: true });
      debouncedCheck(_value);
      fetchPrice(label)
    } else {
      setIndicators({ available: false, checking: false });
    }
  };


  const fetchPrice = async (label: string) => {
    try {
      const price = getSubnamePrice(label, listing.prices);
      setMintPrice({
        isError: false,
        isFetching: false,
        mintPrice: price,
      });
    } catch (err) {
      setMintPrice({
        isError: true,
        isFetching: false,
        mintPrice: 0,
      });
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

  const handleMint = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    if (chainId !== listingChainId) {
      await switchChainAsync({ chainId: listingChainId });
    }
    const addresses: any[] = [
      {
        value: address,
        coin: ETH_COIN,
      },
      {
        value: address,
        coin: BASE_COIN,
      },
      {
        value: address,
        coin: OP_COIN,
      },
    ];

    const texts: { key: string; value: string }[] = [];

    if (defaultAvatarUri) {
      texts.push({ key: "avatar", value: defaultAvatarUri });
    }

    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      const params = await mintParameters({
        minterAddress: address,
        expiryInYears: expiryYears,
        records: {
          addresses: addresses,
          texts: texts,
        },
        label: label,
        parentName: listedName,
        owner: address!,
      });
      const tx = await executeTx(params, address);
      setTxHash(tx);
      setRegistrationStep(RegistrationStep.TX_SENT);
      setMintIndicator({ btnLabel: "Registering...", waiting: true });
      await waitForTx(tx);
      setRegistrationStep(RegistrationStep.PRIMARY_NAME);
    } catch (err: any) {
      console.error(err);
      if (err?.cause?.details?.includes("User denied transaction signatur")) {
        return;
      } else if (err?.cause?.details?.includes("insufficient funds for")) {
        setMintError(`Insufficient ETH balance`);
      } else {
        if (err.response) {
          parseError(err.response?.data?.message || "");
        } else {
          parseError(err?.message || "");
        }
      }
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
    }
  };

  const parseError = (errMessage: string) => {
    if (errMessage.includes("MINTER_NOT_TOKEN_OWNER")) {
      setNotEnoughBoe(true)
    } else if (errMessage.includes("SUBNAME_TAKEN")) {
      setMintError("Subname is already taken");
    } else if (errMessage.includes("MINTER_NOT_WHITELISTED")) {
      setMintError("You are not whitelisted");
    } else if (errMessage.includes("LISTING_EXPIRED")) {
      setMintError("Listing has expired");
    } else if (errMessage.includes("SUBNAME_RESERVED")) {
      setMintError("Subname is reserved");
    } else if (errMessage.includes("VERIFIED_MINTER_ADDRESS_REQUIRED")) {
      setMintError("Verification required");
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
  const headlineFontSize = useBreakpointValue({ base: "35px", md: "50px" });
  const subHeadlineFontSize = useBreakpointValue({ base: "15px", md: "20px" });

  const handlePrimaryName = async () => {
    if (chainId !== chainForPrimaryName) {
      await switchChainAsync({ chainId: chainForPrimaryName });
    }

    try {
      setPrimaryNameIndicators({
        btnLabel: "Waiting for wallet",
        waiting: true,
      });

      const resp = await publicClient!!.simulateContract({
        abi: reverseRegistarAbi,
        address: reverseRegistar,
        functionName: "setName",
        args: [`${label}.${listedName}`],
        account: address!!,
      });

      try {
        const tx = await walletClient!!.writeContract(resp.request);
        setPrimaryNameIndicators({ btnLabel: "Processing", waiting: true });

        await publicClient?.waitForTransactionReceipt({
          hash: tx,
          confirmations: 2,
        });
        setRegistrationStep(RegistrationStep.COMPLETE);

        toast("Primary name set successfully!", {
          position: "top-right",
          closeButton: false,
          autoClose: 1500,
        });
      } catch (err: any) {
        if (err.details) {
          toast(err.details, { type: "error" });
        }
      }
    } catch (err: any) {
      if (err.details) {
        toast(err.details, { type: "error" });
      } else if (err.response) {
        toast(err.response?.data?.message, { type: "error" });
      } else {
        console.log(err);
        toast("Unknown error occurred :(", { type: "error" });
      }
    } finally {
      setPrimaryNameIndicators({
        btnLabel: "Set primary name!",
        waiting: false,
      });
    }
  };

  const getMintBoeTokenAmmount = () => {
    if (listing?.tokenGatedAccess && listing.tokenGatedAccess.length > 0) {
      const boe = listing.tokenGatedAccess[0]
      return boe.erc20MinTokenBalance
    }
    return 1;
  }

  return (
    <Grid
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="flex-start"
      paddingTop="50px"
    >
      <Box
        display="flex"
        marginTop={25}
        flexDirection="column"
        alignItems="center"
        mb={10}
        alignSelf="center"
      >
        <Text
          mt={0}
          mb={0}
          color={"white"}
          fontSize={headlineFontSize}
          textAlign="center"
          fontWeight="500"
          className="text-inner-shadow"
        >
          BOOK OF ETHEREUM
        </Text>
        <Text
          mt={0}
          mb={0}
          color={themeVariables.light}
          fontWeight={"bold"}
          fontSize={subHeadlineFontSize}
          textAlign="center"
          letterSpacing={2}
        >
          ENS for the BOOELIEVERS
        </Text>
        <Box display="flex" alignItems={"center"} marginTop={"10px"}>
          <Box background={themeVariables.accent} padding={"8px"} textAlign={"center"} minWidth={"90px"} borderRadius={10} marginRight={2}>
            <Link fontSize={16} color="black" textDecoration={"none"} href="https://www.bookofeth.xyz" target="_blank" rel="noopener noreferrer">
              Website
            </Link>
          </Box>
          <Box background={themeVariables.accent} padding={"8px"} textAlign={"center"} minWidth={"90px"} borderRadius={10} marginRight={2}>
            <Link fontSize={16} color="black" textDecoration={"none"} href="https://booemerch.com" target="_blank" rel="noopener noreferrer">
              Merch
            </Link>
          </Box>
        </Box>
      </Box>
      <Box
        bg={hexToRgba(themeVariables.main, 0.8)}
        p={boxPadding}
        alignSelf="center"
        borderRadius="15px"
        shadow="md"
        width={boxWidth}
        position="relative"
        border="1px solid"
        borderColor={themeVariables.accent}
      >
        <Box paddingTop={6}>
          {registrationStep === RegistrationStep.START && (
            <>
              <Box display="flex" justifyContent="center" mb={3}>
                <Box
                  as="img"
                  //@ts-ignore
                  src={defaultAvatarUri}
                  alt="Avatar"
                  borderRadius="40px"
                  border="2px solid"
                  borderColor={themeVariables.accent}
                  boxSize="120px"
                />
              </Box>
              <Text
                textAlign="center"
                fontSize="20px"
                color={themeVariables.light}
                fontWeight="500"
                mb={4}
              >
                <Box as="span" color={themeVariables.accent}>
                  {label.length === 0 ? "{name}" : label}
                </Box>
                .{listedName}
                {(indicators.checking && <>


                </>)}
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
                  <Box
                    position="absolute"
                    top="50%"
                    right="0.5rem"
                    transform="translateY(-50%)"
                  >
                    {indicators.checking && <Spinner color={themeVariables.accent} height={21} />}
                  </Box>
                )}
                {(!indicators.checking && label.length > 0) && (
                  <Box
                    position="absolute"
                    top="50%"
                    right="0.5rem"
                    display="flex"
                    alignItems="center"
                    transform="translateY(-50%)"
                  >
                    <Text fontWeight={"bold"} fontSize={16} padding={0} margin={0} marginRight={1}>{mintPrice.mintPrice} ETH</Text>
                  </Box>
                )}
              </Box>
              <Button
                onClick={() => handleMint()}
                width="100%"
                disabled={mintBtnDisabled}
                color={"black"}
                bg={themeVariables.accent}
                marginTop={"5px"}
              >
                {mintIndicators.btnLabel}
              </Button>
              {subnameTakenErr && (
                <Text
                  textAlign="center"
                  color={themeVariables.error}
                  mt={5}
                  mb={0}
                >
                  <Alert.Root status="warning" marginTop={"10px"} position="relative">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                   Name not available
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
                </Text>
              )}
              {mintError.length > 0 && (
                <Alert.Root status="warning" marginTop={"10px"} position="relative">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                   {mintError}
                   <FaX
                    size="10px"
                    style={{ position:"absolute", top:"10px", right:"10px", cursor: "pointer", color: themeVariables.accent }}
                    onClick={() => setMintError("")}
                  />
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
              )}
              {notEnoughBoe && <Alert.Root status="warning" marginTop={"10px"}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    To mint a subname, you need at least <b>{getMintBoeTokenAmmount()} BOOE tokens</b> in your wallet.
                    <br />
                    <Link href={swapBoeUri} target="_blank" color={themeVariables.accent}>
                      Swap tokens
                    </Link>{" "}
                    to continue.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>}
            </>
          )}
          {registrationStep === RegistrationStep.TX_SENT && (
            <Grid templateColumns="1fr" justifyItems="center">
              <Spinner
                color={themeVariables.accent}
                width={100}
                height={100}
                animationDuration="1.3s"
                borderWidth="3px"
              />
              <Text mt={3} fontSize={20} color="white">
                Registration in progress
              </Text>
              {txHash && (
                // fix block explorer
                <Link
                  href={`${listedName}/tx/` + txHash}
                  target="_blank"
                  rel="noopener noreferrer"
                  color={themeVariables.accent}
                  textDecoration="none"
                  _hover={{
                    textDecoration: "underline",
                    textDecorationColor: themeVariables.accent,
                  }}
                >
                  <Text
                    textAlign="center"
                    color={themeVariables.accent}
                    fontSize={15}
                    mt={0}
                    mb={0}
                  >
                    Click here for transaction
                  </Text>
                </Link>
              )}
            </Grid>
          )}
          {registrationStep === RegistrationStep.PRIMARY_NAME && (
            <Grid templateColumns="1fr" justifyItems="center">
              <Text
                textAlign="center"
                color={themeVariables.light}
                fontSize={24}
                mt={2}
                mb={4}
              >
                You have registered
              </Text>
              <Box display="flex" justifyContent="center" mb={1}>
                <Box
                  as="img"
                  //@ts-ignore
                  src={defaultAvatarUri}
                  alt="Avatar"
                  borderRadius="40px"
                  border="2px solid"
                  borderColor={themeVariables.accent}
                  boxSize="120px"
                />
              </Box>
              <Link
                href={`https://app.ens.domains/${label}.${listedName}`}
                target="_blank"
                rel="noopener noreferrer"
                mb={2}
                textDecoration="none"
                _hover={{
                  textDecoration: "underline",
                  textDecorationColor: themeVariables.accent,
                }}
              >
                <Text color="white" fontSize={30} textAlign="center">
                  <Box as="span" color={themeVariables.accent}>
                    {label}
                  </Box>
                  .{listedName}
                </Text>
              </Link>
              <Button
                onClick={() => handlePrimaryName()}
                bg={themeVariables.accent}
                color={"black"}
                width="100%"
                mb={2}
                disabled={primaryNameIndicators.waiting}
              >
                {primaryNameIndicators.btnLabel}
              </Button>
              <Button
                onClick={() => {
                  setLabel("");
                  setRegistrationStep(RegistrationStep.START);
                }}
                bg={themeVariables.main}
                color={themeVariables.light}
                width="95%"
                disabled={primaryNameIndicators.waiting}
              >
                Finish
              </Button>
            </Grid>
          )}
          {registrationStep === RegistrationStep.COMPLETE && (
            <Grid templateColumns="1fr" justifyItems="center">
              <Text
                textAlign="center"
                color={themeVariables.light}
                fontSize={24}
                mt={2}
                mb={4}
              >
                You have registered
              </Text>
              <Box display="flex" justifyContent="center" mb={1}>
                <Box
                  as="img"
                  //@ts-ignore
                  src={defaultAvatarUri}
                  alt="Avatar"
                  borderRadius="40px"
                  border="2px solid"
                  borderColor={themeVariables.accent}
                  boxSize="120px"
                />
              </Box>
              <Link
                href={`https://app.namespace.ninja/${label}.${listedName}`}
                target="_blank"
                rel="noopener noreferrer"
                mb={2}
                textDecoration="none"
                _hover={{
                  textDecoration: "underline",
                  textDecorationColor: themeVariables.accent,
                }}
              >
                <Text color="white" fontSize={30} textAlign="center">
                  <Box as="span" color={themeVariables.accent}>
                    {label}
                  </Box>
                  .{listedName}
                </Text>
              </Link>
              <Link
                href={`https://x.com/intent/tweet?text=I just minted ${label}.${listedName} via @namespace_eth!`}
                target="_blank"
                rel="noopener noreferrer"
                mb={2}
                textDecoration="none"
                _hover={{
                  textDecoration: "underline",
                  textDecorationColor: themeVariables.accent,
                }}
              >
                <Text color="white" fontSize={30} textAlign="center">
                  Share on X
                </Text>
              </Link>
              <Button
                onClick={() => {
                  setLabel("");
                  setRegistrationStep(RegistrationStep.START);
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
      <ToastContainer
        toastStyle={{
          backgroundColor: themeVariables.accent,
          color: themeVariables.light,
        }}
        hideProgressBar
      />
    </Grid>
  );
};
