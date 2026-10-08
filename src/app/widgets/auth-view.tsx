'use client'

import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'

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
    return (
        <main className="w-full h-[100dvh] overflow-hidden overscroll-none flex flex-col justify-between items-center px-4 sm:px-6 pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] max-w-[420px] mx-auto box-border">
            <header className="w-full flex items-center justify-between">
                <h1 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">Synapse</h1>
                <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-[12px] flex gap-0.5">
                    {(['pl', 'en'] as AppLanguage[]).map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => onSelectLanguage(code)}
                            className={`px-3 py-1 text-xs font-medium rounded-[10px] uppercase transition-all ${lang === code
                                    ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs font-semibold'
                                    : 'text-[var(--ios-secondary)]'
                                }`}
                        >
                            {code}
                        </button>
                    ))}
                </div>
            </header>

            <section className="w-full bg-[var(--ios-card)] backdrop-blur-xl rounded-[28px] p-6 sm:p-7 shadow-xl border border-[var(--ios-separator)]/60 flex flex-col gap-5">
                {authStep === 'input' && (
                    <>
                        <div>
                            <h2 className="text-xl font-semibold text-[var(--ios-label)] tracking-tight">{t.welcomeTitle}</h2>
                            <p className="text-xs font-normal text-[var(--ios-secondary)] mt-1">{t.loginSubtitle}</p>
                        </div>

                        {authError && (
                            <div className="bg-[var(--ios-red-subtle)] border border-[var(--ios-red)]/20 text-[var(--ios-red)] text-xs font-medium p-3 rounded-[14px]">
                                {authError}
                            </div>
                        )}

                        <form onSubmit={onStartVerification} className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder={t.loginPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-12 w-full bg-[var(--ios-input)] text-[var(--ios-label)] placeholder-[var(--ios-secondary)] text-sm font-normal rounded-[14px] px-4 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-all"
                                required
                            />
                            <input
                                type="password"
                                placeholder={t.passwordPlaceholder}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 w-full bg-[var(--ios-input)] text-[var(--ios-label)] placeholder-[var(--ios-secondary)] text-sm font-normal rounded-[14px] px-4 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-all"
                                required
                            />
                            <button
                                type="submit"
                                className="h-12 w-full bg-[var(--ios-blue)] text-white text-sm font-semibold rounded-[14px] active:scale-[0.98] transition-all shadow-xs flex items-center justify-center"
                            >
                                {t.verifyButton}
                            </button>
                        </form>
                    </>
                )}

                {authStep === 'verifying' && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <svg className="w-7 h-7 animate-spin text-[var(--ios-blue)]" viewBox="0 0 24 24" fill="none">
                            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
                            <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.875" />
                            <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
                            <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.625" />
                            <line x1="12" y1="22" x2="12" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.375" />
                            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.125" />
                        </svg>
                        <p className="text-xs font-normal text-[var(--ios-secondary)]">{t.verifyingAccount}</p>
                    </div>
                )}

                {authStep === 'preview' && verifiedCandidate && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--ios-green)]" />
                            <span className="text-xs font-semibold text-[var(--ios-green)]">{t.accountVerified}</span>
                        </div>

                        <div className="bg-[var(--ios-element)]/35 p-4 rounded-[16px] flex flex-col gap-1 border border-[var(--ios-separator)]/60">
                            <h3 className="text-sm font-semibold text-[var(--ios-label)]">{verifiedCandidate.fullName}</h3>
                            <p className="text-xs font-normal text-[var(--ios-secondary)]">
                                {verifiedCandidate.className} • {verifiedCandidate.schoolName}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={onConfirmLogin}
                                className="h-12 w-full bg-[var(--ios-blue)] text-white text-sm font-semibold rounded-[14px] active:scale-[0.98] transition-all shadow-xs flex items-center justify-center"
                            >
                                {t.confirmAndEnter}
                            </button>
                            <button
                                type="button"
                                onClick={onBackToInput}
                                className="h-11 w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium rounded-[14px] active:scale-[0.98] transition-all flex items-center justify-center"
                            >
                                {t.changeData}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <div className="h-2" />
        </main>
    )
}