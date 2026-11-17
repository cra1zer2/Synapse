'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import {
  AppDictionary,
  AppLanguage,
  AppTheme,
  NavMode,
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  pickText,
} from '@/config/dictionary.config'
import { DashboardWidgetId, DEFAULT_DASHBOARD_ORDER, DEFAULT_DASHBOARD_VISIBLE } from '@/hooks/settings.hook'
import { isStudentUsername, resolveAvatarLetter, sanitizeAccountLabel } from '@/utils/account.util'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiListSection, UiCell } from '@/components/ui/ui-list'
import { UiAlert } from '@/components/ui/ui-alert'
import { UiCard } from '@/components/ui/ui-controls'
import { AuthView } from '@/features/auth/auth-view'
import { RequestTimingsModal } from './request-timings-modal'
import { AdvancedSettingsScreen } from './advanced-settings-screen'
import { HomeCustomizerScreen } from './home-customizer-screen'

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
  setAddAccountError?: (err: string | null) => void
  newUsername: string
  setNewUsername: (u: string) => void
  newPassword: string
  setNewPassword: (p: string) => void
  currentLang: AppLanguage
  onSelectLang: (lang: AppLanguage) => void
  currentTheme: AppTheme
  onSelectTheme: (theme: AppTheme) => void
  navMode?: NavMode
  onSelectNavMode?: (mode: NavMode) => void
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  showMobileTodayAttendance?: boolean
  onToggleMobileTodayAttendance?: (val: boolean) => void
  enableGradeSimulator?: boolean
  onToggleEnableGradeSimulator?: (val: boolean) => void
  showHomeworks?: boolean
  onToggleShowHomeworks?: (val: boolean) => void
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

