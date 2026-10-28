'use client'

import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'

interface AuthViewProps {
  authStep: 'input' | 'verifying' | 'preview'
  username: string
  setUsername: (u: string) => void
  password: string
  setPassword: (p: string) => void
  authError: string | null
  verifiedCandidate: StudentProfile | null
  onStartVerification: (e: React.FormEvent) => void
  onConfirmLogin: () => void
  onBackToInput: () => void
  lang: AppLanguage
  onSelectLanguage: (lang: AppLanguage) => void
  t: AppDictionary
}

export function AuthView({
  authStep,
  username,
  setUsername,
  password,
  setPassword,
  authError,
  verifiedCandidate,
  onStartVerification,
  onConfirmLogin,
  onBackToInput,
  lang,
  onSelectLanguage,
  t
}: AuthViewProps) {
  const isEn = lang === 'en'

  return (
    <main className="w-full min-h-screen bg-[var(--ios-bg)] flex flex-col justify-between px-4 sm:px-6 pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] max-w-[402px] mx-auto box-border select-none">
      <header className="w-full flex items-center justify-between">
        <span className="text-[17px] font-semibold tracking-[-0.4px] text-[var(--ios-label)]">Synapse</span>
        <IosSegmentedControl<AppLanguage>
          size="compact"
          value={lang}
          onChange={onSelectLanguage}
          options={[
            { id: 'pl', label: 'PL' },
            { id: 'en', label: 'EN' }
          ]}
          className="w-[100px]"
        />
      </header>

      <section className="w-full flex-1 flex flex-col justify-center max-w-[360px] mx-auto py-8">
        <div className="flex flex-col mb-7">
          <h1 className="text-[28px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] leading-tight">
            {isEn ? 'Sign In' : 'Zaloguj się'}
          </h1>
          <p className="text-[15px] font-normal text-[var(--ios-secondary)] mt-1.5 leading-snug">
            {isEn ? 'with your Librus Synergia account' : 'kontem Librus Synergia'}
          </p>
        </div>

        {authError && (
          <div className="bg-[var(--ios-red-subtle)] border border-[var(--ios-red)]/20 text-[var(--ios-red)] text-[13px] font-normal p-3.5 rounded-[16px] mb-4 text-center">
            {authError}
          </div>
        )}

        {authStep === 'input' && (
          <form onSubmit={onStartVerification} className="flex flex-col gap-4">
            <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
              <div className="px-4 py-3.5 flex items-center gap-3">
                <span className="w-16 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">Login</span>
                <input
                  type="text"
                  placeholder={t.loginPlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-normal text-[var(--ios-label)] outline-none placeholder-[var(--ios-secondary)]/50"
                  required
                />
              </div>
              <div className="px-4 py-3.5 flex items-center gap-3">
                <span className="w-16 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">Hasło</span>
                <input
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-normal text-[var(--ios-label)] outline-none placeholder-[var(--ios-secondary)]/50"
                  required
                />
              </div>
            </IosCard>

            <button
              type="submit"
              className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[16px] font-medium tracking-[-0.2px] rounded-[16px] active:scale-[0.98] transition-transform flex items-center justify-center cursor-pointer mt-1"
            >
              {t.verifyButton}
            </button>
          </form>
        )}

        {authStep === 'verifying' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
            <p className="text-[13px] font-normal text-[var(--ios-secondary)]">{t.verifyingAccount}</p>
          </div>
        )}

        {authStep === 'preview' && verifiedCandidate && (
          <div className="flex flex-col gap-4">
            <IosCard className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--ios-green)]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{t.accountVerified}</span>
              </div>
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-[-0.2px] mt-1">{verifiedCandidate.fullName}</h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)]">
                {verifiedCandidate.className} • {verifiedCandidate.schoolName}
              </p>
            </IosCard>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                type="button"
                onClick={onConfirmLogin}
                className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[16px] font-medium rounded-[16px] active:scale-[0.98] transition-transform flex items-center justify-center cursor-pointer"
              >
                {t.confirmAndEnter}
              </button>
              <button
                type="button"
                onClick={onBackToInput}
                className="h-[50px] w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[15px] font-normal rounded-[16px] active:scale-[0.98] transition-transform flex items-center justify-center cursor-pointer"
              >
                {t.changeData}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="h-4" />
    </main>
  )
}
