// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './i18n/locales/en';
import ar from './i18n/locales/ar';
import de from './i18n/locales/de';
import es from './i18n/locales/es';
import fr from './i18n/locales/fr';
import it from './i18n/locales/it';
import ko from './i18n/locales/ko';
import pt from './i18n/locales/pt';
import ru from './i18n/locales/ru';
import tr from './i18n/locales/tr';
import vi from './i18n/locales/vi';
import ja from './i18n/locales/ja';
import id from './i18n/locales/id';
import th from './i18n/locales/th';
import pl from './i18n/locales/pl';
import zh from './i18n/locales/zh';
import ro from './i18n/locales/ro';
import hi from './i18n/locales/hi';
import af from './i18n/locales/af';
import hu from './i18n/locales/hu';
import ua from './i18n/locales/ua';
import ph from './i18n/locales/ph';
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      ko: { translation: ko },
      pt: { translation: pt },
      ru: { translation: ru },
      tr: { translation: tr },
      vi: { translation: vi },
      ja: { translation: ja },
      id: { translation: id },
      th: { translation: th },
      pl: { translation: pl },
      zh: { translation: zh },
      ro: { translation: ro },
      hi: { translation: hi },
      af: { translation: af },
      hu: { translation: hu },
      ua: { translation: ua },
      ph: { translation: ph },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;