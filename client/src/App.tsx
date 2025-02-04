import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from 'wagmi';
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/web3";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Treasury from "@/pages/Treasury";
import Admin from "@/pages/Admin";
import Map from "@/pages/Map";
import Landing from "@/pages/Landing";
import { useAccount } from 'wagmi';
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!address) {
      setLocation('/');
    }
  }, [address, setLocation]);

  if (!address) {
    return null;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (address && window.location.pathname === '/') {
      setLocation('/home');
    }
  }, [address, setLocation]);

  if (address && window.location.pathname === '/') return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicRoute component={Landing} />
      </Route>
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/treasury">
        <ProtectedRoute component={Treasury} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route path="/map">
        <ProtectedRoute component={Map} />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <MusicPlayerProvider>
          <Router />
          <Toaster />
        </MusicPlayerProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;