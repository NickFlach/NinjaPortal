import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useIntl } from "react-intl";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X } from "lucide-react";
import { messages, languageNames } from "@/i18n";
import { NinjaTour } from "@/components/NinjaTour";
import { useDevice } from "@/hooks/use-mobile";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();
  const { isMobile, isTablet } = useDevice();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isCompactView = isMobile || isTablet;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-2 md:py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'app.title' })}
              </h1>
            </Link>
            {!isCompactView && <Navigation />}
          </div>

          <div className="flex items-center gap-2">
            {!isCompactView ? (
              <>
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
                        onClick={() => setLocale(code as keyof typeof messages)}
                        className={locale === code ? 'bg-accent' : ''}
                      >
                        {name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <WalletConnect />
              </>
            ) : (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {mobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>{intl.formatMessage({ id: 'app.title' })}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <Navigation />
                    <div className="space-y-4">
                      <WalletConnect />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            {languageNames[locale as keyof typeof languageNames]}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {Object.entries(languageNames).map(([code, name]) => (
                            <DropdownMenuItem
                              key={code}
                              onClick={() => setLocale(code as keyof typeof messages)}
                              className={locale === code ? 'bg-accent' : ''}
                            >
                              {name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow overflow-x-hidden">
        <div className="container mx-auto pt-4 md:pt-8 pb-32 px-4">
          {children}
        </div>
      </main>

      {/* Fixed position elements */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="container mx-auto px-2 pb-2 md:px-4 md:pb-4">
          {/* Ninja Tour */}
          {!isCompactView && (
            <div className="mb-2 md:mb-4">
              <NinjaTour />
            </div>
          )}

          {/* Music Player */}
          <div className={`${isCompactView ? 'text-sm' : 'text-base'}`}>
            <MusicPlayer />
          </div>
        </div>
      </div>
    </div>
  );
}