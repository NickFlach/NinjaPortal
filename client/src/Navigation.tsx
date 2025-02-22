import React from 'react';
import { Map } from 'lucide-react';
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

function Navigation({ requestLocation }) {
  const { t } = useDimensionalTranslation();

  const links = [
    {
      href: "/map",
      label: (
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          <span className="font-medium">{t('nav.map')}</span>
        </span>
      ),
      onClick: requestLocation
    },
    {
      href: "/whitepaper",
      label: (
        <span className="flex items-center gap-2">
          <svg 
            className="h-4 w-4 text-red-500 animate-pulse" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span className="font-medium">{t('nav.whitepaper')}</span>
        </span>
      )
    }
  ];

  return (
    <nav>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} onClick={link.onClick}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navigation;