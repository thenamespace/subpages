import "bootstrap/scss/bootstrap.scss";
import { WalletConnector } from './components/WalletConnect';
import { TopNavigation } from "./components/TopNavigation";
import { Footer } from "./components/Footer";
import { MintForm } from "./components/MintForm";
import { MySubnames } from "./components/MySubnames";
import { useEffect, useState } from "react";
import { Flex, Box } from "@chakra-ui/react";
import { themeVariables } from "./styles/themeVariables";
import { ReferralProvider } from "./components/ReferralContext";

function App() {
  const [view, setView] = useState("mint");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('referral');

    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
    }
  }, []);

  return (
    <ReferralProvider>
      <WalletConnector>
        <Flex minHeight="100vh" flexDirection="column" bg={themeVariables.backgroundImage} bgSize="cover" position="relative">
          <Box position="absolute" top="0" left="0" width="100%" height="100%" bg="rgba(0, 0, 0, 0.5)" zIndex="1" />
          <Box position="relative" zIndex="1000000">
            <TopNavigation setView={setView} />
          </Box>
          <Flex flex="1" width="100%" alignItems="center" justifyContent="center" position="relative" zIndex="2">
            {view === "mint" ? <MintForm /> : <MySubnames setView={setView} />}
          </Flex>
          <Box position="relative" zIndex="1000000">
            <Footer />
          </Box>
        </Flex>
      </WalletConnector>
    </ReferralProvider>
  );
}

export default App;