import { useState } from "react";
import Flag from "react-world-flags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

// Map of language codes to country codes for flags
const languageFlags = {
  en: "US",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "PT",
  ru: "RU",
  ja: "JP",
  ko: "KR",
  zh: "CN",
  ar: "SA",
  uk: "UA",
  eo: "EU" // Esperanto uses EU flag as a fallback
} as const;

// Map of language codes to their full names
const languageNames = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ar: "العربية",
  uk: "Українська",
  eo: "Esperanto"
} as const;

export function LanguageSwitcher() {
  const { locale, setLocale } = useDimensionalTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Select value={locale} onValueChange={setLocale}>
      <SelectTrigger className="w-[180px] flex items-center gap-2">
        <Flag code={languageFlags[locale]} height="16" />
        <SelectValue>{languageNames[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(languageNames).map(([code, name]) => (
          <SelectItem
            key={code}
            value={code}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Flag code={languageFlags[code]} height="16" />
            <span>{name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
