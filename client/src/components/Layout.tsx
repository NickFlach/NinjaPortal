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
    <div className="relative min-h-screen">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Ninja Tour */}
      <NinjaTour />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'app.title' })}
              </h1>
            </Link>
            <Navigation />
          </div>
          <div className="flex items-center gap-4">
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

      <main className="relative z-10 container mx-auto pt-24 pb-24">
        {children}
      </main>

      {/* Floating Music Player */}
      <MusicPlayer />
    </div>
  );
}