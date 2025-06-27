import "bootstrap/scss/bootstrap.scss";
//@ts-ignore
import '@fontsource/inter'
import { WalletConnector } from "./components/WalletConnect";
import { TopNavigation } from "./components/TopNavigation";
import { Footer } from "./components/Footer";
import { MintForm } from "./components/MintForm";
import { MySubnames } from "./components/MySubnames";
import { useState } from "react";
import { Flex, Box, Spinner } from "@chakra-ui/react";
import { themeVariables } from "./styles/themeVariables";
import {
  AppContextProvider,
  useAppConfig,
} from "./components/AppConfigContext";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <WalletConnector>
      <AppContextProvider>
        <AppContainer />
      </AppContextProvider>
      <ToastContainer />
    </WalletConnector>
  );
}

const AppContainer = () => {
  const [view, setView] = useState("mint");
  const state = useAppConfig();

  if (state.isLoading) {
    return (
      <Flex
        flex="1"
        height="100vh"
        width="100%"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner color="blue.400" size="xl" />
      </Flex>
    );
  }

  if (state.isError) {
    return <div>Something went wrong</div>;
  }

  return (
    <Flex
      minHeight="100vh"
      flexDirection="column"
      bg={themeVariables.backgroundImage}
      bgSize="cover"
      bgRepeat="no-repeat"
    >
      <Box>
        <TopNavigation setView={setView} />
      </Box>
      <Flex flex="1" width="100%" alignItems="center" justifyContent="center">
        {view === "mint" ? <MintForm /> : <MySubnames setView={setView} />}
      </Flex>
      <Footer />
    </Flex>
  );
};

export default App;
