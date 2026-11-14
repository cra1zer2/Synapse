'use client'

import { Check } from 'lucide-react'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { GradeModifierMode } from '@/hooks/settings.hook'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosSwitch } from '@/components/ios/ios-switch'

interface AdvancedSettingsScreenProps {
  isOpen: boolean
  isReceded?: boolean
  onClose: () => void
  currentLang: AppLanguage
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  showMobileTodayAttendance: boolean
  onToggleMobileTodayAttendance: (val: boolean) => void
  gradeModifierMode: GradeModifierMode
  onSelectGradeModifierMode: (mode: GradeModifierMode) => void
  enableGradeSimulator: boolean
  onToggleEnableGradeSimulator?: (val: boolean) => void
  showHomeworks: boolean
  onToggleShowHomeworks?: (val: boolean) => void
  showLuckyNumberBanner: boolean
  onToggleShowLuckyNumberBanner?: (val: boolean) => void
  isStudentUser: boolean
  allowStudentJustifications: boolean
  onToggleAllowStudentJustifications?: (val: boolean) => void
  onOpenTimingsDebug: () => void
  t: AppDictionary
}

export function AdvancedSettingsScreen({
  isOpen,
  isReceded = false,
  onClose,
  currentLang,
  showFullSubjectNames,
  onToggleShowFullSubjectNames,
  showMobileTodayAttendance,
  onToggleMobileTodayAttendance,
  gradeModifierMode,
  onSelectGradeModifierMode,
  enableGradeSimulator,
  onToggleEnableGradeSimulator,
  showHomeworks,
  onToggleShowHomeworks,
  showLuckyNumberBanner,
  onToggleShowLuckyNumberBanner,
  isStudentUser,
  allowStudentJustifications,
  onToggleAllowStudentJustifications,
  onOpenTimingsDebug,
  t
}: AdvancedSettingsScreenProps) {
  const isEn = currentLang === 'en'

  const modifierOptions: Array<{ id: GradeModifierMode; label: string }> = [
    { id: 'standard', label: t.gradeModStandard },
    { id: 'symmetric', label: t.gradeModSymmetric },
    { id: 'quarter', label: t.gradeModQuarter },
    { id: 'none', label: t.gradeModNone }
  ]

  return (
    <IosScreen
      isOpen={isOpen}
      isReceded={isReceded}
      onClose={onClose}
      title={t.advancedTitle}
      backLabel={t.settingsTitle || t.backAction}
      showBackButton={true}
      isSubView={true}
      zIndex={60}
    >
      <div className="flex flex-col gap-5 pb-12 select-none">
        <IosListSection header={t.displaySectionTitle}>
          <IosCell
            title={isEn ? 'Show full subject names' : 'Pokazuj pełne nazwy'}
            subtitle={
              isEn
                ? 'Display unabbreviated subject titles across widgets'
                : 'Wyświetlaj całe, nieskrócone nazwy lekcji'
            }
            size="tall"
            trailing={
              <IosSwitch
                checked={showFullSubjectNames}
                onChange={() => onToggleShowFullSubjectNames(!showFullSubjectNames)}
                ariaLabel={isEn ? 'Show full subject names' : 'Pokazuj pełne nazwy'}
              />
            }
          />
          <IosCell
            title={t.mobileTodayAttendanceTitle}
            subtitle={t.mobileTodayAttendanceDesc}
            size="tall"
            trailing={
              <IosSwitch
                checked={showMobileTodayAttendance}
                onChange={() => onToggleMobileTodayAttendance(!showMobileTodayAttendance)}
                ariaLabel={t.mobileTodayAttendanceTitle}
              />
            }
          />
          {onToggleShowHomeworks && (
            <IosCell
              title={isEn ? 'Show homework assignments' : 'Pokazuj zadania domowe'}
              subtitle={
                isEn
                  ? 'Include homework tasks in schedule and upcoming events'
                  : 'Uwzględniaj zadania domowe w terminarzu i planie'
              }
              size="tall"
              trailing={
                <IosSwitch
                  checked={showHomeworks}
                  onChange={() => onToggleShowHomeworks(!showHomeworks)}
                  ariaLabel={isEn ? 'Show homework assignments' : 'Pokazuj zadania domowe'}
                />
              }
            />
          )}
          {onToggleShowLuckyNumberBanner && (
            <IosCell
              title={isEn ? 'Lucky number banner' : 'Powiadomienie o szczęśliwym numerku'}
              subtitle={
                isEn
                  ? 'Highlight at the top of the day when lucky number matches yours'
                  : 'Pokazuj pasek na górze ekranu w dniu Twojego szczęśliwego numerka'
              }
              size="tall"
              trailing={
                <IosSwitch
                  checked={showLuckyNumberBanner}
                  onChange={() => onToggleShowLuckyNumberBanner(!showLuckyNumberBanner)}
                  ariaLabel={isEn ? 'Lucky number banner' : 'Powiadomienie o szczęśliwym numerku'}
                />
              }
            />
          )}
        </IosListSection>

        <IosListSection header={t.gradesCalcSectionTitle} footer={t.gradeModifierPresetDesc}>
          {modifierOptions.map((opt) => (
            <IosCell
              key={opt.id}
              title={opt.label}
              onClick={() => onSelectGradeModifierMode(opt.id)}
              trailing={
                gradeModifierMode === opt.id ? (
                  <Check className="w-4 h-4 text-[var(--ios-blue)]" strokeWidth={2.5} />
                ) : null
              }
            />
          ))}
          {onToggleEnableGradeSimulator && (
            <IosCell
              title={isEn ? 'Grade simulator (What-if)' : 'Symulator ocen (Co jeśli?)'}
              subtitle={
                isEn
                  ? 'Add virtual grades inside subjects to test average changes'
                  : 'Dodawaj wirtualne oceny i sprawdzaj, jak zmieni się średnia'
              }
              size="tall"
              trailing={
                <IosSwitch
                  checked={enableGradeSimulator}
                  onChange={() => onToggleEnableGradeSimulator(!enableGradeSimulator)}
                  ariaLabel={isEn ? 'Grade simulator (What-if)' : 'Symulator ocen (Co jeśli?)'}
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
                  checked={allowStudentJustifications}
                  onChange={() => onToggleAllowStudentJustifications(!allowStudentJustifications)}
                  ariaLabel={t.studentJustificationsTitle}
                />
              }
            />
          </IosListSection>
        )}

        <IosListSection header={isEn ? 'Diagnostics' : 'Diagnostyka'}>
          <IosCell
            title={isEn ? 'Request Timings' : 'Czas zapytań'}
            subtitle={
              isEn
                ? 'Inspect live response times and copy debug log'
                : 'Sprawdź czasy odpowiedzi i skopiuj log diagnostyczny'
            }
            size="tall"
            chevron={true}
            onClick={onOpenTimingsDebug}
          />
        </IosListSection>
      </div>
    </IosScreen>
  )
}
