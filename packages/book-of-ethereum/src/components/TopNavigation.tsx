import { useAccount } from "wagmi";
import logo from "../assets/boe-logo.png";
import { Grid, Box, Button, Image, Text, Link, Flex, useBreakpointValue } from "@chakra-ui/react";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { themeVariables } from "@/styles/themeVariables";
import { useEffect } from "react";


interface TopNavigationProps {
  setView: (view: string) => void;
}

export const TopNavigation = ({ setView }: TopNavigationProps) => {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) {
      setView("mint");
    }
  }, [isConnected]);


  const logoHeight = useBreakpointValue({ base: "40px", md: "60px" });
  const fontSize = useBreakpointValue({ base: "lg", md: "xl" });
  const padding = useBreakpointValue({ base: 2, md: 4 });
  const showText = useBreakpointValue({ base: false, md: true });

  return (
    <Box
      bg="transparent"
      p={padding}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
    >
      <Grid
        templateColumns={{ base: "1fr auto", md: "auto 1fr" }}
        alignItems="center"
        maxWidth="1250px"
        margin="0 auto"
      >
        <Grid templateColumns="auto auto" alignItems="center">
          <Link textDecoration="none" onClick={() => setView("mint")}>
            <Image
              height={logoHeight}
              width={logoHeight}
              src={logo}
              alt="Logo"
            />
            {showText && (
              <Text fontSize={fontSize} fontWeight="bold" color={themeVariables.accent} ml={0} mb={0}>
                Book of Ethereum
              </Text>
            )}
          </Link>
        </Grid>
        <Flex textAlign="right" ml="auto" alignItems="center">
          {isConnected && (
            <Box>
              <Link
                onClick={() => setView("mint")}
                color={themeVariables.accent}
                fontWeight="bold"
                mr={4}
                textDecoration="none"
                _hover={{  color: themeVariables.light }}
              >
                Mint
              </Link>
              <Link
                onClick={() => setView("subnames")}
                color={themeVariables.accent}
                fontWeight="bold"
                mr={4}
                textDecoration="none"
                _hover={{  color: themeVariables.light }}
              >
                My Subnames
              </Link>
            </Box>
          )}
          {!isConnected ? (
            <Button onClick={() => openConnectModal?.()} bg={themeVariables.accent} color={"black"} borderRadius="20px !important">Connect Wallet</Button>
          ) : (
            <ConnectButton chainStatus="none" showBalance={false} accountStatus="address"/>
          )}
        </Flex>
      </Grid>
    </Box>
  );
};