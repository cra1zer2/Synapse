'use client'

import React, { useState, useEffect } from 'react'
import {
  Activity,
  Check,
  Copy,
  LogOut,
  Palette,
  Play,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCircle2
} from 'lucide-react'
import { SavedAccount, StudentProfile } from '@/models/account.model'
import {
  AppDictionary,
  AppLanguage,
  AppTheme,
  SUPPORTED_LANGUAGES,
  pickText
} from '@/config/dictionary.config'
import { isStudentUsername, resolveAvatarLetter, sanitizeAccountLabel } from '@/utils/account.util'
import {
  RequestLogItem,
  addRequestLog,
  clearRequestLogs,
  formatLogsForExport,
  getRequestLogs,
  subscribeToLogs
} from '@/utils/request-logger.util'
import { runDisplayDiagnosticsAction } from '@/app/actions'
import { AuthView } from '@/features/auth/auth-view'
import { cn } from '@/utils/cn.util'
import {
  MacDialogWindow,
  MacFormRow,
  MacGroupBox,
  MacPushButton,
  MacSegmentedControl,
  MacSwitch
} from './mac-primitives'

export type DesktopSettingsPane = 'account' | 'appearance' | 'features' | 'diagnostics'

interface DesktopSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialPane?: DesktopSettingsPane
  initialShowAddAccount?: boolean
  profile: StudentProfile | null
  savedAccounts: SavedAccount[]
  onSwitchAccount: (account: SavedAccount) => void
  onAddAccount: (e: React.FormEvent) => void
  onConfirmAddAccount: () => boolean
  onResetAddAccount: () => void
  addAccountStep: 'input' | 'verifying' | 'preview'
  setAddAccountStep: (s: 'input' | 'verifying' | 'preview') => void
  addAccountCandidate: StudentProfile | null
  addAccountError: string | null
  setAddAccountError: (err: string | null) => void
  newUsername: string
  setNewUsername: (u: string) => void
  newPassword: string
  setNewPassword: (p: string) => void
  currentLang: AppLanguage
  onSelectLang: (lang: AppLanguage) => void
  currentTheme: AppTheme
  onSelectTheme: (theme: AppTheme) => void
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  showHomeworks: boolean
  onToggleShowHomeworks: (val: boolean) => void
  enableGradeSimulator: boolean
  onToggleEnableGradeSimulator: (val: boolean) => void
  showLuckyNumberBanner: boolean
  onToggleShowLuckyNumberBanner: (val: boolean) => void
  isStudent: boolean
  allowStudentJustifications: boolean
  onToggleAllowStudentJustifications: (val: boolean) => void
  onLogout: () => void
  t: AppDictionary
}

