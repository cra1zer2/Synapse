'use client'

import { useState } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { cn } from '@/utils/cn.util'

interface AuthViewProps {
  authStep: 'input' | 'verifying' | 'preview'
  username: string
  setUsername: (u: string) => void
  password: string
  setPassword: (p: string) => void
  authError: string | null
  onClearError?: () => void
  verifiedCandidate: StudentProfile | null
  onStartVerification: (e: React.FormEvent) => void
  onConfirmLogin: () => void
  onBackToInput: () => void
  onCancel?: () => void
  isSubView?: boolean
  lang: AppLanguage
  onSelectLanguage?: (lang: AppLanguage) => void
  t: AppDictionary
}

function resolveAvatarLetter(fullName: string | undefined, username: string, role: 'student' | 'parent'): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return fullName.slice(0, 2).toUpperCase()
  }
  return role === 'parent' ? 'R' : 'U'
}

function resolveAccountTitle(fullName: string | undefined, username: string, role: 'student' | 'parent', t: AppDictionary): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    return fullName
  }
  return role === 'parent' ? t.parentRoleTitle : t.studentRoleTitle
}

function parseAuthErrorAction(error: string | null): { title: string; body: string; actionUrl: string | null; actionLabel: string | null } {
  if (!error) return { title: 'Błąd logowania', body: '', actionUrl: null, actionLabel: null }
  const lower = error.toLowerCase()

  if (lower.includes('wyciek') || lower.includes('leaked')) {
    return {
      title: 'Wymagana zmiana hasła',
      body: error,
      actionUrl: 'https://synergia.librus.pl',
      actionLabel: 'Otwórz synergia.librus.pl'
    }
  }
  if (lower.includes('pierwsz') || lower.includes('nowego hasła') || lower.includes('reset')) {
    return {
      title: 'Wymagana zmiana hasła',
      body: error,
      actionUrl: 'https://synergia.librus.pl',
      actionLabel: 'Otwórz synergia.librus.pl'
    }
  }
  if (lower.includes('cloudflare') || lower.includes('turnstile') || lower.includes('za dużo nieudanych')) {
    return {
      title: 'Weryfikacja Cloudflare',
      body: error,
      actionUrl: 'https://synergia.librus.pl',
      actionLabel: 'Przejdź do portalu'
    }
  }
  if (lower.includes('regulamin') || lower.includes('zgód') || lower.includes('dokończ')) {
    return {
      title: 'Akceptacja w Synergii',
      body: error,
      actionUrl: 'https://synergia.librus.pl',
      actionLabel: 'Otwórz synergia.librus.pl'
    }
  }
  if (lower.includes('termin ważności') || lower.includes('nieaktywn')) {
    return {
      title: 'Konto nieaktywne',
      body: error,
      actionUrl: null,
      actionLabel: null
    }
  }
  return {
    title: 'Błąd logowania',
    body: error,
    actionUrl: null,
    actionLabel: null
  }
}

