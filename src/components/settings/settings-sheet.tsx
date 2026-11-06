'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
import { IosScreen, IOS_PANEL_TRANSITION, IOS_BACKDROP_TRANSITION, IOS_PARALLAX_PERCENT } from '@/components/ios/ios-screen'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosCard } from '@/components/ios/ios-ui'
import { IosSwitch } from '@/components/ios/ios-switch'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { AuthView } from '@/components/auth/auth-view'

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
        isReceded={showThemePicker || showAdvanced || showAddForm}
        contentClassName="px-6 pt-5 max-w-2xl mx-auto w-full pb-10"
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
              className="w-[308px] bg-[var(--ios-card-solid)] rounded-[34px] p-[14px] pt-[22px] border border-[var(--ios-border)] flex flex-col gap-5 text-center"
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
        onClose={handleCloseAddForm}
        title="Synapse"
        backLabel={t.backAction}
        isSubView={true}
        zIndex={70}
        hideHeader={true}
        contentClassName="w-full h-full p-0 max-w-none"
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
        </div>
      </IosScreen>
    </>
  )
}
