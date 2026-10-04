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
        <main className="w-full min-h-screen pb-16 pt-safe px-4 max-w-sm mx-auto flex flex-col justify-center gap-6 box-border">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Synapse</h1>
                <div className="flex bg-[var(--bg-element)] p-0.5 rounded-xl">
                    {(['pl', 'en', 'ru'] as AppLanguage[]).map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => onSelectLanguage(code)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase transition-all ${lang === code
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)]'
                                }`}
                        >
                            {code}
                        </button>
                    ))}
                </div>
            </header>

            <section className="bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col gap-5">
                {authStep === 'input' && (
                    <>
                        <div>
                            <h2 className="text-lg font-black text-[var(--text-primary)]">{t.welcomeTitle}</h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.loginSubtitle}</p>
                        </div>

                        {authError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold p-3 rounded-2xl">
                                {authError}
                            </div>
                        )}

                        <form onSubmit={onStartVerification} className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder={t.loginPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-medium rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                                required
                            />
                            <input
                                type="password"
                                placeholder={t.passwordPlaceholder}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-medium rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full bg-[#007aff] text-white text-xs font-bold py-3.5 rounded-2xl active:opacity-80 transition-all shadow-xs"
                            >
                                {t.verifyButton}
                            </button>
                        </form>
                    </>
                )}

                {authStep === 'verifying' && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-[#007aff] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-[var(--text-secondary)]">{t.verifyingAccount}</p>
                    </div>
                )}

                {authStep === 'preview' && verifiedCandidate && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500">{t.accountVerified}</span>
                        </div>

                        <div className="bg-[var(--bg-element)] p-4 rounded-2xl flex flex-col gap-1">
                            <h3 className="text-sm font-black text-[var(--text-primary)]">{verifiedCandidate.fullName}</h3>
                            <p className="text-xs font-medium text-[var(--text-secondary)]">
                                {verifiedCandidate.className} • {verifiedCandidate.schoolName}
                            </p>
                            {verifiedCandidate.luckyNumber !== null && (
                                <p className="text-xs font-bold text-[#007aff] mt-1">
                                    {t.luckyNumber}: {verifiedCandidate.luckyNumber}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={onConfirmLogin}
                                className="w-full bg-[#007aff] text-white text-xs font-bold py-3.5 rounded-2xl active:opacity-80 transition-all shadow-xs"
                            >
                                {t.confirmAndEnter}
                            </button>
                            <button
                                type="button"
                                onClick={onBackToInput}
                                className="w-full bg-[var(--bg-element)] text-[var(--text-secondary)] text-xs font-bold py-2.5 rounded-2xl active:opacity-80 transition-all"
                            >
                                {t.changeData}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </main>
    )
}