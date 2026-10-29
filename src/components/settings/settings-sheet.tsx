'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
import { executeLibrusBenchmarkAction } from '@/app/actions'
import { BenchmarkReport } from '@/models/benchmark.model'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosCard } from '@/components/ios/ios-ui'
import { IosSwitch } from '@/components/ios/ios-switch'
import { IosSpinner } from '@/components/ios/ios-spinner'

interface SettingsSheetProps {
  isOpen: boolean
  onClose: () => void
  profile: StudentProfile | null
  savedAccounts?: SavedAccount[]
  onSwitchAccount: (account: SavedAccount) => void
  onAddAccount: (e: React.FormEvent) => Promise<{ success: boolean; error?: string }> | void
  newUsername: string
  setNewUsername: (u: string) => void
  newPassword: string
  setNewPassword: (p: string) => void
  isAddingAccount: boolean
  currentLang: AppLanguage
  onSelectLang: (lang: AppLanguage) => void
  currentTheme: AppTheme
  onSelectTheme: (theme: AppTheme) => void
  textClamp: TextClampOption
  onSelectTextClamp: (clamp: TextClampOption) => void
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  ignoreGradeModifiers: boolean
  onToggleIgnoreGradeModifiers: (val: boolean) => void
  isStudent?: boolean
  allowStudentJustifications?: boolean
  onToggleAllowStudentJustifications?: (val: boolean) => void
  onLogout: () => void
  t: AppDictionary
}

function resolveAccountTitle(fullName: string | undefined, username: string, role: 'student' | 'parent', t: AppDictionary): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    return fullName
  }
  return role === 'parent' ? t.parentRoleTitle : t.studentRoleTitle
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

