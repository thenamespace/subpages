import { useAccount } from "wagmi";
import logo from "../assets/logo.png";
import { Grid, Box, Button, Image, Text, Link, Flex } from "@chakra-ui/react";
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

  return (
    <Box
      bg="transparent"
      p={4}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
    >
      <Grid
        templateColumns="auto 1fr"
        alignItems="center"
        maxWidth="1250px"
        margin="0 auto"
      >
        <Grid templateColumns="auto auto" alignItems="center">
          <Link textDecoration="none" onClick={() => setView("mint")}>
            <Image
              height="50px"
              src={logo}
              alt="Logo"
            />
            <Text fontSize="xl" fontWeight="bold" color={themeVariables.accent} ml={3} mb={0}>
              STAYSON
            </Text>
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
            <Button onClick={() => openConnectModal?.()} bg={themeVariables.accent} color={themeVariables.light} borderRadius="20px !important">Connect Wallet</Button>
          ) : (
            <ConnectButton chainStatus="none" showBalance={false} accountStatus="address"/>
          )}
        </Flex>
      </Grid>
    </Box>
  );
};