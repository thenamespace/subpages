import "bootstrap/scss/bootstrap.scss";
import { WalletConnector } from './components/WalletConnect';
import { TopNavigation } from "./components/TopNavigation";
import { Footer } from "./components/Footer";
import { MintForm } from "./components/MintForm";
import { MySubnames } from "./components/MySubnames";
import { useEffect, useState } from "react";
import { Flex, Box, Image } from "@chakra-ui/react";
import { themeVariables } from "./styles/themeVariables";
import { ReferralProvider } from "./components/ReferralContext";
import RedWoman from './assets/RedWoman.png';

function App() {
  const [view, setView] = useState("mint");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('referral');

    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
    }
  }, []);



  const [imageWidth, setImageWidth] = useState(500);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 2000) {
        setImageWidth(900);
      } else if (window.innerWidth > 1500) {
        setImageWidth(500);
      } else {
        setImageWidth(400);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
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
          <Footer />
        </Flex>
      </WalletConnector>
    </ReferralProvider>
  );
}

export default App;