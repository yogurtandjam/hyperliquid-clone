"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Settings,
  Globe,
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

export function Header() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const navItems = [
    { name: "Trade", href: "/trade", active: true },
    { name: "Vaults", href: "/vaults" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Staking", href: "/staking" },
    { name: "Referrals", href: "/referrals" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  const handleConnect = async () => {
    if (!ready) return;

    if (authenticated) {
      logout();
    } else {
      login();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  const walletAddress = user?.wallet?.address;

  return (
    <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-teal-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">H</span>
            </div>
            <span className="text-xl font-semibold text-white">
              Hyperliquid
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`header-nav ${
                  item.active
                    ? "text-white border-b-2 border-teal-500 pb-4"
                    : ""
                }`}
              >
                {item.name}
              </a>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 header-nav">
                <span>More</span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800">
                  Bridge
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800">
                  Explorer
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800">
                  Docs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Network indicator */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-teal-500"></div>
            <span className="text-sm text-gray-300">Online</span>
          </div>

          {/* Settings and Globe */}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
          >
            <Globe className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Wallet Connection */}
          {!ready ? (
            <Button disabled className="bg-gray-600 text-gray-400 px-6">
              Loading...
            </Button>
          ) : authenticated && walletAddress ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 flex items-center space-x-2">
                  <Wallet className="h-4 w-4" />
                  <span>{formatAddress(walletAddress)}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700 w-64">
                <div className="p-3 border-b border-gray-700">
                  <div className="text-sm text-gray-400">Connected with</div>
                  <div className="text-white font-semibold">
                    {user?.email?.address || "Wallet"}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    {walletAddress}
                  </div>
                </div>

                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => copyToClipboard(walletAddress)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </DropdownMenuItem>

                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={handleConnect}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 flex items-center space-x-2"
            >
              <Wallet className="h-4 w-4" />
              <span>Connect</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