export function DesktopSettingsModal({
  isOpen,
  onClose,
  initialPane = 'account',
  initialShowAddAccount = false,
  profile,
  savedAccounts,
  onSwitchAccount,
  onAddAccount,
  onConfirmAddAccount,
  onResetAddAccount,
  addAccountStep,
  setAddAccountStep,
  addAccountCandidate,
  addAccountError,
  setAddAccountError,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  currentLang,
  onSelectLang,
  currentTheme,
  onSelectTheme,
  showFullSubjectNames,
  onToggleShowFullSubjectNames,
  showHomeworks,
  onToggleShowHomeworks,
  enableGradeSimulator,
  onToggleEnableGradeSimulator,
  showLuckyNumberBanner,
  onToggleShowLuckyNumberBanner,
  isStudent,
  allowStudentJustifications,
  onToggleAllowStudentJustifications,
  onLogout,
  t
}: DesktopSettingsModalProps) {
  const [pane, setPane] = useState<DesktopSettingsPane>(initialPane)
  const [showAddForm, setShowAddForm] = useState(initialShowAddAccount)

  // Diagnostics state
  const [logs, setLogs] = useState<RequestLogItem[]>([])
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPane(initialPane)
      setShowAddForm(initialShowAddAccount)
    }
  }, [isOpen, initialPane, initialShowAddAccount])

  useEffect(() => {
    if (!isOpen || pane !== 'diagnostics') return
    setLogs(getRequestLogs())
    return subscribeToLogs((updated) => setLogs([...updated]))
  }, [isOpen, pane])

  const activeAccount = savedAccounts.find((a) => a.isActive) || savedAccounts[0]
  const activeUsername = activeAccount?.username || ''
  const activeRole = activeAccount?.role || profile?.role || 'student'
  const isStudentUser =
    isStudent !== undefined ? isStudent : activeRole === 'student' || isStudentUsername(activeUsername)
  const activeRawName = profile?.fullName || activeAccount?.profile?.fullName || activeUsername
  const avatarText = resolveAvatarLetter(activeRawName, activeUsername)
  const subtitle =
    [
      sanitizeAccountLabel(activeAccount?.profile?.className || profile?.className),
      sanitizeAccountLabel(activeAccount?.profile?.schoolName || profile?.schoolName)
    ]
      .filter(Boolean)
      .join(' · ') || 'Librus Synergia'

  const handleRunDiagnostics = async () => {
    if (!activeUsername || !activeAccount?.password || isRunningTest) return
    setIsRunningTest(true)
    const t0 = performance.now()
    const testLabel = pickText(currentLang, {
      pl: 'Test diagnostyczny (Wszystkie odczyty)',
      en: 'Diagnostic benchmark (all endpoints)'
    })
    try {
      const res = await runDisplayDiagnosticsAction(activeUsername, activeAccount.password, currentLang)
      const clientDurationMs = Math.round(performance.now() - t0)
      const breakdown: Record<string, number> = {}
      res.items?.forEach((item) => {
        breakdown[item.category || item.name] = item.durationMs
      })
      addRequestLog({
        name: testLabel,
        clientDurationMs,
        serverDurationMs: res.totalDurationMs,
        breakdown,
        status: res.success ? 'ok' : 'error',
        error: res.error,
        details: res.items ? `${res.items.length} endpoints` : undefined
      })
    } catch (err: unknown) {
      addRequestLog({
        name: testLabel,
        clientDurationMs: Math.round(performance.now() - t0),
        status: 'error',
        error: err instanceof Error ? err.message : 'Error'
      })
    } finally {
      setIsRunningTest(false)
    }
  }

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(formatLogsForExport(logs))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const navItems: Array<{ id: DesktopSettingsPane; label: string; icon: React.ReactNode }> = [
    {
      id: 'account',
      label: pickText(currentLang, { pl: 'Konto Librus', en: 'Librus Account' }),
      icon: <UserCircle2 className="w-4 h-4" />
    },
    {
      id: 'appearance',
      label: pickText(currentLang, { pl: 'Wygląd i język', en: 'Appearance & Language' }),
      icon: <Palette className="w-4 h-4" />
    },
    {
      id: 'features',
      label: pickText(currentLang, { pl: 'Widok i funkcje', en: 'Display & Features' }),
      icon: <SlidersHorizontal className="w-4 h-4" />
    },
    {
      id: 'diagnostics',
      label: pickText(currentLang, { pl: 'Diagnostyka API', en: 'API Diagnostics' }),
      icon: <Activity className="w-4 h-4" />
    }
  ]

  return (
    <MacDialogWindow
      isOpen={isOpen}
      onClose={onClose}
      title={t.settingsTitle}
      widthClass="max-w-[780px]"
      heightClass="h-[540px]"
      noPadding
    >
      <div className="h-full flex min-h-0 select-none">
        {/* System Settings Left Sidebar */}
        <aside className="w-[216px] shrink-0 border-r border-[var(--mac-row-divider)] bg-[var(--mac-sidebar-bg)] p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pane === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPane(item.id)
                  setShowAddForm(false)
                }}
                className={cn(
                  'w-full h-[32px] px-2.5 rounded-[8px] flex items-center gap-2.5 text-left text-[13px] cursor-pointer transition-colors',
                  active
                    ? 'bg-[var(--mac-sidebar-selected)] text-[var(--mac-label-1)] font-semibold'
                    : 'text-[var(--mac-label-1)] hover:bg-[var(--mac-sidebar-hover)]'
                )}
              >
                <span className={active ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-2)]'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Settings Content Pane */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5 flex flex-col gap-5">
          {pane === 'account' &&
            (showAddForm ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[var(--mac-label-1)]">{t.addAccount}</h3>
                  <MacPushButton
                    size="rg"
                    variant="ghost"
                    onClick={() => {
                      setShowAddForm(false)
                      onResetAddAccount()
                    }}
                  >
                    {t.cancel}
                  </MacPushButton>
                </div>
                <AuthView
                  authStep={addAccountStep}
                  username={newUsername}
                  setUsername={setNewUsername}
                  password={newPassword}
                  setPassword={setNewPassword}
                  authError={addAccountError}
                  onClearError={() => setAddAccountError(null)}
                  verifiedCandidate={addAccountCandidate}
                  onStartVerification={onAddAccount}
                  onConfirmLogin={() => {
                    if (onConfirmAddAccount()) setShowAddForm(false)
                  }}
                  onBackToInput={() => setAddAccountStep('input')}
                  onCancel={() => {
                    setShowAddForm(false)
                    onResetAddAccount()
                  }}
                  isSubView
                  lang={currentLang}
                  t={t}
                />
              </div>
            ) : (
              <>
                <MacGroupBox>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] flex items-center justify-center font-bold text-[16px] shrink-0">
                        {avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-[var(--mac-label-1)] truncate">
                          {activeRawName}
                        </div>
                        <div className="text-[12px] text-[var(--mac-label-2)] truncate">{subtitle}</div>
                        <div className="text-[11px] text-[var(--mac-label-3)] mt-0.5">
                          Login: {activeUsername}
                        </div>
                      </div>
                    </div>
                    <MacPushButton
                      variant="destructive"
                      size="lg"
                      onClick={() => {
                        onClose()
                        onLogout()
                      }}
                      icon={<LogOut className="w-3.5 h-3.5" />}
                    >
                      {t.logout}
                    </MacPushButton>
                  </div>
                </MacGroupBox>

                <MacGroupBox
                  title={pickText(currentLang, { pl: 'Zapisane konta', en: 'Saved Accounts' })}
                  trailing={
                    <MacPushButton
                      size="sm"
                      variant="tinted"
                      onClick={() => {
                        onResetAddAccount()
                        setShowAddForm(true)
                      }}
                      icon={<Plus className="w-3 h-3" />}
                    >
                      {t.addAccount}
                    </MacPushButton>
                  }
                  noPadding
                >
                  {savedAccounts.map((acc, idx) => {
                    const isCurrent = acc.id === activeAccount?.id
                    return (
                      <MacFormRow
                        key={acc.id}
                        isLast={idx === savedAccounts.length - 1}
                        title={acc.profile?.fullName || acc.username}
                        subtitle={`${acc.role === 'student' ? t.studentRole : t.parentRole} · ${acc.username}`}
                        trailing={
                          isCurrent ? (
                            <span className="text-[11.5px] font-semibold text-[var(--mac-blue)] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              {pickText(currentLang, { pl: 'Aktywne', en: 'Active' })}
                            </span>
                          ) : (
                            <MacPushButton
                              size="sm"
                              variant="bordered"
                              onClick={() => {
                                onSwitchAccount(acc)
                                onClose()
                              }}
                            >
                              {t.switchAccount}
                            </MacPushButton>
                          )
                        }
                      />
                    )
                  })}
                </MacGroupBox>
              </>
            ))}

          {pane === 'appearance' && (
            <MacGroupBox title={t.preferences} noPadding>
              <MacFormRow
                title={t.appTheme}
                subtitle={pickText(currentLang, {
                  pl: 'Dopasuj jasny lub ciemny motyw macOS 27',
                  en: 'Choose macOS 27 light, dark, or automatic theme'
                })}
                trailing={
                  <MacSegmentedControl<AppTheme>
                    value={currentTheme}
                    onChange={onSelectTheme}
                    options={[
                      { id: 'system', label: t.themeSystem },
                      { id: 'light', label: t.themeLight },
                      { id: 'dark', label: t.themeDark }
                    ]}
                    className="w-[220px]"
                  />
                }
              />
              <MacFormRow
                isLast
                title={t.appLanguage}
                subtitle={pickText(currentLang, {
                  pl: 'Język interfejsu i automatycznego tłumaczenia wpisów',
                  en: 'Interface language and automatic Librus content translation'
                })}
                trailing={
                  <MacSegmentedControl<AppLanguage>
                    value={currentLang}
                    onChange={onSelectLang}
                    options={SUPPORTED_LANGUAGES.map((l) => ({ id: l.id, label: l.nativeName }))}
                    className="w-[180px]"
                  />
                }
              />
            </MacGroupBox>
          )}

          {pane === 'features' && (
            <>
              <MacGroupBox title={t.displaySectionTitle} noPadding>
                <MacFormRow
                  title={pickText(currentLang, { pl: 'Pokazuj pełne nazwy przedmiotów', en: 'Show full subject names' })}
                  subtitle={pickText(currentLang, {
                    pl: 'Wyświetlaj nieskrócone nazwy przedmiotów w planie i ocenach',
                    en: 'Display unabbreviated subject titles across timetable and grades'
                  })}
                  trailing={
                    <MacSwitch
                      checked={showFullSubjectNames}
                      onChange={onToggleShowFullSubjectNames}
                    />
                  }
                />
                <MacFormRow
                  title={pickText(currentLang, { pl: 'Pokazuj zadania domowe', en: 'Show homework assignments' })}
                  subtitle={pickText(currentLang, {
                    pl: 'Uwzględniaj zadania domowe w terminarzu i na pulpicie',
                    en: 'Include homework tasks in deadlines and overview'
                  })}
                  trailing={<MacSwitch checked={showHomeworks} onChange={onToggleShowHomeworks} />}
                />
                <MacFormRow
                  isLast
                  title={pickText(currentLang, { pl: 'Szczęśliwy numerek', en: 'Lucky number badge' })}
                  subtitle={pickText(currentLang, {
                    pl: 'Wyświetlaj dzienny szczęśliwy numerek w pasku bocznym',
                    en: 'Show daily lucky number indicator in the sidebar'
                  })}
                  trailing={
                    <MacSwitch
                      checked={showLuckyNumberBanner}
                      onChange={onToggleShowLuckyNumberBanner}
                    />
                  }
                />
              </MacGroupBox>

              <MacGroupBox title={t.gradesCalcSectionTitle} noPadding>
                <MacFormRow
                  isLast={!isStudentUser}
                  title={pickText(currentLang, { pl: 'Symulator ocen (What-If)', en: 'What-If grade simulator' })}
                  subtitle={pickText(currentLang, {
                    pl: 'Włącz panel kalkulatora ocen po prawej stronie w zakładce Oceny',
                    en: 'Enable the docked What-If calculator inspector in Grades'
                  })}
                  trailing={
                    <MacSwitch
                      checked={enableGradeSimulator}
                      onChange={onToggleEnableGradeSimulator}
                    />
                  }
                />
                {isStudentUser && (
                  <MacFormRow
                    isLast
                    title={t.studentJustificationsTitle}
                    subtitle={t.studentJustificationsDescription}
                    trailing={
                      <MacSwitch
                        checked={allowStudentJustifications}
                        onChange={onToggleAllowStudentJustifications}
                      />
                    }
                  />
                )}
              </MacGroupBox>
            </>
          )}

          {pane === 'diagnostics' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MacPushButton
                    variant="prominent"
                    size="lg"
                    loading={isRunningTest}
                    disabled={isRunningTest || !activeUsername || !activeAccount?.password}
                    onClick={handleRunDiagnostics}
                    icon={<Play className="w-3.5 h-3.5" />}
                  >
                    {pickText(currentLang, { pl: 'Uruchom test API', en: 'Run latency test' })}
                  </MacPushButton>
                  <MacPushButton
                    variant="bordered"
                    size="lg"
                    onClick={handleCopyLogs}
                    icon={copied ? <Check className="w-3.5 h-3.5 text-[var(--mac-green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied
                      ? pickText(currentLang, { pl: 'Skopiowano', en: 'Copied' })
                      : pickText(currentLang, { pl: 'Kopiuj log', en: 'Copy log' })}
                  </MacPushButton>
                </div>
                {logs.length > 0 && (
                  <MacPushButton
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      clearRequestLogs()
                      setLogs([])
                    }}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    {pickText(currentLang, { pl: 'Wyczyść', en: 'Clear' })}
                  </MacPushButton>
                )}
              </div>

              <MacGroupBox noPadding>
                {logs.length > 0 ? (
                  <div className="divide-y divide-[var(--mac-row-divider)]">
                    {logs.map((item) => (
                      <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12px]">
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--mac-label-1)] truncate">{item.name}</div>
                          <div className="text-[10.5px] text-[var(--mac-label-2)] font-mono">
                            {item.timestamp} {item.details ? `· ${item.details}` : ''}
                          </div>
                          {item.error && (
                            <div className="text-[11px] text-[var(--mac-red)] mt-0.5">{item.error}</div>
                          )}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums shrink-0',
                            item.clientDurationMs >= 3000
                              ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                              : item.clientDurationMs >= 1200
                                ? 'bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)]'
                                : 'bg-[var(--ios-green-subtle)] text-[var(--mac-green)]'
                          )}
                        >
                          {item.clientDurationMs} ms
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[12px] text-[var(--mac-label-2)]">
                    {pickText(currentLang, { pl: 'Brak zarejestrowanych zapytań', en: 'No requests recorded yet' })}
                  </div>
                )}
              </MacGroupBox>
            </div>
          )}
        </div>
      </div>
    </MacDialogWindow>
  )
}
