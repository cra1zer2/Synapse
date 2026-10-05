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
        <main className="w-full min-h-screen pb-16 pt-safe px-4 max-w-xs mx-auto flex flex-col justify-center gap-5 box-border">
            <header className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-[var(--ios-label)]">Synapse</h1>
                <div className="bg-[rgba(118,118,128,0.12)] p-0.5 rounded-[9px] flex">
                    {(['pl', 'en', 'ru'] as AppLanguage[]).map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => onSelectLanguage(code)}
                            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-[7px] uppercase transition-all ${lang === code
                                    ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                                    : 'text-[#8e8e93]'
                                }`}
                        >
                            {code}
                        </button>
                    ))}
                </div>
            </header>

            <section className="bg-white/75 dark:bg-[#1c1c1e]/85 backdrop-blur-[25px] rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-black/[0.08] dark:border-white/10 flex flex-col gap-4">
                {authStep === 'input' && (
                    <>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--ios-label)]">{t.welcomeTitle}</h2>
                            <p className="text-xs text-[#8e8e93] mt-0.5">{t.loginSubtitle}</p>
                        </div>

                        {authError && (
                            <div className="bg-rose-500/15 border border-rose-500/20 text-rose-500 text-xs font-medium p-2.5 rounded-xl">
                                {authError}
                            </div>
                        )}

                        <form onSubmit={onStartVerification} className="flex flex-col gap-2.5">
                            <input
                                type="text"
                                placeholder={t.loginPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#f2f2f7] dark:bg-[rgba(118,118,128,0.24)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[#8e8e93]"
                                required
                            />
                            <input
                                type="password"
                                placeholder={t.passwordPlaceholder}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#f2f2f7] dark:bg-[rgba(118,118,128,0.24)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[#8e8e93]"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full bg-[#007aff] dark:bg-[#0a84ff] text-white text-xs font-semibold py-2.5 rounded-xl active:opacity-90 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,122,255,0.25)]"
                            >
                                {t.verifyButton}
                            </button>
                        </form>
                    </>
                )}

                {authStep === 'verifying' && (
                    <div className="py-10 flex flex-col items-center justify-center gap-2.5">
                        <div className="w-6 h-6 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-semibold text-[#8e8e93]">{t.verifyingAccount}</p>
                    </div>
                )}

                {authStep === 'preview' && verifiedCandidate && (
                    <div className="flex flex-col gap-3.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#34c759]" />
                            <span className="text-xs font-bold text-[#34c759]">{t.accountVerified}</span>
                        </div>

                        <div className="bg-[#f2f2f7] dark:bg-[rgba(118,118,128,0.24)] p-3.5 rounded-xl flex flex-col gap-0.5 border border-black/[0.04] dark:border-white/5">
                            <h3 className="text-xs font-bold text-[var(--ios-label)]">{verifiedCandidate.fullName}</h3>
                            <p className="text-[11px] font-medium text-[#8e8e93]">
                                {verifiedCandidate.className} • {verifiedCandidate.schoolName}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={onConfirmLogin}
                                className="w-full bg-[#007aff] dark:bg-[#0a84ff] text-white text-xs font-semibold py-2.5 rounded-xl active:opacity-90 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,122,255,0.25)]"
                            >
                                {t.confirmAndEnter}
                            </button>
                            <button
                                type="button"
                                onClick={onBackToInput}
                                className="w-full bg-[#f2f2f7] dark:bg-[rgba(118,118,128,0.24)] text-[#8e8e93] text-xs font-semibold py-2 rounded-xl active:opacity-80 transition-all"
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