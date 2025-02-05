import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { MusicPlayer } from "@/components/MusicPlayer";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Music-Portal
              </h1>
            </Link>
            <Navigation />
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="relative z-10 container mx-auto pt-24 pb-24">
        {children}
      </main>

      {/* Floating Music Player */}
      <MusicPlayer />
    </div>
  );
}