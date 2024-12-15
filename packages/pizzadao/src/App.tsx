import "bootstrap/scss/bootstrap.scss";
import { WalletConnector } from './components/WalletConnect';
import { MintForm } from './components/MintForm';
import { TopNavigation } from './components/TopNavigation';
import { Footer } from './components/Footer';

function App() {
  return (
   <WalletConnector>
      <TopNavigation/>
      <MintForm/>
      <Footer/>
   </WalletConnector> 
  )
}

export default App
