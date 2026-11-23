'use client'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiListSection, UiCell } from '@/components/ui/ui-list'
import { UiSwitch } from '@/components/ui/ui-switch'

interface AdvancedSettingsScreenProps {
  isOpen: boolean
  isReceded?: boolean
  onClose: () => void
  currentLang: AppLanguage
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  showMobileTodayAttendance: boolean
  onToggleMobileTodayAttendance: (val: boolean) => void
  enableGradeSimulator: boolean
  onToggleEnableGradeSimulator?: (val: boolean) => void
  showHomeworks: boolean
  onToggleShowHomeworks?: (val: boolean) => void
  showTeacherAbsences: boolean
  onToggleShowTeacherAbsences?: (val: boolean) => void
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
  enableGradeSimulator,
  onToggleEnableGradeSimulator,
  showHomeworks,
  onToggleShowHomeworks,
  showTeacherAbsences,
  onToggleShowTeacherAbsences,
  showLuckyNumberBanner,
  onToggleShowLuckyNumberBanner,
  isStudentUser,
  allowStudentJustifications,
  onToggleAllowStudentJustifications,
  t,
}: AdvancedSettingsScreenProps) {
  return (
    <UiScreen
      isOpen={isOpen}
      isReceded={isReceded}
      onClose={onClose}
      title={t.advancedTitle}
      backLabel={t.settingsTitle || t.backAction}
      isSubView={true}
      zIndex={60}
    >
      <div className="flex flex-col gap-5 pb-12 select-none">
        <UiListSection header={t.displaySectionTitle}>
          <UiCell
            title={pickText(currentLang, { pl: 'Pokazuj pełne nazwy', en: 'Show full subject names' })}
            subtitle={pickText(currentLang, {
              pl: 'Wyświetlaj całe, nieskrócone nazwy lekcji',
              en: 'Display unabbreviated subject titles across widgets',
            })}
            size="tall"
            trailing={
              <UiSwitch
                checked={showFullSubjectNames}
                onChange={() => onToggleShowFullSubjectNames(!showFullSubjectNames)}
                ariaLabel={pickText(currentLang, { pl: 'Pokazuj pełne nazwy', en: 'Show full subject names' })}
              />
            }
          />
          <UiCell
            title={t.mobileTodayAttendanceTitle}
            subtitle={t.mobileTodayAttendanceDesc}
            size="tall"
            trailing={
              <UiSwitch
                checked={showMobileTodayAttendance}
                onChange={() => onToggleMobileTodayAttendance(!showMobileTodayAttendance)}
                ariaLabel={t.mobileTodayAttendanceTitle}
              />
            }
          />
          {onToggleShowHomeworks && (
            <UiCell
              title={pickText(currentLang, { pl: 'Pokazuj zadania domowe', en: 'Show homework assignments' })}
              subtitle={pickText(currentLang, {
                pl: 'Uwzględniaj zadania domowe w terminarzu i planie',
                en: 'Include homework tasks in schedule and upcoming events',
              })}
              size="tall"
              trailing={
                <UiSwitch
                  checked={showHomeworks}
                  onChange={() => onToggleShowHomeworks(!showHomeworks)}
                  ariaLabel={pickText(currentLang, {
                    pl: 'Pokazuj zadania domowe',
                    en: 'Show homework assignments',
                  })}
                />
              }
            />
          )}
          {onToggleShowTeacherAbsences && (
            <UiCell
              title={pickText(currentLang, {
                pl: 'Nieobecności nauczycieli (Beta)',
                en: 'Teacher absences (Beta)',
              })}
              subtitle={pickText(currentLang, {
                pl: 'Oznaczaj w planie i terminarzu lekcje z nieobecnym nauczycielem',
                en: 'Highlight absent teachers across schedule and deadlines',
              })}
              size="tall"
              trailing={
                <UiSwitch
                  checked={showTeacherAbsences}
                  onChange={() => onToggleShowTeacherAbsences(!showTeacherAbsences)}
                  ariaLabel={pickText(currentLang, {
                    pl: 'Nieobecności nauczycieli (Beta)',
                    en: 'Teacher absences (Beta)',
                  })}
                />
              }
            />
          )}
          {onToggleShowLuckyNumberBanner && (
            <UiCell
              title={pickText(currentLang, { pl: 'Powiadomienie o szczęśliwym numerku', en: 'Lucky number banner' })}
              subtitle={pickText(currentLang, {
                pl: 'Pokazuj pasek na górze ekranu w dniu Twojego szczęśliwego numerka',
                en: 'Highlight at the top of the day when lucky number matches yours',
              })}
              size="tall"
              trailing={
                <UiSwitch
                  checked={showLuckyNumberBanner}
                  onChange={() => onToggleShowLuckyNumberBanner(!showLuckyNumberBanner)}
                  ariaLabel={pickText(currentLang, {
                    pl: 'Powiadomienie o szczęśliwym numerku',
                    en: 'Lucky number banner',
                  })}
                />
              }
            />
          )}
        </UiListSection>

        {onToggleEnableGradeSimulator && (
          <UiListSection header={t.gradesCalcSectionTitle}>
            <UiCell
              title={pickText(currentLang, { pl: 'Symulator ocen (Co jeśli?)', en: 'Grade simulator (What-if)' })}
              subtitle={pickText(currentLang, {
                pl: 'Dodawaj wirtualne oceny i sprawdzaj, jak zmieni się średnia',
                en: 'Add virtual grades inside subjects to test average changes',
              })}
              size="tall"
              trailing={
                <UiSwitch
                  checked={enableGradeSimulator}
                  onChange={() => onToggleEnableGradeSimulator(!enableGradeSimulator)}
                  ariaLabel={pickText(currentLang, {
                    pl: 'Symulator ocen (Co jeśli?)',
                    en: 'Grade simulator (What-if)',
                  })}
                />
              }
            />
          </UiListSection>
        )}

        {isStudentUser && onToggleAllowStudentJustifications && (
          <UiListSection header={t.studentJustificationsSection}>
            <UiCell
              title={t.studentJustificationsTitle}
              subtitle={t.studentJustificationsDescription}
              size="tall"
              trailing={
                <UiSwitch
                  checked={allowStudentJustifications}
                  onChange={() => onToggleAllowStudentJustifications(!allowStudentJustifications)}
                  ariaLabel={t.studentJustificationsTitle}
                />
              }
            />
          </UiListSection>
        )}
      </div>
    </UiScreen>
  )
}
