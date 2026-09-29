import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'

interface LanguageSelectorModalProps {
  isOpen: boolean
  onClose?: () => void
  isInitial?: boolean
}

export const languages = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
]

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  isInitial = false,
}) => {
  const { i18n, t } = useTranslation()

  if (!isOpen) return null

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('borkonya_lang_selected', 'true')
    localStorage.setItem('i18nextLng', code)
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-amber-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Globe className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('language.selectTitle', 'Choose your language')}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {t('language.selectSubtitle', 'Welcome to BorKonya. Find a meaningful connection within your community.')}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2.5">
          {languages.map((lang) => {
            const isSelected = i18n.language.startsWith(lang.code)
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-800 hover:bg-amber-50/80 hover:text-slate-900 border border-slate-200/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl" role="img" aria-label={lang.label}>
                    {lang.flag}
                  </span>
                  <div>
                    <span className="block font-semibold text-base">{lang.native}</span>
                    <span className={`text-xs ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                      {lang.label}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 text-amber-400" />}
              </button>
            )
          })}
        </div>

        {!isInitial && onClose && (
          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-4"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
