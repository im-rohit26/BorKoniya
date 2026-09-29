import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '../locales/en/common.json'
import hiCommon from '../locales/hi/common.json'
import orCommon from '../locales/or/common.json'
import bnCommon from '../locales/bn/common.json'

export const defaultNS = 'common'
export const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  or: { common: orCommon },
  bn: { common: bnCommon },
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS,
    resources,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
