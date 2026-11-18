/**
 * Feature View: Authentication & Add-Account Flow
 * Renders Librus Synergia sign-in form, live credential verification preview, and adaptive language switcher.
 * Supports arbitrary language counts in `SUPPORTED_LANGUAGES` via segmented controls (<=3) or compact selector (>3).
 */

'use client'

import React, { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Lock, User, GraduationCap, AlertTriangle } from 'lucide-react'
import { StudentProfile } from '@/models/account.model'
import {
  AppLanguage,
  AppDictionary,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  pickText
} from '@/config/dictionary.config'
import { UiListSection, UiCell } from '@/components/ui/ui-list'
import { UiAlert } from '@/components/ui/ui-alert'
import { UiButton } from '@/components/ui/ui-button'
import { UiBadge } from '@/components/ui/ui-badge'
import { UiSegmentedControl } from '@/components/ui/ui-controls'
import { resolveAvatarLetter, sanitizeAccountLabel } from '@/utils/account.util'
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

interface ParsedAuthError {
  title: string
  message: string
  actionHint: string
  fieldFocus?: 'username' | 'password'
}

function getPreviewAvatarText(
  fullName: string | undefined,
  username: string,
  role: 'student' | 'parent'
): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    return resolveAvatarLetter(fullName, username)
  }
  return role === 'student' ? 'U' : 'R'
}

function parseAuthErrorAction(raw: string, lang: AppLanguage): ParsedAuthError {
  const lower = raw.toLowerCase()

  if (lower.includes('już dodane') || lower.includes('already added')) {
    return {
      title: pickText(lang, { pl: 'Konto jest już dodane', en: 'Account already added' }),
      message: pickText(lang, {
        pl: 'To konto jest już zapisane na tym urządzeniu. Możesz przełączyć się na nie w Ustawieniach.',
        en: 'This account is already saved on this device. Switch to it directly in Settings.'
      }),
      actionHint: pickText(lang, { pl: 'Zmień login', en: 'Change login' }),
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
      title: pickText(lang, { pl: 'Nieudane logowanie', en: 'Sign-in failed' }),
      message: pickText(lang, {
        pl: 'Podany login lub hasło do Librus Synergia są nieprawidłowe. Sprawdź wielkość liter oraz końcówkę „u” przy koncie ucznia.',
        en: 'Your Synergia username or password is incorrect. Double check case sensitivity and your student ID suffix ("u").'
      }),
      actionHint: pickText(lang, { pl: 'Wpisz hasło ponownie', en: 'Re-enter password' }),
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
      title: pickText(lang, { pl: 'Problem z połączeniem', en: 'Librus connection timeout' }),
      message: pickText(lang, {
        pl: 'Serwery Librus Synergia nie odpowiadają lub połączenie zostało przerwane. Spróbuj ponownie za chwilę.',
        en: 'Librus Synergia took too long to respond or the connection dropped. Try again in a moment.'
      }),
      actionHint: pickText(lang, { pl: 'Spróbuj ponownie', en: 'Try again' })
    }
  }

  if (lower.includes('zmiany hasła') || lower.includes('passwordchange')) {
    return {
      title: pickText(lang, { pl: 'Wymagana zmiana hasła', en: 'Password update required' }),
      message: pickText(lang, {
        pl: 'System Librus wymaga zmiany hasła bezpośrednio na stronie synergia.librus.pl przed zalogowaniem tutaj.',
        en: 'Librus requires you to update your password on synergia.librus.pl before signing in here.'
      }),
      actionHint: 'OK'
    }
  }

  return {
    title: pickText(lang, { pl: 'Błąd weryfikacji', en: 'Verification failed' }),
    message: raw,
    actionHint: pickText(lang, { pl: 'Popraw dane', en: 'Fix details' })
  }
}

