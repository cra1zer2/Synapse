'use client'

import React, { useState, useEffect, useRef, useId } from 'react'
import { Eye, EyeOff, Lock, User, GraduationCap, AlertTriangle } from 'lucide-react'
import { StudentProfile } from '@/models/account.model'
import { AppLanguage, AppDictionary } from '@/config/dictionary.config'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { IosAlert } from '@/components/ios/ios-alert'
import { IosButton } from '@/components/ios/ios-button'
import { IosBadge } from '@/components/ios/ios-badge'
import { resolveAvatarLetter as buildAvatarInitials } from '@/utils/account.util'
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
  const isEn = lang === 'en'
  const [showPassword, setShowPassword] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)

  const usernameInputId = useId()
  const passwordInputId = useId()
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setDismissedError(false)
  }, [authError])

  useEffect(() => {
    if (authStep !== 'preview') {
      setIsExiting(false)
    }
  }, [authStep])

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  const isVerifying = authStep === 'verifying'
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
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    exitTimerRef.current = setTimeout(() => {
      onConfirmLogin()
    }, 240)
  }

  const containerClass = isSubView
    ? 'w-full bg-[var(--ios-bg)] text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 pt-3 pb-8 select-none'
    : 'fixed inset-0 bg-[var(--ios-bg)] text-[var(--ios-label)] font-sans flex flex-col justify-between p-4 sm:p-5 overflow-y-auto select-none'

  return (
    <div
      className={cn(
        containerClass,
        'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isExiting && 'opacity-0 scale-[0.98]'
      )}
    >
      {!isSubView && (
        <div
          className="w-full max-w-[380px] mx-auto flex justify-end shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
        >
          {onSelectLanguage && (
            <div className="ios-glass-control p-[3px] rounded-full flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSelectLanguage('pl')}
                className={cn(
                  'h-[28px] px-3 rounded-full text-[12px] font-semibold transition-all cursor-pointer select-none',
                  lang === 'pl'
                    ? 'bg-[var(--ios-segmented-thumb)] text-[var(--ios-label)] shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                    : 'text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
                )}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => onSelectLanguage('en')}
                className={cn(
                  'h-[28px] px-3 rounded-full text-[12px] font-semibold transition-all cursor-pointer select-none',
                  lang === 'en'
                    ? 'bg-[var(--ios-segmented-thumb)] text-[var(--ios-label)] shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                    : 'text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
                )}
              >
                EN
              </button>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-[380px] mx-auto flex flex-col items-center my-auto py-4">
        <div className="flex flex-col items-center text-center mb-6 ios-reveal">
          <div className="w-[62px] h-[62px] rounded-[18px] bg-[var(--ios-blue)] flex items-center justify-center mb-3.5 text-white">
            <GraduationCap className="w-8 h-8 stroke-[2]" />
          </div>
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] text-[var(--ios-label)] leading-tight">
            {isSubView ? (isEn ? 'Add Account' : 'Dodaj konto') : 'Synapse'}
          </h1>
          <p className="text-[13px] font-normal text-[var(--ios-secondary)] mt-1 max-w-[260px] leading-snug">
            {isSubView
              ? isEn
                ? 'Connect another Librus Synergia student or parent account.'
                : 'Połącz kolejne konto ucznia lub rodzica z Librus Synergia.'
              : isEn
                ? 'Your private, fast iOS-native dashboard for Librus Synergia.'
                : 'Twój prywatny i szybki dziennik Librus Synergia.'}
          </p>
        </div>

        {(authStep === 'input' || authStep === 'verifying') && (
          <form onSubmit={onStartVerification} className="w-full flex flex-col gap-3.5 ios-reveal">
            <div className="ios-card rounded-[26px] overflow-hidden">
              <div className="relative px-4 h-[52px] flex items-center gap-3">
                <User className="w-4 h-4 text-[var(--ios-secondary)] shrink-0" />
                <label htmlFor={usernameInputId} className="sr-only">
                  {isEn ? 'Username' : 'Login'}
                </label>
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
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isEn ? 'Synergia login (e.g. 1234567u)' : 'Login Synergia (np. 1234567u)'}
                  className="w-full bg-transparent text-[15px] text-[var(--ios-label)] placeholder-[var(--ios-tertiary)] outline-none disabled:opacity-50"
                />
                <div className="absolute bottom-0 left-11 right-4 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
              </div>

              <div className="relative px-4 h-[52px] flex items-center gap-3">
                <Lock className="w-4 h-4 text-[var(--ios-secondary)] shrink-0" />
                <label htmlFor={passwordInputId} className="sr-only">
                  {isEn ? 'Password' : 'Hasło'}
                </label>
                <input
                  id={passwordInputId}
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isVerifying}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEn ? 'Password' : 'Hasło'}
                  className="w-full bg-transparent text-[15px] text-[var(--ios-label)] placeholder-[var(--ios-tertiary)] outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isVerifying}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer shrink-0 transition-colors"
                  aria-label={
                    isEn
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
                  ? isEn
                    ? 'Verifying...'
                    : 'Weryfikacja konta...'
                  : isSubView
                    ? isEn
                      ? 'Add Account'
                      : 'Dodaj konto'
                    : isEn
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
                  {isEn ? 'Cancel' : 'Anuluj'}
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
                    ? isEn
                      ? 'Student Account'
                      : 'Konto ucznia'
                    : isEn
                      ? 'Parent Account'
                      : 'Konto rodzica'
                }
              />
            </div>

            <IosListSection header={isEn ? 'Account details' : 'Dane konta'} className="w-full">
              <IosCell
                title={isEn ? 'Username' : 'Login'}
                detail={username.trim()}
                compact
              />
              {verifiedCandidate.className && (
                <IosCell
                  title={isEn ? 'Class' : 'Klasa'}
                  detail={verifiedCandidate.className}
                  compact
                />
              )}
              {verifiedCandidate.schoolName && (
                <IosCell
                  title={isEn ? 'School' : 'Szkoła'}
                  subtitle={verifiedCandidate.schoolName}
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
                  ? isEn
                    ? 'Save Account'
                    : 'Zapisz konto'
                  : isEn
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
                {isEn ? 'Change Account' : 'Zmień konto'}
              </IosButton>
            </div>
          </div>
        )}
      </div>

      {!isSubView && (
        <div className="w-full max-w-[380px] mx-auto text-center pb-[max(env(safe-area-inset-bottom,0px),12px)] pt-3 shrink-0">
          <p className="text-[11px] font-normal text-[var(--ios-tertiary)] leading-relaxed">
            {isEn
              ? 'Credentials stay locally on this device and are sent only during Librus sync.'
              : 'Dane logowania pozostają wyłącznie na tym urządzeniu.'}
          </p>
        </div>
      )}

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
