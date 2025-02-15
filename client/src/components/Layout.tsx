import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useIntl } from "react-intl";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { messages, languageNames } from "@/i18n";
import { NinjaTour } from "@/components/NinjaTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-2 md:py-4 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'app.title' })}
              </h1>
            </Link>
            <Navigation />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link 
              href="/whitepaper"
              className="text-sm transition-colors hover:text-primary flex items-center"
              title="Read Whitepaper"
            >
              <svg 
                className="h-4 w-4 text-red-500 animate-pulse" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent"
                >
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">Select Language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(languageNames).map(([code, name]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => {
                      console.log('Setting locale to:', code);
                      setLocale(code as keyof typeof messages);
                    }}
                    className={locale === code ? 'bg-accent' : ''}
                  >
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow overflow-x-hidden">
        <div className="container mx-auto pt-16 md:pt-24 pb-32 px-4">
          {children}
        </div>
      </main>

      {/* Fixed position elements */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="container mx-auto px-2 pb-2 md:px-4 md:pb-4">
          {/* Ninja Tour */}
          <div className="mb-2 md:mb-4">
            <NinjaTour />
          </div>

          {/* Music Player */}
          <div className="text-sm md:text-base">
            <MusicPlayer />
          </div>
        </div>
      </div>
    </div>
  );
}