export function SettingsSheet({
  isOpen,
  onClose,
  profile,
  savedAccounts = [],
  onSwitchAccount,
  onAddAccount,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  isAddingAccount,
  currentLang,
  onSelectLang,
  currentTheme,
  onSelectTheme,
  showFullSubjectNames,
  onToggleShowFullSubjectNames,
  ignoreGradeModifiers,
  onToggleIgnoreGradeModifiers,
  isStudent,
  allowStudentJustifications = false,
  onToggleAllowStudentJustifications,
  onLogout,
  t
}: SettingsSheetProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addAccountError, setAddAccountError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [accountToSwitch, setAccountToSwitch] = useState<SavedAccount | null>(null)
  const [cachedSwitchAccount, setCachedSwitchAccount] = useState<SavedAccount | null>(null)
  const [isSwitchModalRendered, setIsSwitchModalRendered] = useState(false)
  const [isSwitchModalVisible, setIsSwitchModalVisible] = useState(false)

  useEffect(() => {
    if (accountToSwitch) {
      setCachedSwitchAccount(accountToSwitch)
      setIsSwitchModalRendered(true)
      let raf1 = 0
      let raf2 = 0
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsSwitchModalVisible(true)
        })
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    } else {
      setIsSwitchModalVisible(false)
      const timer = setTimeout(() => {
        setIsSwitchModalRendered(false)
      }, 260)
      return () => clearTimeout(timer)
    }
  }, [accountToSwitch])

  const handleDismissSwitchModal = () => {
    setIsSwitchModalVisible(false)
    setTimeout(() => {
      setAccountToSwitch(null)
    }, 240)
  }

  const handleConfirmSwitchAccount = () => {
    const acc = accountToSwitch || cachedSwitchAccount
    if (!acc) return
    setIsSwitchModalVisible(false)
    onClose()
    onSwitchAccount(acc)
    setTimeout(() => {
      setAccountToSwitch(null)
      setIsSwitchModalRendered(false)
    }, 260)
  }

  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const accountsList = Array.isArray(savedAccounts) ? savedAccounts : []
  const activeAccount = accountsList.find((a) => a.isActive) || accountsList[0]

  const activeRole = activeAccount?.role || profile?.role || 'student'
  const isStudentUser = isStudent !== undefined
    ? isStudent
    : (activeRole === 'student' || Boolean(activeAccount?.username?.toLowerCase().includes('u')))
  const activeRawName = profile?.fullName || activeAccount?.profile?.fullName || ''
  const activeUsername = activeAccount?.username || ''
  const heroTitle = resolveAccountTitle(activeRawName, activeUsername, activeRole, t)
  const heroAvatar = resolveAvatarLetter(activeRawName, activeUsername, activeRole)
  const heroSubtitle = [
    activeAccount?.profile?.className || profile?.className,
    activeAccount?.profile?.schoolName || profile?.schoolName
  ].filter(Boolean).join(' • ') || 'Librus Synergia'

  const handleRunBenchmark = async () => {
    if (!activeAccount || !activeAccount.username || !activeAccount.password || isBenchmarking) return
    setIsBenchmarking(true)
    const res = await executeLibrusBenchmarkAction(activeAccount.username, activeAccount.password)
    setIsBenchmarking(false)
    if (res.success && res.data) {
      setBenchmarkReport(res.data)
    }
  }

  const handleCopyReport = async () => {
    if (!benchmarkReport) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(benchmarkReport, null, 2))
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch { }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddAccountError(null)
    const res = await onAddAccount(e)
    if (res && !res.success) {
      setAddAccountError(res.error || t.loginError)
    } else {
      setShowAddForm(false)
      setAddAccountError(null)
    }
  }

  const themeLabel = currentTheme === 'system' ? t.themeSystem : currentTheme === 'light' ? t.themeLight : t.themeDark
  const langLabel = currentLang === 'pl' ? 'Polski' : 'English'

  return (
    <>
      <IosScreen
        isOpen={isOpen}
        onClose={onClose}
        title={t.settingsTitle}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={showThemePicker || showLangPicker || showAdvanced || showAddForm}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <IosCard>
            <div className="p-4 flex items-center gap-3 border-b border-[var(--ios-separator)]">
              <div className="w-11 h-11 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] border border-[var(--ios-blue)]/20 flex items-center justify-center font-semibold text-[15px] shrink-0">
                {heroAvatar}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-tight">
                  {heroTitle}
                </h3>
                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] truncate mt-0.5">
                  {heroSubtitle}
                </p>
                <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight mt-0.5 block">
                  Login: {activeUsername}
                </span>
              </div>
            </div>

            {accountsList.map((acc) => {
              if (acc.id === activeAccount?.id && accountsList.length === 1) return null
              const isCurrent = acc.id === activeAccount?.id
              const accRole = acc.role === 'student' ? t.studentRole : t.parentRole
              const accTitle = resolveAccountTitle(acc.profile?.fullName, acc.username, acc.role, t)

              return (
                <IosCell
                  key={acc.id}
                  onClick={() => {
                  if (!isCurrent) {
                    setAccountToSwitch(acc)
                  }
                }}
                  title={accTitle}
                  subtitle={accRole + ' • ' + acc.username}
                  size="tall"
                  trailing={
                    isCurrent ? (
                      <svg className="w-4 h-4 text-[var(--ios-blue)] mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-[13px] font-medium text-[var(--ios-blue)] px-3 py-1 bg-[var(--ios-blue-subtle)] rounded-full">
                        {t.switchAccount}
                      </span>
                    )
                  }
                />
              )
            })}

            <button
              type="button"
              onClick={() => {
                setAddAccountError(null)
                setShowAddForm(true)
              }}
              className="w-full p-4 text-left text-[15px] font-normal text-[var(--ios-blue)] tracking-[-0.2px] flex items-center justify-between active:bg-[var(--ios-element)]/30 transition-colors cursor-pointer"
            >
              <span>+ {t.addAccount}</span>
              <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </IosCard>

          <IosListSection header={t.preferences}>
            <IosCell
              title={t.appTheme}
              detail={themeLabel}
              chevron={true}
              size="standard"
              onClick={() => setShowThemePicker(true)}
            />

            <IosCell
              title={t.appLanguage}
              detail={langLabel}
              chevron={true}
              size="standard"
              onClick={() => setShowLangPicker(true)}
            />
          </IosListSection>

          <IosListSection header={t.systemSection}>
            <IosCell
              title={t.advancedTitle}
              subtitle={currentLang === 'en' ? 'Diagnostics, display and grade calculation' : 'Diagnostyka, wyświetlanie i kalkulator ocen'}
              size="tall"
              chevron={true}
              onClick={() => setShowAdvanced(true)}
            />
          </IosListSection>

          <IosCard>
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-center p-3.5 text-[15px] font-medium text-[var(--ios-red)] tracking-[-0.2px] active:bg-[var(--ios-element)]/30 transition-colors cursor-pointer"
            >
              {t.logout}
            </button>
          </IosCard>
        </div>
      </IosScreen>

      {typeof document !== 'undefined' && (isSwitchModalRendered || accountToSwitch) && (() => {
        const targetAcc = accountToSwitch || cachedSwitchAccount
        if (!targetAcc) return null
        const targetTitle = resolveAccountTitle(targetAcc.profile?.fullName, targetAcc.username, targetAcc.role, t)
        const targetAvatar = resolveAvatarLetter(targetAcc.profile?.fullName, targetAcc.username, targetAcc.role)
        const targetRoleLabel = targetAcc.role === 'student' ? t.studentRole : t.parentRole

        return createPortal(
          <div
            onClick={handleDismissSwitchModal}
            style={{
              opacity: isSwitchModalVisible ? 1 : 0,
              pointerEvents: isSwitchModalVisible ? 'auto' : 'none',
              transition: 'opacity 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
            className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-6 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: isSwitchModalVisible ? 'scale3d(1, 1, 1)' : 'scale3d(0.92, 0.92, 1)',
                opacity: isSwitchModalVisible ? 1 : 0,
                transition: 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
                willChange: 'transform, opacity'
              }}
              className="w-[308px] bg-[var(--ios-card-solid)] rounded-[34px] p-[14px] pt-[22px] shadow-2xl border border-[var(--ios-border)] flex flex-col gap-5 text-center"
            >
              <div className="px-3 flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] border border-[var(--ios-blue)]/20 flex items-center justify-center font-semibold text-[15px] mb-1">
                  {targetAvatar}
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] leading-snug">
                  {t.switchAccount}?
                </h3>
                <p className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-snug">
                  {targetTitle}
                </p>
                <span className="text-[12px] font-normal text-[var(--ios-secondary)]/80 tracking-[-0.1px] tabular-nums">
                  {targetRoleLabel} • {targetAcc.username}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDismissSwitchModal}
                  className="h-[48px] w-full rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[17px] font-medium tracking-[-0.3px] active:scale-[0.96] active:opacity-75 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSwitchAccount}
                  className="h-[48px] w-full rounded-full bg-[var(--ios-blue)] text-white text-[17px] font-semibold tracking-[-0.3px] active:scale-[0.96] active:opacity-85 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none shadow-xs"
                >
                  {t.switchAccount}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}

      <IosScreen
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false)
          setAddAccountError(null)
        }}
        title={t.addAccount}
        backLabel={t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-4 pb-12 select-none">
          {addAccountError && (
            <div className="p-3.5 rounded-[12px] bg-[var(--ios-red-subtle)] border border-[var(--ios-red)]/20 text-[var(--ios-red)] text-[13px] font-normal text-center">
              {addAccountError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="w-16 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">Login</span>
                <input
                  type="text"
                  placeholder={t.loginPlaceholder}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-transparent text-[var(--ios-label)] text-[17px] font-normal outline-none placeholder-[var(--ios-secondary)]/50 tracking-[-0.4px]"
                  required
                />
              </div>
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="w-16 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">{t.passwordPlaceholder}</span>
                <input
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent text-[var(--ios-label)] text-[17px] font-normal outline-none placeholder-[var(--ios-secondary)]/50 tracking-[-0.4px]"
                  required
                />
              </div>
            </IosCard>

            <button
              type="submit"
              disabled={isAddingAccount || !newUsername.trim() || !newPassword.trim()}
              className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[16px] font-medium tracking-[-0.2px] rounded-[16px] disabled:opacity-40 active:scale-[0.985] transition-transform shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {isAddingAccount ? (
                <>
                  <IosSpinner size="small" className="text-white" />
                  <span>{t.verifyingAccount}</span>
                </>
              ) : (
                <span>{t.saveAccount}</span>
              )}
            </button>
          </form>
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        title={t.appTheme}
        backLabel={t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <IosListSection>
            {[
              { id: 'system' as AppTheme, label: t.themeSystem },
              { id: 'light' as AppTheme, label: t.themeLight },
              { id: 'dark' as AppTheme, label: t.themeDark }
            ].map((th) => (
              <IosCell
                key={th.id}
                title={th.label}
                onClick={() => {
                  onSelectTheme(th.id)
                  setShowThemePicker(false)
                }}
                trailing={
                  currentTheme === th.id ? (
                    <svg className="w-4 h-4 text-[var(--ios-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null
                }
              />
            ))}
          </IosListSection>
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        title={t.appLanguage}
        backLabel={t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <IosListSection>
            {[
              { id: 'pl' as AppLanguage, label: 'Polski' },
              { id: 'en' as AppLanguage, label: 'English' }
            ].map((item) => (
              <IosCell
                key={item.id}
                title={item.label}
                onClick={() => {
                  onSelectLang(item.id)
                  setShowLangPicker(false)
                }}
                trailing={
                  currentLang === item.id ? (
                    <svg className="w-4 h-4 text-[var(--ios-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null
                }
              />
            ))}
          </IosListSection>
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        title={t.advancedTitle}
        backLabel={t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <IosListSection header={t.displaySectionTitle}>
            <IosCell
              title={currentLang === 'en' ? 'Show full subject names' : 'Pokazuj pełne nazwy'}
              subtitle={currentLang === 'en' ? 'Display unabbreviated subject titles across widgets' : 'Wyświetlaj całe, nieskrócone nazwy lekcji'}
              size="tall"
              trailing={
                <IosSwitch
                  checked={showFullSubjectNames}
                  onChange={() => onToggleShowFullSubjectNames(!showFullSubjectNames)}
                />
              }
            />
          </IosListSection>

          <IosListSection header={t.gradesCalcSectionTitle}>
            <IosCell
              title={t.ignoreModifiersLabel}
              subtitle={t.ignoreModifiersDescription}
              size="tall"
              trailing={
                <IosSwitch
                  checked={ignoreGradeModifiers}
                  onChange={() => onToggleIgnoreGradeModifiers(!ignoreGradeModifiers)}
                />
              }
            />
          </IosListSection>

          {isStudentUser && onToggleAllowStudentJustifications && (
            <IosListSection header={t.studentJustificationsSection}>
              <IosCell
                title={t.studentJustificationsTitle}
                subtitle={t.studentJustificationsDescription}
                size="tall"
                trailing={
                  <IosSwitch
                    checked={Boolean(allowStudentJustifications)}
                    onChange={() => onToggleAllowStudentJustifications(!allowStudentJustifications)}
                  />
                }
              />
            </IosListSection>
          )}

          <IosListSection header={t.benchmarkSectionTitle}>
            <IosCell
              title={t.benchmarkButtonLabel}
              subtitle={t.benchmarkDescription}
              size="tall"
              trailing={
                <button
                  type="button"
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  className="h-[28px] px-3 text-[12px] font-medium bg-[var(--ios-blue)] text-white rounded-full shadow-xs active:opacity-75 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  {isBenchmarking && (
                    <svg className="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                  )}
                  <span>{isBenchmarking ? t.benchmarkingStatus : t.runBenchmarkAction}</span>
                </button>
              }
            />

            {benchmarkReport && (
              <div className="p-3.5 flex flex-col gap-2.5 bg-[var(--ios-element)]/25 border-t border-[var(--ios-separator)]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--ios-secondary)]">{t.benchmarkTotalDuration}:</span>
                    <span className="text-[var(--ios-label)] font-medium">{benchmarkReport.totalDurationMs} ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--ios-secondary)]">{t.benchmarkAuthDuration}:</span>
                    <span className="text-[var(--ios-label)] font-medium">{benchmarkReport.authorizationDurationMs} ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--ios-secondary)]">{t.benchmarkFastestEndpoint}:</span>
                    <span className="text-[var(--ios-green)] font-medium truncate max-w-[200px] text-right">{benchmarkReport.fastestEndpoint}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--ios-secondary)]">{t.benchmarkSlowestEndpoint}:</span>
                    <span className="text-[var(--ios-orange)] font-medium truncate max-w-[200px] text-right">{benchmarkReport.slowestEndpoint}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--ios-separator)]">
                  <span className="text-[11px] font-normal text-[var(--ios-secondary)] uppercase tracking-wider">
                    {t.benchmarkEndpointsDetails}
                  </span>

                  <div className="flex flex-col gap-1">
                    {benchmarkReport.items.map((item, idx) => (
                      <div
                        key={item.endpoint + '-' + idx}
                        className="flex items-center justify-between text-[11px] p-2 rounded-[10px] bg-[var(--ios-card)] border border-[var(--ios-separator)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (item.success ? 'bg-[var(--ios-green)]' : 'bg-[var(--ios-red)]')} />
                          <span className="text-[var(--ios-label)] font-medium truncate">
                            {item.endpoint}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[var(--ios-secondary)]">
                            {item.payloadBytes > 0 ? Math.round(item.payloadBytes / 1024 * 10) / 10 + " KB" : "0 B"}
                          </span>
                          <span className="text-[12px] font-medium text-[var(--ios-label)] tabular-nums">
                            {item.durationMs} ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="w-full mt-1 py-2.5 px-3 bg-[var(--ios-blue)] text-white text-[13px] font-medium rounded-[12px] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <span>✓</span>
                      <span>{t.benchmarkReportCopied}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{t.benchmarkCopyReportAction}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </IosListSection>
        </div>
      </IosScreen>
    </>
  )
}