function resolveAccountTitle(fullName: string | undefined, role: 'student' | 'parent', t: AppDictionary): string {
  if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
    return fullName
  }
  return role === 'parent' ? t.parentRoleTitle : t.studentRoleTitle
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
  setAddAccountError,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  currentLang,
  onSelectLang,
  currentTheme,
  onSelectTheme,
  navMode = 'widgets',
  onSelectNavMode,
  showFullSubjectNames,
  onToggleShowFullSubjectNames,
  showMobileTodayAttendance = false,
  onToggleMobileTodayAttendance,
  enableGradeSimulator = true,
  onToggleEnableGradeSimulator,
  showHomeworks = false,
  onToggleShowHomeworks,
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
  t,
}: SettingsSheetProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false)
  const [showTimingsDebug, setShowTimingsDebug] = useState(false)
  const [accountToSwitch, setAccountToSwitch] = useState<SavedAccount | null>(null)
  const [cachedSwitchAccount, setCachedSwitchAccount] = useState<SavedAccount | null>(null)
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (accountToSwitch) setCachedSwitchAccount(accountToSwitch)
  }, [accountToSwitch])

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current)
    }
  }, [])

  const handleConfirmSwitchAccount = () => {
    const acc = accountToSwitch || cachedSwitchAccount
    if (!acc) return
    setAccountToSwitch(null)
    onClose()
    onSwitchAccount(acc)
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current)
    switchTimerRef.current = setTimeout(() => setCachedSwitchAccount(null), 300)
  }

  const accountsList = Array.isArray(savedAccounts) ? savedAccounts : []
  const activeAccount = accountsList.find((a) => a.isActive) || accountsList[0]
  const activeRole = activeAccount?.role || profile?.role || 'student'
  const activeUsername = activeAccount?.username || ''
  const isStudentUser =
    isStudent !== undefined ? isStudent : activeRole === 'student' || isStudentUsername(activeUsername)
  const activeRawName = profile?.fullName || activeAccount?.profile?.fullName || ''
  const heroTitle = resolveAccountTitle(activeRawName, activeRole, t)
  const heroAvatar = resolveAvatarLetter(activeRawName, activeUsername)
  const heroSubtitle =
    [
      sanitizeAccountLabel(activeAccount?.profile?.className || profile?.className),
      sanitizeAccountLabel(activeAccount?.profile?.schoolName || profile?.schoolName),
    ]
      .filter(Boolean)
      .join(' • ') || 'Librus Synergia'

  const handleCloseAddForm = () => {
    setShowAddForm(false)
    onResetAddAccount?.()
  }

  const handleConfirmAdd = () => {
    if (onConfirmAddAccount?.()) setShowAddForm(false)
  }

  const themeLabel = currentTheme === 'system' ? t.themeSystem : currentTheme === 'light' ? t.themeLight : t.themeDark
  const langLabel = getLanguageMeta(currentLang).nativeName
  const targetSwitchAcc = accountToSwitch || cachedSwitchAccount
  const targetTitle = targetSwitchAcc
    ? resolveAccountTitle(targetSwitchAcc.profile?.fullName, targetSwitchAcc.role, t)
    : ''
  const targetAvatar = targetSwitchAcc
    ? resolveAvatarLetter(targetSwitchAcc.profile?.fullName, targetSwitchAcc.username)
    : ''
  const targetRoleLabel = targetSwitchAcc
    ? targetSwitchAcc.role === 'student'
      ? t.studentRole
      : t.parentRole
    : ''

  return (
    <>
      <UiScreen
        isOpen={isOpen}
        onClose={onClose}
        title={t.settingsTitle}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={
          showThemePicker || showLangPicker || showAdvanced || showAddForm || showHomeCustomizer || showTimingsDebug
        }
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <div className="ios-card rounded-[26px] overflow-hidden">
            <div className="p-4 flex items-center gap-3.5 border-b [border-bottom-width:0.5px] border-[var(--ios-separator)]">
              <div className="rounded-full flex items-center justify-center font-semibold shrink-0 w-11 h-11 bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)] text-[15px]">
                {heroAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] truncate leading-snug">
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
              const accTitle = resolveAccountTitle(acc.profile?.fullName, acc.role, t)
              return (
                <UiCell
                  key={acc.id}
                  onClick={() => {
                    if (!isCurrent) setAccountToSwitch(acc)
                  }}
                  title={accTitle}
                  subtitle={accRole + ' • ' + acc.username}
                  size="tall"
                  trailing={
                    isCurrent ? (
                      <Check className="w-4 h-4 text-[var(--ios-blue)] mr-1" strokeWidth={2.5} />
                    ) : (
                      <span className="text-[14px] font-medium text-[var(--ios-blue)]">{t.switchAccount}</span>
                    )
                  }
                />
              )
            })}
            <button
              type="button"
              onClick={() => {
                onResetAddAccount?.()
                setShowAddForm(true)
              }}
              className="w-full p-4 text-left text-[15px] font-medium text-[var(--ios-blue)] tracking-[-0.2px] flex items-center justify-between hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer"
            >
              <span>+ {t.addAccount}</span>
              <ChevronRight className="w-4 h-4 text-[var(--ios-tertiary)]" strokeWidth={2.5} />
            </button>
          </div>

          <UiListSection header={t.preferences}>
            <UiCell
              title={t.appTheme}
              detail={themeLabel}
              chevron={true}
              size="standard"
              onClick={() => setShowThemePicker(true)}
            />
            <UiCell
              title={t.appLanguage}
              detail={langLabel}
              chevron={true}
              size="standard"
              onClick={() => setShowLangPicker(true)}
            />
            <UiCell
              title={pickText(currentLang, { pl: 'Ekran główny', en: 'Home Screen' })}
              subtitle={
                navMode === 'tabs'
                  ? t.navModeDesc
                  : pickText(currentLang, {
                      pl: 'Wybierz widoczne karty i ich kolejność',
                      en: 'Customize visible widgets and their order',
                    })
              }
              detail={navMode === 'tabs' ? t.navModeTabs : undefined}
              chevron={true}
              size="tall"
              onClick={() => setShowHomeCustomizer(true)}
            />
          </UiListSection>

          <UiListSection header={t.systemSection}>
            <UiCell
              title={t.advancedTitle}
              subtitle={pickText(currentLang, {
                pl: 'Wyświetlanie, kalkulator ocen i opcje',
                en: 'Display, grade calculation and options',
              })}
              size="tall"
              chevron={true}
              onClick={() => setShowAdvanced(true)}
            />
          </UiListSection>

          <UiCard className="overflow-hidden">
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-center h-[52px] text-[16px] font-medium text-[var(--ios-red)] tracking-[-0.2px] hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer flex items-center justify-center"
            >
              {t.logout}
            </button>
          </UiCard>
        </div>
      </UiScreen>

      <UiAlert
        isOpen={Boolean(accountToSwitch)}
        onClose={() => setAccountToSwitch(null)}
        title={`${t.switchAccount}?`}
        subtitle={targetTitle}
        message={targetSwitchAcc ? `${targetRoleLabel} • ${targetSwitchAcc.username}` : undefined}
        icon={
          <div className="w-11 h-11 rounded-full bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)] flex items-center justify-center font-semibold text-[15px]">
            {targetAvatar}
          </div>
        }
        actions={[
          { label: t.cancel, variant: 'secondary', onClick: () => setAccountToSwitch(null) },
          { label: t.switchAccount, variant: 'primary', onClick: handleConfirmSwitchAccount },
        ]}
      />

      <UiScreen
        isOpen={showAddForm}
        onClose={addAccountStep === 'preview' ? () => setAddAccountStep?.('input') : handleCloseAddForm}
        title={addAccountStep === 'preview' ? t.accountVerified || t.addAccount : t.addAccount}
        backLabel={addAccountStep === 'preview' ? t.backAction || t.backLabel : t.settingsTitle || t.backAction}
        isSubView={true}
        zIndex={70}
        contentClassName="px-4 py-2 max-w-[480px] mx-auto w-full flex-1 flex flex-col justify-center"
      >
        <AuthView
          authStep={addAccountStep}
          username={newUsername}
          setUsername={setNewUsername}
          password={newPassword}
          setPassword={setNewPassword}
          authError={addAccountError}
          onClearError={() => setAddAccountError?.(null)}
          verifiedCandidate={addAccountCandidate}
          onStartVerification={onAddAccount}
          onConfirmLogin={handleConfirmAdd}
          onBackToInput={() => setAddAccountStep?.('input')}
          onCancel={handleCloseAddForm}
          isSubView={true}
          lang={currentLang}
          t={t}
        />
      </UiScreen>

      <UiScreen
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        title={t.appTheme}
        backLabel={t.settingsTitle || t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <UiListSection>
            {[
              { id: 'system' as AppTheme, label: t.themeSystem },
              { id: 'light' as AppTheme, label: t.themeLight },
              { id: 'dark' as AppTheme, label: t.themeDark },
            ].map((th) => (
              <UiCell
                key={th.id}
                title={th.label}
                onClick={() => {
                  onSelectTheme(th.id)
                  setShowThemePicker(false)
                }}
                trailing={currentTheme === th.id ? <Check className="w-4 h-4 text-[var(--ios-blue)]" strokeWidth={2.5} /> : null}
              />
            ))}
          </UiListSection>
        </div>
      </UiScreen>

      <UiScreen
        isOpen={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        title={t.appLanguage}
        backLabel={t.settingsTitle || t.backAction}
        isSubView={true}
        zIndex={60}
      >
        <div className="flex flex-col gap-5 pb-12 select-none">
          <UiListSection>
            {SUPPORTED_LANGUAGES.map((item) => (
              <UiCell
                key={item.id}
                title={item.nativeName}
                detail={item.shortCode}
                onClick={() => {
                  onSelectLang(item.id)
                  setShowLangPicker(false)
                }}
                trailing={currentLang === item.id ? <Check className="w-4 h-4 text-[var(--ios-blue)]" strokeWidth={2.5} /> : null}
              />
            ))}
          </UiListSection>
        </div>
      </UiScreen>

      <AdvancedSettingsScreen
        isOpen={showAdvanced}
        isReceded={showTimingsDebug}
        onClose={() => setShowAdvanced(false)}
        currentLang={currentLang}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={onToggleShowFullSubjectNames}
        showMobileTodayAttendance={showMobileTodayAttendance}
        onToggleMobileTodayAttendance={(val) => onToggleMobileTodayAttendance?.(val)}
        enableGradeSimulator={enableGradeSimulator}
        onToggleEnableGradeSimulator={onToggleEnableGradeSimulator}
        showHomeworks={showHomeworks}
        onToggleShowHomeworks={onToggleShowHomeworks}
        showLuckyNumberBanner={showLuckyNumberBanner}
        onToggleShowLuckyNumberBanner={onToggleShowLuckyNumberBanner}
        isStudentUser={isStudentUser}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={onToggleAllowStudentJustifications}
        navMode={navMode}
        onSelectNavMode={onSelectNavMode}
        onOpenTimingsDebug={() => setShowTimingsDebug(true)}
        t={t}
      />

      <HomeCustomizerScreen
        isOpen={showHomeCustomizer}
        onClose={() => setShowHomeCustomizer(false)}
        navMode={navMode}
        onSelectNavMode={onSelectNavMode}
        dashboardOrder={dashboardOrder}
        onChangeDashboardOrder={onChangeDashboardOrder}
        dashboardVisible={dashboardVisible}
        onToggleDashboardWidget={onToggleDashboardWidget}
        currentLang={currentLang}
        t={t}
      />

      <RequestTimingsModal
        isOpen={showTimingsDebug}
        onClose={() => setShowTimingsDebug(false)}
        username={activeUsername}
        password={activeAccount?.password || ''}
        lang={currentLang}
        t={t}
      />
    </>
  )
}
