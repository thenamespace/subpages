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
import { Squiggle } from "./components/Squiggle";
import "./globals.css";

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
        <Flex minHeight="100vh" flexDirection="column" bg={themeVariables.backgroundImage} bgSize="cover">
          
          <Box>
            <TopNavigation setView={setView} />
          </Box>
          <Flex flex="1" width="100%" alignItems="center" justifyContent="center">
            {view === "mint" ? <MintForm /> : <MySubnames setView={setView} />}
          </Flex>
          <Squiggle />
          <Footer />
        </Flex>
      </WalletConnector>
    </ReferralProvider>
  );
}

export default App;