/* === Main Auth Component === */

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
    ? 'w-full bg-[var(--ios-bg)] lg:bg-transparent text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 lg:p-0 pt-3 pb-8 lg:pb-2 select-none'
    : 'w-full min-h-[100lvh] min-h-[100dvh] md:fixed md:inset-0 bg-[var(--ios-bg)] lg:bg-[var(--mac-canvas-bg)] text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 pt-[calc(var(--ios-header-pad-top)+38px+var(--ios-header-pad-bottom))] sm:p-5 md:pt-5 md:overflow-y-auto select-none'

  const languageToggle = onSelectLanguage ? (
    SUPPORTED_LANGUAGES.length <= 3 ? (
      <UiSegmentedControl<AppLanguage>
        size="compact"
        value={lang}
        onChange={onSelectLanguage}
        options={SUPPORTED_LANGUAGES.map((item) => ({
          id: item.id,
          label: item.shortCode
        }))}
        className={cn(
          'border border-[var(--ios-glass-border)] shadow-[var(--ios-glass-shadow)]',
          SUPPORTED_LANGUAGES.length === 2 ? 'w-[100px]' : 'w-auto min-w-[144px]'
        )}
      />
    ) : (
      <select
        value={lang}
        onChange={(e) => onSelectLanguage(normalizeLanguage(e.target.value))}
        aria-label={t.appLanguage}
        className="h-[32px] px-3 rounded-full text-[13px] font-semibold bg-[var(--ios-card-solid)] text-[var(--ios-label)] border border-[var(--ios-glass-border)] shadow-[var(--ios-glass-shadow)] outline-none cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.shortCode} · {item.nativeName}
          </option>
        ))}
      </select>
    )
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
        <div className="hidden md:flex w-full max-w-[380px] lg:max-w-[440px] mx-auto justify-end shrink-0 ios-auth-topbar">
          {languageToggle}
        </div>
      )}

      <div className={langContentClass}>
        <div
          className={cn(
            'w-full max-w-[380px] mx-auto flex flex-col items-center my-auto py-4',
            !isSubView && 'lg:max-w-[440px] lg:mac-dialog-window lg:rounded-[26px] lg:p-8 lg:border lg:border-[var(--mac-window-border)]'
          )}
        >
          {(authStep === 'input' || authStep === 'verifying') && (
            <div className="flex flex-col items-center text-center mb-6 ios-reveal">
              <div
                className={cn(
                  'w-[62px] h-[62px] bg-[var(--ios-blue)] shadow-[var(--ios-primary-pill-shadow)] flex items-center justify-center mb-3.5 text-[var(--ios-on-accent)]',
                  'rounded-[18px]'
                )}
              >
                <GraduationCap className="w-8 h-8 stroke-[2]" />
              </div>
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] text-[var(--ios-label)] leading-tight">
                {isSubView ? pickText(displayLang, { pl: 'Dodaj konto', en: 'Add Account' }) : 'Synapse'}
              </h1>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] mt-1 max-w-[260px] min-h-[36px] flex items-center justify-center leading-snug">
                {isSubView
                  ? pickText(displayLang, {
                      pl: 'Połącz kolejne konto ucznia lub rodzica z Librus Synergia.',
                      en: 'Connect another Librus Synergia student or parent account.'
                    })
                  : pickText(displayLang, {
                      pl: 'Twój prywatny i szybki dziennik Librus Synergia.',
                      en: 'Your private, fast iOS-native dashboard for Librus Synergia.'
                    })}
              </p>
            </div>
          )}

          {(authStep === 'input' || authStep === 'verifying') && (
            <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-3.5 ios-reveal">
              <div className="ios-card rounded-[var(--ios-radius-card)] overflow-hidden">
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
                      {pickText(displayLang, {
                        pl: 'Login Synergia (np. 1234567u lub demo)',
                        en: 'Synergia login (e.g. 1234567u or demo)'
                      })}
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
                      {pickText(displayLang, { pl: 'Hasło', en: 'Password' })}
                    </label>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isVerifying}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer shrink-0 transition-colors"
                    aria-label={
                      showPassword
                        ? pickText(displayLang, { pl: 'Ukryj hasło', en: 'Hide password' })
                        : pickText(displayLang, { pl: 'Pokaż hasło', en: 'Show password' })
                    }
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <UiButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canSubmit}
                  loading={isVerifying}
                >
                  {isVerifying
                    ? pickText(displayLang, { pl: 'Weryfikacja konta...', en: 'Verifying...' })
                    : isSubView
                      ? pickText(displayLang, { pl: 'Dodaj konto', en: 'Add Account' })
                      : pickText(displayLang, { pl: 'Zaloguj się', en: 'Sign In' })}
                </UiButton>

                {!isSubView && (
                  <p className="text-[12px] text-[var(--ios-secondary)] text-center leading-relaxed pt-1">
                    {pickText(displayLang, {
                      pl: 'Chcesz tylko zobaczyć aplikację? Wpisz ',
                      en: 'Just exploring? Enter '
                    })}
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => {
                        setUsername('demo')
                        setPassword('demo')
                      }}
                      className="font-semibold text-[var(--ios-blue)] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      demo / demo
                    </button>
                    <span className="lg:hidden">
                      {pickText(displayLang, {
                        pl: ' (najlepiej otwierać z telefonu · PC i dolny pasek w WIP).',
                        en: ' (best viewed on a phone · PC & bottom bar are WIP).'
                      })}
                    </span>
                    <span className="hidden lg:inline">.</span>
                  </p>
                )}

                {isSubView && onCancel && (
                  <UiButton
                    type="button"
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={onCancel}
                    disabled={isVerifying}
                  >
                    {pickText(displayLang, { pl: 'Anuluj', en: 'Cancel' })}
                  </UiButton>
                )}
              </div>
            </form>
          )}

          {authStep === 'preview' && verifiedCandidate && (
            <div className="w-full flex flex-col items-center gap-5 ios-reveal">
              {!isSubView && (
                <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.025em] text-[var(--ios-label)] text-center leading-tight">
                  {pickText(displayLang, { pl: 'Tożsamość potwierdzona', en: 'Identity Verified' })}
                </h1>
              )}

              <div className="w-[74px] h-[74px] rounded-full bg-[var(--ios-blue)] shadow-[var(--ios-primary-pill-shadow)] text-[var(--ios-on-accent)] flex items-center justify-center text-[25px] font-bold">
                {getPreviewAvatarText(verifiedCandidate.fullName, username, verifiedCandidate.role)}
              </div>

              <div className="text-center flex flex-col items-center gap-1.5">
                <h2 className="text-[21px] font-bold text-[var(--ios-label)] tracking-[-0.02em] leading-tight">
                  {verifiedCandidate.fullName}
                </h2>
                <UiBadge
                  variant={verifiedCandidate.role === 'student' ? 'blue' : 'green'}
                  size="md"
                  text={
                    verifiedCandidate.role === 'student'
                      ? pickText(displayLang, { pl: 'Konto ucznia', en: 'Student Account' })
                      : pickText(displayLang, { pl: 'Konto rodzica', en: 'Parent Account' })
                  }
                />
              </div>

              <UiListSection
                header={pickText(displayLang, { pl: 'Dane konta', en: 'Account details' })}
                className="w-full"
              >
                <UiCell
                  title={pickText(displayLang, { pl: 'Login', en: 'Username' })}
                  detail={username.trim()}
                  compact
                />
                {candidateClassName && (
                  <UiCell
                    title={pickText(displayLang, { pl: 'Klasa', en: 'Class' })}
                    detail={candidateClassName}
                    compact
                  />
                )}
                {candidateSchoolName && (
                  <UiCell
                    title={pickText(displayLang, { pl: 'Szkoła', en: 'School' })}
                    subtitle={candidateSchoolName}
                    compact
                  />
                )}
              </UiListSection>

              <div className="w-full flex flex-col gap-2.5">
                <UiButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleConfirmClick}
                  disabled={isExiting}
                >
                  {isSubView
                    ? pickText(displayLang, { pl: 'Zapisz konto', en: 'Save Account' })
                    : pickText(displayLang, { pl: 'Kontynuuj', en: 'Continue' })}
                </UiButton>
                <UiButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={onBackToInput}
                  disabled={isExiting}
                >
                  {pickText(displayLang, { pl: 'Zmień konto', en: 'Change Account' })}
                </UiButton>
              </div>
            </div>
          )}
        </div>

        {!isSubView && (
          <div className="w-full max-w-[380px] mx-auto text-center pb-[max(env(safe-area-inset-bottom,0px),12px)] pt-3 shrink-0">
            <p className="text-[11px] font-normal text-[var(--ios-tertiary)] leading-relaxed min-h-[36px] flex items-center justify-center">
              {pickText(displayLang, {
                pl: 'Dane logowania pozostają wyłącznie na tym urządzeniu.',
                en: 'Credentials stay locally on this device and are sent only during Librus sync.'
              })}
            </p>
          </div>
        )}
      </div>

      <UiAlert
        isOpen={Boolean(parsedError)}
        onClose={() => dismissModal()}
        title={parsedError?.title || ''}
        message={parsedError?.message}
        icon={
          <div className="w-12 h-12 rounded-full bg-[var(--ios-red-subtle)] ios-tile text-[var(--ios-red)] flex items-center justify-center">
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
