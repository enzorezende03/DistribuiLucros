import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Language, getTranslation, languageLabels, languageFlags } from '@/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  cycleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const languageOrder: Language[] = ['pt', 'en', 'es'];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language') as Language | null;
    return saved && languageOrder.includes(saved) ? saved : 'pt';
  });

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  }, []);

  const cycleLanguage = useCallback(() => {
    const currentIndex = languageOrder.indexOf(language);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    handleSetLanguage(languageOrder[nextIndex]);
  }, [language, handleSetLanguage]);

  const t = useCallback((key: string) => getTranslation(language, key), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, cycleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
