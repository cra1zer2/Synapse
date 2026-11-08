'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption, DashboardWidgetId } from '@/app/page'
import { IosScreen, IOS_PANEL_TRANSITION, IOS_BACKDROP_TRANSITION, IOS_PARALLAX_PERCENT } from '@/components/ios/ios-screen'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosCard } from '@/components/ios/ios-ui'
import { IosSwitch } from '@/components/ios/ios-switch'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { AuthView } from '@/components/auth/auth-view'

const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'grades',
  'schedule',
  'upcoming',
  'messages',
  'attendance'
]

const DEFAULT_DASHBOARD_VISIBLE: Record<DashboardWidgetId, boolean> = {
  grades: true,
  schedule: true,
  upcoming: false,
  messages: true,
  attendance: true
}

interface SettingsSheetProps {
  isOpen: boolean
  onClose: () => void
  profile: StudentProfile | null
  savedAccounts?: SavedAccount[]
  onSwitchAccount: (account: SavedAccount) => void
  onAddAccount: (e: React.FormEvent) => void
  onConfirmAddAccount?: () => boolean
  onResetAddAccount?: () => void
  addAccountStep?: 'input' | 'verifying' | 'preview'
  setAddAccountStep?: (s: 'input' | 'verifying' | 'preview') => void
  addAccountCandidate?: StudentProfile | null
  addAccountError?: string | null
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
  enableGradeSimulator?: boolean
  onToggleEnableGradeSimulator?: (val: boolean) => void
  showHomeworks?: boolean
  onToggleShowHomeworks?: (val: boolean) => void
  showUpcomingEventsWidget?: boolean
  onToggleShowUpcomingEventsWidget?: (val: boolean) => void
  dashboardOrder?: DashboardWidgetId[]
  onChangeDashboardOrder?: (newOrder: DashboardWidgetId[]) => void
  dashboardVisible?: Record<DashboardWidgetId, boolean>
  onToggleDashboardWidget?: (id: DashboardWidgetId, val: boolean) => void
  showLuckyNumberBanner?: boolean
  onToggleShowLuckyNumberBanner?: (val: boolean) => void
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
  onConfirmAddAccount,
  onResetAddAccount,
  addAccountStep = 'input',
  setAddAccountStep,
  addAccountCandidate = null,
  addAccountError = null,
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
  enableGradeSimulator = false,
  onToggleEnableGradeSimulator,
  showHomeworks = false,
  onToggleShowHomeworks,
  showUpcomingEventsWidget = false,
  onToggleShowUpcomingEventsWidget,
  dashboardOrder = DEFAULT_DASHBOARD_ORDER,
  onChangeDashboardOrder,
  dashboardVisible = DEFAULT_DASHBOARD_VISIBLE,
  onToggleDashboardWidget,
  showLuckyNumberBanner = false,
  onToggleShowLuckyNumberBanner,
  isStudent,
  allowStudentJustifications = false,
  onToggleAllowStudentJustifications,
  onLogout,
  t
}: SettingsSheetProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false)
  const [isEditingHome, setIsEditingHome] = useState(false)
  const [movingWidgetId, setMovingWidgetId] = useState<DashboardWidgetId | null>(null)
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

  const handleCloseAddForm = () => {
    setShowAddForm(false)
    if (onResetAddAccount) {
      onResetAddAccount()
    }
  }

  const handleConfirmAdd = () => {
    if (onConfirmAddAccount) {
      const ok = onConfirmAddAccount()
      if (ok) {
        setShowAddForm(false)
      }
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
        isReceded={showThemePicker || showLangPicker || showAdvanced || showAddForm || showHomeCustomizer}
        contentClassName="px-6 pt-5 pb-12 w-full max-w-4xl mx-auto flex-1"
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
                if (onResetAddAccount) onResetAddAccount()
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
              title={currentLang === 'en' ? 'Home Screen' : 'Ekran główny'}
              subtitle={currentLang === 'en' ? 'Customize visible widgets and their order' : 'Wybierz widoczne karty i ich kolejność'}
              chevron={true}
              size="tall"
              onClick={() => {
                setIsEditingHome(false)
                setShowHomeCustomizer(true)
              }}
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
              className="w-[308px] bg-[var(--ios-card-solid)] rounded-[34px] p-[14px] pt-[22px] border border-[var(--ios-border)] flex flex-col gap-5 text-center -mt-10 md:-mt-14"
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
                  className="h-[48px] w-full rounded-full bg-[var(--ios-blue)] text-white text-[17px] font-semibold tracking-[-0.3px] active:scale-[0.96] active:opacity-85 transition-[transform,opacity] duration-150 flex items-center justify-center cursor-pointer select-none"
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
        onClose={addAccountStep === 'preview' ? () => setAddAccountStep?.('input') : handleCloseAddForm}
        title={t.addAccount}
        backLabel={t.settingsTitle || t.backAction}
        showBackButton={true}
        hideHeader={true}
        isSubView={true}
        zIndex={70}
      >
        <AuthView
          authStep={addAccountStep}
          username={newUsername}
          setUsername={setNewUsername}
          password={newPassword}
          setPassword={setNewPassword}
          authError={addAccountError}
          verifiedCandidate={addAccountCandidate}
          onStartVerification={onAddAccount}
          onConfirmLogin={handleConfirmAdd}
          onBackToInput={() => {
            if (setAddAccountStep) setAddAccountStep('input')
          }}
          onCancel={handleCloseAddForm}
          isSubView={true}
          lang={currentLang}
          t={t}
        />
      </IosScreen>

      <IosScreen
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        title={t.appTheme}
        backLabel={t.settingsTitle || t.backAction}
        showBackButton={true}
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
        backLabel={t.settingsTitle || t.backAction}
        showBackButton={true}
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
        backLabel={t.settingsTitle || t.backAction}
        showBackButton={true}
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
            {onToggleShowUpcomingEventsWidget && (
              <IosCell
                title={currentLang === 'en' ? 'Upcoming tests widget' : 'Widżet sprawdzianów i terminów'}
                subtitle={currentLang === 'en' ? 'Show upcoming exams and quizzes on dashboard' : 'Pokazuj najbliższe sprawdziany i kartkówki na pulpicie'}
                size="tall"
                trailing={
                  <IosSwitch
                    checked={Boolean(showUpcomingEventsWidget)}
                    onChange={() => onToggleShowUpcomingEventsWidget(!showUpcomingEventsWidget)}
                  />
                }
              />
            )}
            {onToggleShowHomeworks && (
              <IosCell
                title={currentLang === 'en' ? 'Show homework assignments' : 'Pokazuj zadania domowe'}
                subtitle={currentLang === 'en' ? 'Include homework tasks in schedule and upcoming events' : 'Uwzględniaj zadania domowe w terminarzu i planie'}
                size="tall"
                trailing={
                  <IosSwitch
                    checked={Boolean(showHomeworks)}
                    onChange={() => onToggleShowHomeworks(!showHomeworks)}
                  />
                }
              />
            )}
            {onToggleShowLuckyNumberBanner && (
              <IosCell
                title={currentLang === 'en' ? 'Lucky number banner' : 'Powiadomienie o szczęśliwym numerku'}
                subtitle={currentLang === 'en' ? 'Highlight at the top of the day when lucky number matches yours' : 'Pokazuj pasek na górze ekranu w dniu Twojego szczęśliwego numerka'}
                size="tall"
                trailing={
                  <IosSwitch
                    checked={Boolean(showLuckyNumberBanner)}
                    onChange={() => onToggleShowLuckyNumberBanner(!showLuckyNumberBanner)}
                  />
                }
              />
            )}
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
            {onToggleEnableGradeSimulator && (
              <IosCell
                title={currentLang === 'en' ? 'Grade simulator (What-if)' : 'Symulator ocen (Co jeśli?)'}
                subtitle={currentLang === 'en' ? 'Add virtual grades inside subjects to test average changes' : 'Dodawaj wirtualne oceny i sprawdzaj, jak zmieni się średnia'}
                size="tall"
                trailing={
                  <IosSwitch
                    checked={Boolean(enableGradeSimulator)}
                    onChange={() => onToggleEnableGradeSimulator(!enableGradeSimulator)}
                  />
                }
              />
            )}
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
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showHomeCustomizer}
        onClose={() => {
          setShowHomeCustomizer(false)
          setIsEditingHome(false)
        }}
        title={currentLang === 'en' ? 'Home Screen' : 'Ekran główny'}
        backLabel={t.settingsTitle || t.backAction}
        showBackButton={true}
        isSubView={true}
        zIndex={60}
        trailing={
          <button
            type="button"
            onClick={() => setIsEditingHome((prev) => !prev)}
            className={
              'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none active:scale-90 ' +
              (isEditingHome
                ? 'bg-[var(--ios-blue)] text-white'
                : 'bg-[var(--ios-element)] text-[var(--ios-blue)] hover:opacity-80')
            }
            aria-label={isEditingHome ? 'Gotowe' : 'Edytuj'}
            title={isEditingHome ? (currentLang === 'en' ? 'Done' : 'Gotowe') : (currentLang === 'en' ? 'Edit' : 'Edytuj')}
          >
            {isEditingHome ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            )}
          </button>
        }
      >
        {(() => {
          const isEn = currentLang === 'en'
          const widgetMeta: Record<DashboardWidgetId, { title: string; subtitle: string; color: string; icon: React.ReactNode }> = {
            grades: {
              title: t.grades,
              subtitle: isEn ? 'Recent grades and average' : 'Ostatnie oceny i średnia',
              color: 'bg-[var(--ios-blue)]',
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )
            },
            schedule: {
              title: isEn ? 'Lesson Plan' : 'Plan lekcji',
              subtitle: isEn ? 'Daily classes and rooms' : 'Dzisiejsze lekcje i sale',
              color: 'bg-[var(--ios-green)]',
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              )
            },
            upcoming: {
              title: isEn ? 'Tests & Deadlines' : 'Sprawdziany i terminy',
              subtitle: isEn ? 'Upcoming exams and quizzes' : 'Nadchodzące sprawdziany i kartkówki',
              color: 'bg-[var(--ios-orange)]',
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )
            },
            attendance: {
              title: t.attendance,
              subtitle: isEn ? 'Attendance percentage and today grid' : 'Frekwencja ogólna i dzisiejsze obecności',
              color: 'bg-[var(--ios-purple)]',
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <polyline points="16 11 18 13 22 9" />
                </svg>
              )
            },
            messages: {
              title: t.messages,
              subtitle: isEn ? 'Inbox and school announcements' : 'Odebrane wiadomości i ogłoszenia',
              color: 'bg-[var(--ios-blue)]',
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="3" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              )
            }
          }

          const enabledList = dashboardOrder.filter((id) => dashboardVisible[id])
          const disabledList = dashboardOrder.filter((id) => !dashboardVisible[id])

          const ROW_HEIGHT = 64
          const GAP = 10
          const STEP = ROW_HEIGHT + GAP
          const HIDDEN_HEADER_OFFSET = enabledList.length > 0 ? 44 : 28

          const totalHeight =
            enabledList.length * STEP +
            (disabledList.length > 0
              ? HIDDEN_HEADER_OFFSET + disabledList.length * STEP
              : 0)

          const triggerMoveAnimation = (id: DashboardWidgetId) => {
            setMovingWidgetId(id)
            setTimeout(() => {
              setMovingWidgetId((curr) => (curr === id ? null : curr))
            }, 520)
          }

          const handleMoveWidget = (id: DashboardWidgetId, direction: -1 | 1) => {
            if (!onChangeDashboardOrder) return
            const activeIds = dashboardOrder.filter((item) => dashboardVisible[item])
            const inactiveIds = dashboardOrder.filter((item) => !dashboardVisible[item])
            const idx = activeIds.indexOf(id)
            const targetIdx = idx + direction
            if (idx < 0 || targetIdx < 0 || targetIdx >= activeIds.length) return

            triggerMoveAnimation(id)
            const nextActive = [...activeIds]
            const temp = nextActive[idx]
            nextActive[idx] = nextActive[targetIdx]
            nextActive[targetIdx] = temp
            onChangeDashboardOrder([...nextActive, ...inactiveIds])
          }

          const handleToggleWidget = (id: DashboardWidgetId) => {
            if (!onToggleDashboardWidget || !onChangeDashboardOrder) return
            const currentlyVisible = Boolean(dashboardVisible[id])
            const nextVisible = !currentlyVisible

            triggerMoveAnimation(id)
            const activeIds = dashboardOrder.filter((item) => item !== id && dashboardVisible[item])
            const inactiveIds = dashboardOrder.filter((item) => item !== id && !dashboardVisible[item])

            if (nextVisible) {
              onChangeDashboardOrder([...activeIds, id, ...inactiveIds])
            } else {
              onChangeDashboardOrder([...activeIds, id, ...inactiveIds])
            }
            onToggleDashboardWidget(id, nextVisible)
          }

          return (
            <div className="flex flex-col gap-4 pb-16 select-none max-w-xl mx-auto w-full">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[12px] font-normal uppercase text-[var(--ios-secondary)] tracking-wider">
                  {isEn ? 'Active widgets on home screen' : 'Aktywne widżety na ekranie głównym'}
                </span>
                {!isEditingHome && (
                  <span className="text-[12px] font-normal text-[var(--ios-secondary)]">
                    {isEn ? 'Tap pencil to edit' : 'Kliknij ołówek, aby edytować'}
                  </span>
                )}
              </div>

              <div
                style={{
                  height: `${Math.max(totalHeight, 64)}px`,
                  transition: 'height 520ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="relative w-full"
              >
                {/* Hidden Widgets Section Header */}
                <div
                  style={{
                    transform: `translate3d(0, ${enabledList.length * STEP + (enabledList.length > 0 ? 14 : 0)}px, 0)`,
                    opacity: disabledList.length > 0 ? 1 : 0,
                    transition:
                      'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  className="absolute top-0 left-1 right-1 pointer-events-none z-0 flex items-center justify-between"
                >
                  <span className="text-[12px] font-normal uppercase text-[var(--ios-secondary)] tracking-wider">
                    {isEn ? 'Hidden widgets' : 'Wyłączone widżety'}
                  </span>
                </div>

                {/* All 5 Widgets rendered in stable DOM order so CSS transitions always fire smoothly */}
                {DEFAULT_DASHBOARD_ORDER.map((id) => {
                  const meta = widgetMeta[id]
                  const isVisible = Boolean(dashboardVisible[id])
                  const activeIdx = enabledList.indexOf(id)
                  const hiddenIdx = disabledList.indexOf(id)

                  const yPos = isVisible
                    ? activeIdx * STEP
                    : enabledList.length * STEP + HIDDEN_HEADER_OFFSET + Math.max(0, hiddenIdx) * STEP

                  const isMoving = movingWidgetId === id
                  const canMoveUp = isVisible && activeIdx > 0
                  const canMoveDown = isVisible && activeIdx < enabledList.length - 1

                  return (
                    <div
                      key={id}
                      style={{
                        height: `${ROW_HEIGHT}px`,
                        transform: `translate3d(0, ${yPos}px, 0) scale(${isMoving ? 1.022 : 1})`,
                        transition:
                          'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1)',
                        zIndex: isMoving ? 30 : isVisible ? 15 : 10,
                        boxShadow: isMoving ? '0 14px 32px rgba(0, 0, 0, 0.18)' : 'none'
                      }}
                      className={
                        'absolute top-0 left-0 right-0 rounded-[20px] bg-[var(--ios-card-solid)] px-3.5 flex items-center justify-between gap-3 border border-[var(--ios-border)] ' +
                        (!isVisible ? 'opacity-65' : 'opacity-100')
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-[11px] ${meta.color} text-white flex items-center justify-center shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-tight">
                            {meta.title}
                          </span>
                          <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-tight mt-0.5">
                            {meta.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Edit controls: Up/Down arrows + Switch appear smoothly when pencil is active */}
                      <div
                        style={{
                          opacity: isEditingHome ? 1 : 0,
                          transform: isEditingHome ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(8px, 0, 0) scale(0.92)',
                          pointerEvents: isEditingHome ? 'auto' : 'none',
                          transition:
                            'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        className="flex items-center gap-2 shrink-0"
                      >
                        {isVisible && (
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              type="button"
                              disabled={!canMoveUp}
                              onClick={() => handleMoveWidget(id, -1)}
                              className={
                                'w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ' +
                                (canMoveUp
                                  ? 'bg-[var(--ios-element)] text-[var(--ios-label)] active:scale-90 hover:bg-[var(--ios-blue-subtle)] hover:text-[var(--ios-blue)]'
                                  : 'bg-[var(--ios-element)]/40 text-[var(--ios-tertiary)] opacity-40 cursor-not-allowed')
                              }
                              aria-label="Move up"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="18 15 12 9 6 15" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              disabled={!canMoveDown}
                              onClick={() => handleMoveWidget(id, 1)}
                              className={
                                'w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ' +
                                (canMoveDown
                                  ? 'bg-[var(--ios-element)] text-[var(--ios-label)] active:scale-90 hover:bg-[var(--ios-blue-subtle)] hover:text-[var(--ios-blue)]'
                                  : 'bg-[var(--ios-element)]/40 text-[var(--ios-tertiary)] opacity-40 cursor-not-allowed')
                              }
                              aria-label="Move down"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        )}

                        <IosSwitch
                          checked={isVisible}
                          onChange={() => handleToggleWidget(id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </IosScreen>
    </>
  )
}
