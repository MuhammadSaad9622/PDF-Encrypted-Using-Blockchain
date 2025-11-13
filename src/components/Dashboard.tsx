import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Settings, 
  LogOut, 
  Wallet, 
  Menu, 
  X,
  Home,
  User,
  ChevronDown,
  Power
} from 'lucide-react';
import { authApi } from '../utils/api';
import { useWallet } from '../App';
import { useTheme, getGradientClasses } from '../utils/theme';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { account, connectWallet, disconnectWallet, switchWallet } = useWallet();
  const { colorScheme } = useTheme();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        try {
          const response = await authApi.getCurrentUser();
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/signin');
        }
      }
    };
    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  // Calculate dropdown position when menu opens or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (walletMenuOpen && walletButtonRef.current) {
        const rect = walletButtonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (walletMenuOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [walletMenuOpen]);

  // Close wallet menu when clicking outside
  useEffect(() => {
    if (!walletMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        walletButtonRef.current &&
        !walletButtonRef.current.contains(target) &&
        !(target as Element).closest('[data-wallet-dropdown]')
      ) {
        setWalletMenuOpen(false);
      }
    };

    // Small delay to avoid closing immediately on button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletMenuOpen]);

  const handleDisconnect = () => {
    disconnectWallet();
    setWalletMenuOpen(false);
  };

  const handleSwitch = async () => {
    await switchWallet();
    setWalletMenuOpen(false);
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Upload, label: 'Upload PDF', path: '/dashboard/upload' },
    { icon: FileText, label: 'My NFTs', path: '/dashboard/my-nfts' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-dark-card border-r border-gray-800 transition-all duration-300 overflow-hidden relative z-10`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
                PDF Encryption
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">AES-256-CBC ENCRYPTION</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${getGradientClasses(colorScheme, 'primary')} text-white`
                      : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4 p-3 bg-dark-hover rounded-lg">
              <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center`}>
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-dark-hover hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-dark-card border-b border-gray-800 px-6 py-4 relative z-20">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              {account ? (
                <div className="relative" ref={walletMenuRef}>
                  <button
                    ref={walletButtonRef}
                    onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-dark-hover rounded-lg hover:bg-dark-hover/80 transition-colors cursor-pointer"
                  >
                    <Wallet className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${walletMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {walletMenuOpen && dropdownPosition && createPortal(
                    <div
                      data-wallet-dropdown
                      className="fixed bg-dark-card border border-gray-800 rounded-lg shadow-xl overflow-hidden z-[9999]"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`,
                        width: '256px',
                      }}
                    >
                      <div className="p-3">
                        <div className="px-2 py-1.5 text-xs font-medium text-gray-400 border-b border-gray-800 mb-2">
                          Wallet Address
                        </div>
                        <div className="px-2 py-2 text-xs text-white font-mono break-all bg-dark-hover rounded mb-2">
                          {account ? (account.startsWith('0x') ? account : `0x${account}`) : 'Not connected'}
                        </div>
                        <div className="mt-2 space-y-1">
                          <button
                            onClick={handleSwitch}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dark-hover rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Wallet className="h-4 w-4 flex-shrink-0" />
                            <span>Switch Wallet</span>
                          </button>
                          <button
                            onClick={handleDisconnect}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Power className="h-4 w-4 flex-shrink-0" />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              ) : (
                <button onClick={connectWallet} className="btn-secondary flex items-center space-x-2">
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

