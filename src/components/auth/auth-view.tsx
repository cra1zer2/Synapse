'use client'

import { useState } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
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
  onCancel,
  isSubView = false,
  lang,
  t
}: AuthViewProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const isEn = lang === 'en'

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

  return (
    <main className={`w-full min-h-screen bg-[var(--ios-bg)] flex flex-col justify-between px-5 sm:px-6 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.75rem)] max-w-[402px] mx-auto box-border select-none ${
      isSubView ? 'pt-[calc(env(safe-area-inset-top,0px)+8px)]' : 'pt-[max(calc(env(safe-area-inset-top,0px)+1rem),1.75rem)]'
    }`}>
      <header className="w-full h-[44px] flex items-center justify-between relative shrink-0">
        {authStep === 'preview' ? (
          <button
            type="button"
            onClick={onBackToInput}
            className="flex items-center gap-1 text-[17px] text-[var(--ios-blue)] font-normal leading-none active:opacity-60 transition-opacity cursor-pointer select-none z-10 -ml-1 pr-2 h-full"
          >
            <svg
              className="w-5 h-5 -ml-1 text-[var(--ios-blue)] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <svg
              className="w-5 h-5 -ml-1 text-[var(--ios-blue)] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{t.backAction}</span>
          </button>
        ) : (
          <div className="w-[70px] z-10" />
        )}

        <span className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] leading-none text-[var(--ios-label)] pointer-events-none">
          Synapse
        </span>

        <div className="w-[70px] z-10" />
      </header>

      <section className="w-full flex-1 flex flex-col justify-center py-4">
        {authStep === 'input' && (
          <div className="flex flex-col items-center text-center mb-7">
            <h1 className="text-[28px] font-bold text-[var(--ios-label)] tracking-[-0.5px] leading-tight">
              {isEn ? 'Sign In' : 'Zaloguj się'}
            </h1>
            <p className="text-[15px] font-normal text-[var(--ios-secondary)] mt-1.5 leading-snug max-w-[280px]">
              {t.loginSubtitle}
            </p>
          </div>
        )}

        {authError && authStep === 'input' && (
          <div className="bg-[var(--ios-red-subtle)] border border-[var(--ios-red)]/20 text-[var(--ios-red)] text-[13px] font-normal p-3.5 rounded-[16px] mb-4 text-center">
            {authError}
          </div>
        )}

        {authStep === 'input' && (
          <form onSubmit={onStartVerification} className="flex flex-col gap-4 w-full">
            <div className="w-full rounded-[14px] bg-[var(--ios-card-solid)] border border-[var(--ios-separator)]/70 relative flex flex-col overflow-hidden">
              {/* Login / Username field with fixed label and focus half */}
              <div
                onClick={() => {
                  document.getElementById('username-input')?.focus()
                }}
                className="relative h-[60px] w-full flex flex-col justify-center px-4 cursor-text border-b border-[var(--ios-separator)] select-none"
              >
                {isUsernameFocused && (
                  <div className="absolute inset-0 pointer-events-none rounded-t-[13px] border-2 border-[var(--ios-blue)] z-20" />
                )}

                <label
                  htmlFor="username-input"
                  className="text-[12px] font-normal text-[var(--ios-secondary)] pointer-events-none select-none leading-none tracking-tight mb-1"
                >
                  {t.loginPlaceholder}
                </label>
                <div className="relative w-full flex items-center">
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
                      className="absolute right-0 w-5 h-5 rounded-full bg-[var(--ios-secondary)]/35 hover:bg-[var(--ios-secondary)]/50 text-[var(--ios-card-solid)] flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer z-30"
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

              {/* Password field with fixed label and focus half */}
              <div
                onClick={() => {
                  document.getElementById('password-input')?.focus()
                }}
                className="relative h-[60px] w-full flex flex-col justify-center px-4 cursor-text select-none"
              >
                {isPasswordFocused && (
                  <div className="absolute inset-0 pointer-events-none rounded-b-[13px] border-2 border-[var(--ios-blue)] z-20" />
                )}

                <label
                  htmlFor="password-input"
                  className="text-[12px] font-normal text-[var(--ios-secondary)] pointer-events-none select-none leading-none tracking-tight mb-1"
                >
                  {t.passwordPlaceholder}
                </label>
                <div className="relative w-full flex items-center">
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
                      className="absolute right-0 text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:opacity-60 transition-opacity p-0.5 cursor-pointer shrink-0 z-30"
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
              className={`h-[50px] w-full rounded-full font-semibold text-[17px] tracking-[-0.3px] transition-all duration-150 flex items-center justify-center select-none mt-2 ${
                isFormValid
                  ? 'bg-[var(--ios-blue)] text-white active:scale-[0.985] active:opacity-90 cursor-pointer'
                  : 'bg-[var(--ios-element)] text-[var(--ios-secondary)]/50 cursor-not-allowed'
              }`}
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
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] border border-[var(--ios-blue)]/20 flex items-center justify-center font-semibold text-[26px]">
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
                onClick={onConfirmLogin}
                className="h-[52px] w-full bg-[var(--ios-blue)] text-white text-[17px] font-semibold tracking-[-0.3px] rounded-[16px] active:scale-[0.985] active:opacity-90 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none"
              >
                {t.confirmAndEnter}
              </button>
              <button
                type="button"
                onClick={onBackToInput}
                className="h-[52px] w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[16px] font-semibold tracking-[-0.2px] rounded-[16px] active:scale-[0.985] active:opacity-75 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none"
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

      {authStep !== 'input' && <div className="h-4 shrink-0" />}
    </main>
  )
}