export function AuthView({
  authStep,
  username,
  setUsername,
  password,
  setPassword,
  authError,
  onClearError,
  verifiedCandidate,
  onStartVerification,
  onConfirmLogin,
  onBackToInput,
  onCancel,
  isSubView = false,
  lang,
  t
}: AuthViewProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const isEn = lang === 'en'

  const activeError = authError && authError !== dismissedError ? authError : null
  const parsedError = parseAuthErrorAction(activeError)

  const handleCloseErrorModal = () => {
    if (authError) setDismissedError(authError)
    if (onClearError) onClearError()
  }

  const handleAnimatedConfirmLogin = () => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => {
      onConfirmLogin()
    }, 280)
  }

  const avatarLetter = verifiedCandidate
    ? resolveAvatarLetter(verifiedCandidate.fullName, username, verifiedCandidate.role)
    : 'U'
  const candidateTitle = verifiedCandidate
    ? resolveAccountTitle(verifiedCandidate.fullName, username, verifiedCandidate.role, t)
    : ''
  const roleLabel = verifiedCandidate
    ? (verifiedCandidate.role === 'student' ? t.studentRole : t.parentRole)
    : ''

  const isFormValid = username.trim().length > 0 && password.trim().length > 0
  const isUsernameFloating = isUsernameFocused || username.length > 0
  const isPasswordFloating = isPasswordFocused || password.length > 0

  return (
    <main className={cn(
      'w-full flex flex-col justify-between max-w-[480px] mx-auto box-border select-none relative',
      isSubView
        ? 'py-4 px-1 min-h-full flex-1'
        : 'fixed inset-0 w-screen h-[100dvh] overflow-y-auto touch-pan-y md:static md:w-full md:h-auto md:min-h-screen bg-[var(--ios-bg)] px-5 sm:px-6 pt-[max(calc(env(safe-area-inset-top,0px)+1rem),1.75rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.75rem)]'
    )}>
      {!isSubView && (
        <header className="w-full h-[44px] flex items-center justify-between relative shrink-0">
          {authStep === 'preview' ? (
            <button
              type="button"
              onClick={onBackToInput}
              className="flex items-center gap-1 text-[17px] text-[var(--ios-blue)] font-normal leading-none active:opacity-60 transition-opacity cursor-pointer select-none z-10 -ml-1 pr-2 h-full"
            >
              <svg className="w-5 h-5 -ml-1 text-[var(--ios-blue)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{t.backAction}</span>
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 text-[17px] text-[var(--ios-blue)] font-normal leading-none active:opacity-60 transition-opacity cursor-pointer select-none z-10 -ml-1 pr-2 h-full"
            >
              <svg className="w-5 h-5 -ml-1 text-[var(--ios-blue)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{t.cancel || t.backAction}</span>
            </button>
          ) : (
            <div className="w-[70px] z-10" />
          )}

          <span className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] leading-none text-[var(--ios-label)] pointer-events-none">
            Synapse
          </span>

          <div className="w-[70px] z-10" />
        </header>
      )}

      <section className={cn('w-full flex-1 flex flex-col justify-center', isSubView ? 'py-4' : 'py-6')}>
        {authStep === 'input' && (
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="text-[26px] font-bold text-[var(--ios-label)] tracking-[-0.5px] leading-tight">
              {isSubView ? t.addAccount : (isEn ? 'Sign In' : 'Zaloguj się')}
            </h1>
            <p className="text-[14px] font-normal text-[var(--ios-secondary)] mt-1.5 leading-snug max-w-[280px]">
              {t.loginSubtitle}
            </p>
          </div>
        )}

        {authStep === 'input' && (
          <form onSubmit={onStartVerification} className="flex flex-col gap-4 w-full">
            <div className="w-full rounded-[24px] bg-[var(--ios-card-solid)] border border-[var(--ios-card-border)] relative flex flex-col">
              <div
                onClick={() => document.getElementById('username-input')?.focus()}
                className={cn(
                  'relative h-[62px] w-full flex items-center px-4 cursor-text rounded-t-[24px] border-2 transition-colors duration-200 select-none',
                  isUsernameFocused ? 'border-[var(--ios-blue)] z-20' : 'border-transparent z-10'
                )}
              >
                <label
                  htmlFor="username-input"
                  className={cn(
                    'absolute left-4 pointer-events-none select-none origin-left transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] text-[var(--ios-secondary)]',
                    isUsernameFloating
                      ? 'top-[9px] translate-y-0 text-[11px] font-medium tracking-tight leading-none'
                      : 'top-1/2 -translate-y-1/2 text-[16px] font-normal tracking-[-0.2px] leading-none'
                  )}
                >
                  {t.loginPlaceholder}
                </label>
                <div className="relative w-full flex items-center pt-3.5">
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setIsUsernameFocused(true)}
                    onBlur={() => setIsUsernameFocused(false)}
                    className="w-full bg-transparent text-[17px] font-normal text-[var(--ios-label)] outline-none tracking-[-0.3px] leading-tight pr-7"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    autoComplete="username"
                  />
                  {username.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUsername('')
                        document.getElementById('username-input')?.focus()
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--ios-tertiary)] text-[var(--ios-card-solid)] flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer z-30"
                      tabIndex={-1}
                      aria-label="Clear username"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'h-[1px] mx-4 bg-[var(--ios-separator)] transition-opacity duration-150',
                  isUsernameFocused || isPasswordFocused ? 'opacity-0' : 'opacity-100'
                )}
              />

              <div
                onClick={() => document.getElementById('password-input')?.focus()}
                className={cn(
                  'relative h-[62px] w-full flex items-center px-4 cursor-text rounded-b-[24px] border-2 transition-colors duration-200 select-none',
                  isPasswordFocused ? 'border-[var(--ios-blue)] z-20' : 'border-transparent z-10'
                )}
              >
                <label
                  htmlFor="password-input"
                  className={cn(
                    'absolute left-4 pointer-events-none select-none origin-left transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] text-[var(--ios-secondary)]',
                    isPasswordFloating
                      ? 'top-[9px] translate-y-0 text-[11px] font-medium tracking-tight leading-none'
                      : 'top-1/2 -translate-y-1/2 text-[16px] font-normal tracking-[-0.2px] leading-none'
                  )}
                >
                  {t.passwordPlaceholder}
                </label>
                <div className="relative w-full flex items-center pt-3.5">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="w-full bg-transparent text-[17px] font-normal text-[var(--ios-label)] outline-none tracking-[-0.3px] leading-tight pr-7"
                    required
                    autoComplete="current-password"
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPassword(!showPassword)
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:opacity-60 transition-opacity p-0.5 cursor-pointer shrink-0 z-30"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="2" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className={cn(
                'h-[50px] w-full rounded-full font-semibold text-[17px] tracking-[-0.3px] transition-all duration-150 flex items-center justify-center select-none mt-1',
                isFormValid
                  ? 'bg-[var(--ios-blue)] text-white active:scale-[0.97] cursor-pointer'
                  : 'bg-[var(--ios-element)] text-[var(--ios-tertiary)] cursor-not-allowed'
              )}
            >
              {t.verifyButton}
            </button>
          </form>
        )}

        {authStep === 'verifying' && (
          <div className="py-20 flex flex-col items-center justify-center">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
          </div>
        )}

        {authStep === 'preview' && verifiedCandidate && (
          <div
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'scale3d(0.96, 0.96, 1)' : 'scale3d(1, 1, 1)',
              transition: 'opacity 0.26s cubic-bezier(0.32, 0.72, 0, 1), transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)',
              willChange: 'opacity, transform'
            }}
            className="flex flex-col items-center gap-5 w-full animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center font-semibold text-[26px]">
                  {avatarLetter}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--ios-green)] text-white flex items-center justify-center border-2 border-[var(--ios-bg)]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <h2 className="text-[22px] font-bold text-[var(--ios-label)] tracking-[-0.4px] leading-tight px-2 break-words">
                {candidateTitle}
              </h2>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] mt-1 tracking-[-0.1px]">
                {t.accountVerified}
              </p>
            </div>

            <IosListSection header={isEn ? 'Account details' : 'Dane konta'} className="w-full">
              <IosCell
                title={isEn ? 'Role' : 'Rola'}
                detail={
                  <span className="font-medium text-[var(--ios-label)] text-[15px]">
                    {roleLabel}
                  </span>
                }
                size="standard"
              />
              {verifiedCandidate.className ? (
                <IosCell
                  title={isEn ? 'Class' : 'Klasa'}
                  detail={verifiedCandidate.className}
                  size="standard"
                />
              ) : null}
              {verifiedCandidate.schoolName ? (
                <IosCell
                  title={isEn ? 'School' : 'Szkoła'}
                  detail={
                    <span className="max-w-[200px] truncate text-right block" title={verifiedCandidate.schoolName}>
                      {verifiedCandidate.schoolName}
                    </span>
                  }
                  size="standard"
                />
              ) : null}
              <IosCell
                title="Login"
                detail={username}
                size="standard"
              />
              {verifiedCandidate.luckyNumber !== null && verifiedCandidate.luckyNumber !== undefined ? (
                <IosCell
                  title={isEn ? 'Lucky number' : 'Szczęśliwy numerek'}
                  detail={
                    <span className="font-semibold text-[var(--ios-blue)]">
                      #{verifiedCandidate.luckyNumber}
                    </span>
                  }
                  size="standard"
                />
              ) : null}
            </IosListSection>

            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                type="button"
                onClick={handleAnimatedConfirmLogin}
                className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[17px] font-semibold tracking-[-0.3px] rounded-full active:scale-[0.97] transition-transform duration-150 flex items-center justify-center cursor-pointer select-none"
              >
                {t.confirmAndEnter}
              </button>
              <button
                type="button"
                onClick={onBackToInput}
                className="h-[50px] w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[17px] font-medium tracking-[-0.2px] rounded-full active:scale-[0.97] transition-transform duration-150 flex items-center justify-center cursor-pointer select-none"
              >
                {t.changeData}
              </button>
            </div>
          </div>
        )}
      </section>

      {authStep === 'input' && (
        <footer className="w-full pt-4 pb-1 flex items-center justify-center gap-1.5 text-center text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight shrink-0">
          <svg className="w-3.5 h-3.5 opacity-60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            {isEn
              ? 'Credentials stored locally on your device'
              : 'Dane logowania zapisywane tylko na Twoim urządzeniu'}
          </span>
        </footer>
      )}

      {activeError && (
        <div
          onClick={handleCloseErrorModal}
          className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-6 select-none ios-modal-backdrop-animate-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[308px] bg-[var(--ios-card-solid)] rounded-[34px] p-[16px] pt-[22px] border border-[var(--ios-border)] flex flex-col gap-5 text-center -mt-10 md:-mt-14 shadow-2xl ios-modal-animate-in"
          >
            <div className="px-3 flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center font-bold text-[18px] mb-1',
                parsedError.actionUrl
                  ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] border border-[var(--ios-blue)]/20'
                  : 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/20'
              )}>
                {parsedError.actionUrl ? '!' : '!'}
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] leading-snug">
                {parsedError.title}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-snug">
                {parsedError.body}
              </p>
            </div>

            <div className={cn('flex flex-col gap-2', parsedError.actionUrl ? 'w-full' : 'w-full')}>
              {parsedError.actionUrl && (
                <a
                  href={parsedError.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-[48px] w-full rounded-full bg-[var(--ios-blue)] text-white text-[16px] font-semibold tracking-[-0.3px] active:scale-[0.96] active:opacity-85 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none"
                >
                  {parsedError.actionLabel || 'Otwórz stronę'}
                </a>
              )}
              <button
                type="button"
                onClick={handleCloseErrorModal}
                className={cn(
                  'h-[48px] w-full rounded-full text-[16px] tracking-[-0.3px] active:scale-[0.96] transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none',
                  parsedError.actionUrl
                    ? 'bg-[var(--ios-element)] text-[var(--ios-label)] font-medium active:opacity-75'
                    : 'bg-[var(--ios-blue)] text-white font-semibold active:opacity-85'
                )}
              >
                {parsedError.actionUrl ? (t.close || 'Zamknij') : (t.gotIt || 'Rozumiem')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
