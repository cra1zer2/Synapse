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
        <main className="w-full h-[100dvh] overflow-hidden overscroll-none flex flex-col justify-between items-center px-4 sm:px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] max-w-[420px] mx-auto box-border">
            <header className="w-full flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-[var(--ios-label)]">Synapse</h1>
                <div className="bg-[rgba(118,118,128,0.12)] p-1 rounded-[10px] flex gap-0.5">
                    {(['pl', 'en', 'ru'] as AppLanguage[]).map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => onSelectLanguage(code)}
                            className={`px-3 py-1 text-xs font-bold rounded-[7px] uppercase transition-all ${lang === code
                                    ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                                    : 'text-[#8e8e93]'
                                }`}
                        >
                            {code}
                        </button>
                    ))}
                </div>
            </header>

            <section className="w-full bg-[var(--ios-card)] backdrop-blur-[25px] rounded-3xl p-6 sm:p-7 shadow-[var(--ios-shadow)] border border-[var(--ios-border)] flex flex-col gap-5">
                {authStep === 'input' && (
                    <>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--ios-label)] tracking-tight">{t.welcomeTitle}</h2>
                            <p className="text-xs text-[#8e8e93] mt-1">{t.loginSubtitle}</p>
                        </div>

                        {authError && (
                            <div className="bg-rose-500/15 border border-rose-500/20 text-rose-500 text-xs font-medium p-3 rounded-xl">
                                {authError}
                            </div>
                        )}

                        <form onSubmit={onStartVerification} className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder={t.loginPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-12 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-sm font-medium rounded-xl px-4 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[#8e8e93]"
                                required
                            />
                            <input
                                type="password"
                                placeholder={t.passwordPlaceholder}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-sm font-medium rounded-xl px-4 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[#8e8e93]"
                                required
                            />
                            <button
                                type="submit"
                                className="h-12 w-full bg-[var(--ios-blue)] text-white text-sm font-semibold rounded-xl active:opacity-90 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,122,255,0.25)] flex items-center justify-center"
                            >
                                {t.verifyButton}
                            </button>
                        </form>
                    </>
                )}

                {authStep === 'verifying' && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-semibold text-[#8e8e93]">{t.verifyingAccount}</p>
                    </div>
                )}

                {authStep === 'preview' && verifiedCandidate && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#34c759]" />
                            <span className="text-xs font-bold text-[#34c759]">{t.accountVerified}</span>
                        </div>

                        <div className="bg-[var(--ios-input)] p-4 rounded-xl flex flex-col gap-1 border border-black/[0.04] dark:border-white/5">
                            <h3 className="text-sm font-bold text-[var(--ios-label)]">{verifiedCandidate.fullName}</h3>
                            <p className="text-xs font-medium text-[#8e8e93]">
                                {verifiedCandidate.className} • {verifiedCandidate.schoolName}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={onConfirmLogin}
                                className="h-12 w-full bg-[var(--ios-blue)] text-white text-sm font-semibold rounded-xl active:opacity-90 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,122,255,0.25)] flex items-center justify-center"
                            >
                                {t.confirmAndEnter}
                            </button>
                            <button
                                type="button"
                                onClick={onBackToInput}
                                className="h-10 w-full bg-[var(--ios-input)] text-[#8e8e93] text-xs font-semibold rounded-xl active:opacity-80 transition-all flex items-center justify-center"
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