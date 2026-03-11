import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./components/WalletProvider";
import { ToastProvider } from "./components/Toast";
import { Navbar } from "./components/Navbar";
import { Landing } from "./pages/Landing";
import { Launch } from "./pages/Launch";
import { Explore } from "./pages/Explore";
import { CreateVault } from "./pages/CreateVault";
import { VaultDashboard } from "./pages/VaultDashboard";
import { VaultAnalytics } from "./pages/VaultAnalytics";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Docs } from "./pages/Docs";
import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  return (
    <WalletProvider>
      <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-pump-dark text-pump-text">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/launch" element={<Launch />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/vaults" element={<CreateVault />} />
              <Route path="/vault/:mint" element={<VaultDashboard />} />
              <Route path="/vault/:mint/analytics" element={<VaultAnalytics />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/docs" element={<Docs />} />
            </Routes>
          </main>
          <ChatPanel mode="helper" />
        </div>
      </BrowserRouter>
      </ToastProvider>
    </WalletProvider>
  );
}
