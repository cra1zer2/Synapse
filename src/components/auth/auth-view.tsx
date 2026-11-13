'use client'

import React, { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Lock, User, GraduationCap, AlertTriangle } from 'lucide-react'
import { StudentProfile } from '@/models/account.model'
import { AppLanguage, AppDictionary } from '@/config/dictionary.config'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { IosAlert } from '@/components/ios/ios-alert'
import { IosButton } from '@/components/ios/ios-button'
import { IosBadge } from '@/components/ios/ios-badge'
import { IosSegmentedControl } from '@/components/ios/ios-ui'
import { resolveAvatarLetter as buildAvatarInitials, sanitizeAccountLabel } from '@/utils/account.util'
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

function getPreviewAvatarText(
  fullName: string | undefined,
  username: string,
  role: 'student' | 'parent'
): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    return buildAvatarInitials(fullName, username)
  }
  return role === 'student' ? 'U' : 'R'
}

interface ParsedAuthError {
  title: string
  message: string
  actionHint: string
  fieldFocus?: 'username' | 'password'
}

function parseAuthErrorAction(raw: string, lang: AppLanguage): ParsedAuthError {
  const isEn = lang === 'en'
  const lower = raw.toLowerCase()

  if (lower.includes('już dodane') || lower.includes('already added')) {
    return {
      title: isEn ? 'Account already added' : 'Konto jest już dodane',
      message: isEn
        ? 'This account is already saved on this device. Switch to it directly in Settings.'
        : 'To konto jest już zapisane na tym urządzeniu. Możesz przełączyć się na nie w Ustawieniach.',
      actionHint: isEn ? 'Change login' : 'Zmień login',
      fieldFocus: 'username'
    }
  }

  if (
    lower.includes('401') ||
    lower.includes('hasło') ||
    lower.includes('login') ||
    lower.includes('błędn') ||
    lower.includes('nieprawidłow') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid') ||
    lower.includes('dane')
  ) {
    return {
      title: isEn ? 'Sign-in failed' : 'Nieudane logowanie',
      message: isEn
        ? 'Your Synergia username or password is incorrect. Double check case sensitivity and your student ID suffix ("u").'
        : 'Podany login lub hasło do Librus Synergia są nieprawidłowe. Sprawdź wielkość liter oraz końcówkę „u” przy koncie ucznia.',
      actionHint: isEn ? 'Re-enter password' : 'Wpisz hasło ponownie',
      fieldFocus: 'password'
    }
  }

  if (
    lower.includes('timeout') ||
    lower.includes('czas') ||
    lower.includes('sieci') ||
    lower.includes('fetch') ||
    lower.includes('econn') ||
    lower.includes('network')
  ) {
    return {
      title: isEn ? 'Librus connection timeout' : 'Problem z połączeniem',
      message: isEn
        ? 'Librus Synergia took too long to respond or the connection dropped. Try again in a moment.'
        : 'Serwery Librus Synergia nie odpowiadają lub połączenie zostało przerwane. Spróbuj ponownie za chwilę.',
      actionHint: isEn ? 'Try again' : 'Spróbuj ponownie'
    }
  }

  if (lower.includes('zmiany hasła') || lower.includes('passwordchange')) {
    return {
      title: isEn ? 'Password update required' : 'Wymagana zmiana hasła',
      message: isEn
        ? 'Librus requires you to update your password on synergia.librus.pl before signing in here.'
        : 'System Librus wymaga zmiany hasła bezpośrednio na stronie synergia.librus.pl przed zalogowaniem tutaj.',
      actionHint: 'OK'
    }
  }

  return {
    title: isEn ? 'Verification failed' : 'Błąd weryfikacji',
    message: raw,
    actionHint: isEn ? 'Fix details' : 'Popraw dane'
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
  onSelectLanguage,
  t
}: AuthViewProps) {
  const [displayLang, setDisplayLang] = useState<AppLanguage>(lang)
  const [isLangFading, setIsLangFading] = useState(false)
  const isDisplayEn = displayLang === 'en'
  const [showPassword, setShowPassword] = useState(false)
  const [isUserFocused, setIsUserFocused] = useState(false)
  const [isPassFocused, setIsPassFocused] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)
  const [isPortalReady, setIsPortalReady] = useState(false)

  const usernameInputId = useId()
  const passwordInputId = useId()
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const displayLangRef = useRef<AppLanguage>(lang)
  const langTimerRef = useRef<NodeJS.Timeout | null>(null)
  const langRafRef = useRef<number | null>(null)

  useEffect(() => {
    setIsPortalReady(true)
  }, [])

  useEffect(() => {
    if (langTimerRef.current) clearTimeout(langTimerRef.current)
    if (langRafRef.current !== null) cancelAnimationFrame(langRafRef.current)

    if (lang === displayLangRef.current) {
      setIsLangFading(false)
      return
    }

    setIsLangFading(true)
    langTimerRef.current = setTimeout(() => {
      displayLangRef.current = lang
      setDisplayLang(lang)
      langRafRef.current = requestAnimationFrame(() => {
        langRafRef.current = requestAnimationFrame(() => {
          setIsLangFading(false)
        })
      })
    }, 125)

    return () => {
      if (langTimerRef.current) clearTimeout(langTimerRef.current)
      if (langRafRef.current !== null) cancelAnimationFrame(langRafRef.current)
    }
  }, [lang])

  useEffect(() => {
    setDismissedError(false)
  }, [authError])

  useEffect(() => {
    if (authStep !== 'preview') {
      setIsExiting(false)
    }
    if (authStep !== 'input') {
      setIsUserFocused(false)
      setIsPassFocused(false)
    }
    if (authStep === 'preview' && typeof window !== 'undefined') {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      window.scrollTo(0, 0)
      requestAnimationFrame(() => window.scrollTo(0, 0))
    }
  }, [authStep])

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  const isVerifying = authStep === 'verifying'
  const isUserFloated = isUserFocused || username.length > 0
  const isPassFloated = isPassFocused || password.length > 0
  const candidateClassName = sanitizeAccountLabel(verifiedCandidate?.className)
  const candidateSchoolName = sanitizeAccountLabel(verifiedCandidate?.schoolName)
  const canSubmit = username.trim().length > 0 && password.length > 0 && !isVerifying
  const parsedError = authError && !dismissedError ? parseAuthErrorAction(authError, lang) : null

  const dismissModal = (targetFocus?: 'username' | 'password') => {
    setDismissedError(true)
    if (onClearError) onClearError()
    if (targetFocus === 'username') {
      requestAnimationFrame(() => usernameRef.current?.focus())
    } else if (targetFocus === 'password') {
      setPassword('')
      requestAnimationFrame(() => passwordRef.current?.focus())
    }
  }

  const handleConfirmClick = () => {
    if (isExiting) return
    setIsExiting(true)
    if (typeof window !== 'undefined') {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      window.scrollTo(0, 0)
    }
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    exitTimerRef.current = setTimeout(() => {
      onConfirmLogin()
    }, 240)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    usernameRef.current?.blur()
    passwordRef.current?.blur()
    onStartVerification(e)
  }

  const langContentClass = cn(
    'w-full flex-1 flex flex-col justify-between transition-[opacity,transform]',
    isLangFading
      ? 'opacity-0 scale-[0.985] translate-y-[4px] duration-[120ms] ease-out pointer-events-none'
      : 'opacity-100 scale-100 translate-y-0 duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
  )

  const containerClass = isSubView
    ? 'w-full bg-[var(--ios-bg)] text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 pt-3 pb-8 select-none'
    : 'w-full min-h-[100lvh] min-h-[100dvh] md:fixed md:inset-0 bg-[var(--ios-bg)] text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 pt-[calc(var(--ios-header-pad-top)+38px+var(--ios-header-pad-bottom))] sm:p-5 md:pt-5 md:overflow-y-auto select-none'

  const languageToggle = onSelectLanguage ? (
    <IosSegmentedControl<AppLanguage>
      size="compact"
      value={lang}
      onChange={onSelectLanguage}
      options={[
        { id: 'pl', label: 'PL' },
        { id: 'en', label: 'EN' }
      ]}
      className="w-[100px] border border-[var(--ios-glass-border)] shadow-[var(--ios-glass-shadow)]"
    />
  ) : null

  const mobileAuthTopbar =
    !isSubView && isPortalReady
      ? createPortal(
          <div className="ios-auth-topbar md:hidden">
            <div className="w-full max-w-[380px] mx-auto flex justify-end">{languageToggle}</div>
          </div>,
          document.body
        )
      : null

  return (
    <div
      className={cn(
        containerClass,
        'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isExiting && 'opacity-0 scale-[0.98]'
      )}
    >
      {mobileAuthTopbar}
      {!isSubView && (
        <div className="hidden md:flex w-full max-w-[380px] mx-auto justify-end shrink-0 ios-auth-topbar">
          {languageToggle}
        </div>
      )}

      <div className={langContentClass}>
        <div className="w-full max-w-[380px] mx-auto flex flex-col items-center my-auto py-4">
          <div className="flex flex-col items-center text-center mb-6 ios-reveal">
            <div className="w-[62px] h-[62px] rounded-[18px] bg-[var(--ios-blue)] flex items-center justify-center mb-3.5 text-white">
              <GraduationCap className="w-8 h-8 stroke-[2]" />
            </div>
            <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] text-[var(--ios-label)] leading-tight">
              {isSubView ? (isDisplayEn ? 'Add Account' : 'Dodaj konto') : 'Synapse'}
            </h1>
            <p className="text-[13px] font-normal text-[var(--ios-secondary)] mt-1 max-w-[260px] min-h-[36px] flex items-center justify-center leading-snug">
              {isSubView
                ? isDisplayEn
                  ? 'Connect another Librus Synergia student or parent account.'
                  : 'Połącz kolejne konto ucznia lub rodzica z Librus Synergia.'
                : isDisplayEn
                  ? 'Your private, fast iOS-native dashboard for Librus Synergia.'
                  : 'Twój prywatny i szybki dziennik Librus Synergia.'}
            </p>
          </div>

          {(authStep === 'input' || authStep === 'verifying') && (
            <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-3.5 ios-reveal">
              <div className="ios-card rounded-[26px] overflow-hidden">
                <div className="relative px-4 h-[52px] flex items-center gap-3">
                  <User
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-200',
                      isUserFocused ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-secondary)]'
                    )}
                  />
                  <div className="relative flex-1 h-full">
                    <input
                      id={usernameInputId}
                      ref={usernameRef}
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="username"
                      spellCheck={false}
                      disabled={isVerifying}
                      value={username}
                      onFocus={() => setIsUserFocused(true)}
                      onBlur={() => setIsUserFocused(false)}
                      onChange={(e) => setUsername(e.target.value)}
                      className="peer w-full h-full pt-[21px] pb-[5px] bg-transparent text-[15px] leading-[22px] text-[var(--ios-label)] outline-none disabled:opacity-50"
                    />
                    <label
                      htmlFor={usernameInputId}
                      className={cn(
                        'pointer-events-none absolute top-0 left-0 right-0 text-[15px] leading-[20px] font-normal truncate select-none origin-top-left transition-[transform,color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
                        isUserFloated
                          ? 'translate-y-[7px] scale-[0.7333]'
                          : 'translate-y-[16px] scale-100 peer-[:-webkit-autofill]:translate-y-[7px] peer-[:-webkit-autofill]:scale-[0.7333]',
                        isUserFocused
                          ? 'text-[var(--ios-blue)]'
                          : isUserFloated
                            ? 'text-[var(--ios-secondary)]'
                            : 'text-[var(--ios-tertiary)]'
                      )}
                    >
                      {isDisplayEn ? 'Synergia login (e.g. 1234567u)' : 'Login Synergia (np. 1234567u)'}
                    </label>
                  </div>
                  <div className="absolute bottom-0 left-11 right-4 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
                </div>

                <div className="relative px-4 h-[52px] flex items-center gap-3">
                  <Lock
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-200',
                      isPassFocused ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-secondary)]'
                    )}
                  />
                  <div className="relative flex-1 h-full">
                    <input
                      id={passwordInputId}
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={isVerifying}
                      value={password}
                      onFocus={() => setIsPassFocused(true)}
                      onBlur={() => setIsPassFocused(false)}
                      onChange={(e) => setPassword(e.target.value)}
                      className="peer w-full h-full pt-[21px] pb-[5px] bg-transparent text-[15px] leading-[22px] text-[var(--ios-label)] outline-none disabled:opacity-50"
                    />
                    <label
                      htmlFor={passwordInputId}
                      className={cn(
                        'pointer-events-none absolute top-0 left-0 right-0 text-[15px] leading-[20px] font-normal truncate select-none origin-top-left transition-[transform,color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
                        isPassFloated
                          ? 'translate-y-[7px] scale-[0.7333]'
                          : 'translate-y-[16px] scale-100 peer-[:-webkit-autofill]:translate-y-[7px] peer-[:-webkit-autofill]:scale-[0.7333]',
                        isPassFocused
                          ? 'text-[var(--ios-blue)]'
                          : isPassFloated
                            ? 'text-[var(--ios-secondary)]'
                            : 'text-[var(--ios-tertiary)]'
                      )}
                    >
                      {isDisplayEn ? 'Password' : 'Hasło'}
                    </label>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isVerifying}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer shrink-0 transition-colors"
                    aria-label={
                      isDisplayEn
                        ? showPassword
                          ? 'Hide password'
                          : 'Show password'
                        : showPassword
                          ? 'Ukryj hasło'
                          : 'Pokaż hasło'
                    }
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <IosButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canSubmit}
                  loading={isVerifying}
                >
                  {isVerifying
                    ? isDisplayEn
                      ? 'Verifying...'
                      : 'Weryfikacja konta...'
                    : isSubView
                      ? isDisplayEn
                        ? 'Add Account'
                        : 'Dodaj konto'
                      : isDisplayEn
                        ? 'Sign In'
                        : 'Zaloguj się'}
                </IosButton>

                {isSubView && onCancel && (
                  <IosButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={onCancel}
                    disabled={isVerifying}
                  >
                    {isDisplayEn ? 'Cancel' : 'Anuluj'}
                  </IosButton>
                )}
              </div>
            </form>
          )}

          {authStep === 'preview' && verifiedCandidate && (
            <div className="w-full flex flex-col items-center gap-5 ios-reveal">
              <div className="w-[74px] h-[74px] rounded-full bg-[var(--ios-blue)] text-white flex items-center justify-center text-[25px] font-bold">
                {getPreviewAvatarText(verifiedCandidate.fullName, username, verifiedCandidate.role)}
              </div>

              <div className="text-center flex flex-col items-center gap-1.5">
                <h2 className="text-[21px] font-bold text-[var(--ios-label)] tracking-[-0.02em] leading-tight">
                  {verifiedCandidate.fullName}
                </h2>
                <IosBadge
                  variant={verifiedCandidate.role === 'student' ? 'blue' : 'green'}
                  size="md"
                  text={
                    verifiedCandidate.role === 'student'
                      ? isDisplayEn
                        ? 'Student Account'
                        : 'Konto ucznia'
                      : isDisplayEn
                        ? 'Parent Account'
                        : 'Konto rodzica'
                  }
                />
              </div>

              <IosListSection header={isDisplayEn ? 'Account details' : 'Dane konta'} className="w-full">
                <IosCell
                  title={isDisplayEn ? 'Username' : 'Login'}
                  detail={username.trim()}
                  compact
                />
                {candidateClassName && (
                  <IosCell
                    title={isDisplayEn ? 'Class' : 'Klasa'}
                    detail={candidateClassName}
                    compact
                  />
                )}
                {candidateSchoolName && (
                  <IosCell
                    title={isDisplayEn ? 'School' : 'Szkoła'}
                    subtitle={candidateSchoolName}
                    compact
                  />
                )}
              </IosListSection>

              <div className="w-full flex flex-col gap-2.5">
                <IosButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleConfirmClick}
                  disabled={isExiting}
                >
                  {isSubView
                    ? isDisplayEn
                      ? 'Save Account'
                      : 'Zapisz konto'
                    : isDisplayEn
                      ? 'Continue'
                      : 'Kontynuuj'}
                </IosButton>
                <IosButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={onBackToInput}
                  disabled={isExiting}
                >
                  {isDisplayEn ? 'Change Account' : 'Zmień konto'}
                </IosButton>
              </div>
            </div>
          )}
        </div>

        {!isSubView && (
          <div className="w-full max-w-[380px] mx-auto text-center pb-[max(env(safe-area-inset-bottom,0px),12px)] pt-3 shrink-0">
            <p className="text-[11px] font-normal text-[var(--ios-tertiary)] leading-relaxed min-h-[36px] flex items-center justify-center">
              {isDisplayEn
                ? 'Credentials stay locally on this device and are sent only during Librus sync.'
                : 'Dane logowania pozostają wyłącznie na tym urządzeniu.'}
            </p>
          </div>
        )}
      </div>

      <IosAlert
        isOpen={Boolean(parsedError)}
        onClose={() => dismissModal()}
        title={parsedError?.title || ''}
        message={parsedError?.message}
        icon={
          <div className="w-12 h-12 rounded-full bg-[var(--ios-red-subtle)] text-[var(--ios-red)] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        }
        actions={
          parsedError
            ? parsedError.fieldFocus
              ? [
                  {
                    label: t.closeLabel,
                    variant: 'secondary',
                    onClick: () => dismissModal()
                  },
                  {
                    label: parsedError.actionHint,
                    variant: 'primary',
                    onClick: () => dismissModal(parsedError.fieldFocus)
                  }
                ]
              : [
                  {
                    label: parsedError.actionHint,
                    variant: 'primary',
                    onClick: () => dismissModal()
                  }
                ]
            : []
        }
      />
    </div>
  )
}
