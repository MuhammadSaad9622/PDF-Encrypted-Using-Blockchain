import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import necessary wagmi modules
import { createConfig, http, WagmiProvider } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains'; // Using polygonAmoy as mumbai is deprecated in newer wagmi versions
import { injected } from 'wagmi/connectors';

// Configure wagmi
const config = createConfig({
  chains: [polygonAmoy], // Define the chains your app will support
  connectors: [injected()], // Use the injected connector for browser wallets
  transports: {
    [polygonAmoy.id]: http(), // Use HTTP transport for polygonAmoy
  },
});

// Import QueryClient and QueryClientProvider for @tanstack/react-query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a QueryClient instance
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Wrap the App with WagmiProvider and QueryClientProvider */}
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);