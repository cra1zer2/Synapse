/**
 * Feature Controller & View Host: Attendance & Justifications Module
 * Encapsulates subject attendance summary, chronological journal view, excuse workflows, and live Librus status history.
 * Resolves saved parent credentials automatically for justification lookups and reports nested overlays upward.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { SavedAccount } from '@/models/account.model'
import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { LiveJustificationItem } from '@/models/justification.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { createJustificationAction, getLiveJustificationsAction } from '@/app/actions'
import { isStudentUsername } from '@/utils/account.util'
import { addRequestLog } from '@/utils/request-logger.util'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { AttendanceView } from './attendance-view'
import { AttendanceJournalView } from './attendance-journal-view'
import { AttendanceDetailModal } from './attendance-detail-modal'
import { ManualExcuseScreen } from './manual-excuse-screen'
import { LiveJustificationsScreen } from './live-justifications-screen'

interface UseAttendanceFeatureOptions {
  username: string
  password: string
  savedAccounts: SavedAccount[]
  lang: AppLanguage
  onOpenAttendanceScreen: () => void
  onJustificationSubmitted?: () => void
}

export function useAttendanceFeature({
  username,
  password,
  savedAccounts,
  lang,
  onOpenAttendanceScreen,
  onJustificationSubmitted
}: UseAttendanceFeatureOptions) {
  const [attendanceViewTab, setAttendanceViewTab] = useState<'summary' | 'journal'>('summary')
  const [attendanceSubDir, setAttendanceSubDir] = useState<1 | -1>(1)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [showManualExcuse, setShowManualExcuse] = useState(false)
  const [excuseInitialTab, setExcuseInitialTab] = useState<'nb' | 'range' | 'hours'>('range')
  const [showLiveJustifications, setShowLiveJustifications] = useState(false)
  const [liveJustifications, setLiveJustifications] = useState<LiveJustificationItem[]>([])
  const [isLoadingLiveJustifications, setIsLoadingLiveJustifications] = useState(false)
  const [liveJustificationsFilter, setLiveJustificationsFilter] = useState<'0' | '1' | '2' | '3'>('0')
  const [isJournalDayOpen, setIsJournalDayOpen] = useState(false)
  const postSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (postSubmitTimerRef.current) clearTimeout(postSubmitTimerRef.current)
    }
  }, [])

  const resolveParentCredentials = useCallback(() => {
    const parentAcc = savedAccounts.find(
      (a) => a.role === 'parent' || (Boolean(a.username) && !isStudentUsername(a.username))
    )
    return {
      targetUser: parentAcc ? parentAcc.username : username,
      targetPass: parentAcc ? parentAcc.password : password
    }
  }, [savedAccounts, username, password])

  const openAttendance = useCallback(() => {
    setAttendanceViewTab('summary')
    onOpenAttendanceScreen()
  }, [onOpenAttendanceScreen])

  const openJournal = useCallback(() => {
    setAttendanceViewTab('journal')
    onOpenAttendanceScreen()
  }, [onOpenAttendanceScreen])

  const changeAttendanceViewTab = useCallback((next: 'summary' | 'journal') => {
    setAttendanceSubDir(next === 'journal' ? 1 : -1)
    setAttendanceViewTab(next)
  }, [])

  const handleOpenLiveJustifications = useCallback(
    async (filterVal?: '0' | '1' | '2' | '3') => {
      const targetFilter = filterVal ?? liveJustificationsFilter
      setShowLiveJustifications(true)
      setIsLoadingLiveJustifications(true)
      const clientStart = performance.now()
      const logTitle = pickText(lang, {
        pl: 'Statusy usprawiedliwień',
        en: 'Justification statuses'
      })
      try {
        const { targetUser, targetPass } = resolveParentCredentials()
        const res = await getLiveJustificationsAction(targetUser, targetPass, targetFilter, lang)
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
          name: `${logTitle} (${pickText(lang, { pl: 'Filtr', en: 'Filter' })}: ${targetFilter})`,
          clientDurationMs,
          status: res.success ? 'ok' : 'error',
          error: res.error,
          details: `${pickText(lang, { pl: 'Wpisów', en: 'Entries' })}: ${res.data?.length || 0}`
        })
        if (res.success && res.data) {
          setLiveJustifications(res.data)
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : pickText(lang, { pl: 'Nieznany błąd', en: 'Unknown error' })
        addRequestLog({
          name: `${logTitle} (${pickText(lang, { pl: 'Filtr', en: 'Filter' })}: ${targetFilter})`,
          clientDurationMs: Math.round(performance.now() - clientStart),
          status: 'error',
          error: errMsg
        })
      } finally {
        setIsLoadingLiveJustifications(false)
      }
    },
    [resolveParentCredentials, lang, liveJustificationsFilter]
  )

  const handleSubmitJustifications = useCallback(
    async (payload: { dateFrom: string; dateTo: string; lessons: number[]; message: string }) => {
      const clientStart = performance.now()
      const { targetUser, targetPass } = resolveParentCredentials()
      try {
        const res = await createJustificationAction(targetUser, targetPass, {
          dateFrom: payload.dateFrom,
          dateTo: payload.dateTo,
          lessons: payload.lessons,
          messageFromParent: payload.message,
          sendNotify: false
        })
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
          name: `${pickText(lang, { pl: 'Wysłanie usprawiedliwienia', en: 'Submit justification' })} (${payload.dateFrom})`,
          clientDurationMs,
          status: res.success ? 'ok' : 'error',
          error: res.error,
          details: `${pickText(lang, { pl: 'Lekcje', en: 'Lessons' })}: ${payload.lessons.join(', ')}`
        })
        if (res.success && onJustificationSubmitted) {
          if (postSubmitTimerRef.current) clearTimeout(postSubmitTimerRef.current)
          postSubmitTimerRef.current = setTimeout(() => {
            onJustificationSubmitted()
          }, 800)
        }
        return {
          ok: Boolean(res.success),
          error: res.error || (res.success ? undefined : pickText(lang, { pl: 'Błąd wysyłania usprawiedliwienia', en: 'Failed to send justification' }))
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        addRequestLog({
          name: `${pickText(lang, { pl: 'Wysłanie usprawiedliwienia', en: 'Submit justification' })} (${payload.dateFrom})`,
          clientDurationMs: Math.round(performance.now() - clientStart),
          status: 'error',
          error: errMsg
        })
        return { ok: false, error: errMsg }
      }
    },
    [resolveParentCredentials, lang, onJustificationSubmitted]
  )

  return {
    attendanceViewTab,
    attendanceSubDir,
    changeAttendanceViewTab,
    selectedSubjectDetail,
    setSelectedSubjectDetail,
    showManualExcuse,
    setShowManualExcuse,
    excuseInitialTab,
    setExcuseInitialTab,
    showLiveJustifications,
    setShowLiveJustifications,
    liveJustifications,
    isLoadingLiveJustifications,
    liveJustificationsFilter,
    setLiveJustificationsFilter,
    isJournalDayOpen,
    setIsJournalDayOpen,
    openAttendance,
    openJournal,
    handleOpenLiveJustifications,
    handleSubmitJustifications
  }
}

export type AttendanceFeatureController = ReturnType<typeof useAttendanceFeature>

interface AttendanceFeatureProps {
  controller: AttendanceFeatureController
  mode: 'tab' | 'subview' | 'hidden'
  onCloseSubview: () => void
  onNestedOverlayChange?: (isOpen: boolean) => void
  attendanceData: AttendanceResult | null
  attendanceError: string | null
  onRetry: () => void
  timetableData: SmartTimetableResult | null
  showFullSubjectNames: boolean
  isStudent: boolean
  canSubmitExcuse: boolean
  lang: AppLanguage
  t: AppDictionary
}

export function AttendanceFeature({
  controller,
  mode,
  onCloseSubview,
  onNestedOverlayChange,
  attendanceData,
  attendanceError,
  onRetry,
  timetableData,
  showFullSubjectNames,
  isStudent,
  canSubmitExcuse,
  lang,
  t
}: AttendanceFeatureProps) {
  const hasChildOverlay = Boolean(
    controller.selectedSubjectDetail ||
      controller.showManualExcuse ||
      controller.showLiveJustifications ||
      controller.isJournalDayOpen
  )

  useEffect(() => {
    onNestedOverlayChange?.(hasChildOverlay)
  }, [hasChildOverlay, onNestedOverlayChange])

  const tabsAndBody = attendanceData ? (
    <div className="flex flex-col gap-3.5">
      <UiSegmentedControl<'summary' | 'journal'>
        value={controller.attendanceViewTab}
        onChange={controller.changeAttendanceViewTab}
        options={[
          { id: 'summary', label: pickText(lang, { pl: 'Podsumowanie', en: 'Summary' }) },
          { id: 'journal', label: pickText(lang, { pl: 'Dziennik', en: 'Journal' }) }
        ]}
      />
      <div
        key={controller.attendanceViewTab}
        className={controller.attendanceSubDir >= 0 ? 'tab-enter-right' : 'tab-enter-left'}
      >
        {controller.attendanceViewTab === 'summary' ? (
          <AttendanceView
            attendanceData={attendanceData}
            showFullSubjectNames={showFullSubjectNames}
            isStudent={isStudent}
            canSubmitExcuse={canSubmitExcuse}
            onSelectSubject={controller.setSelectedSubjectDetail}
            onOpenManualExcuse={() => {
              controller.setExcuseInitialTab('range')
              controller.setShowManualExcuse(true)
            }}
            onOpenQuickNb={() => {
              controller.setExcuseInitialTab('nb')
              controller.setShowManualExcuse(true)
            }}
            onOpenLiveJustifications={() => controller.handleOpenLiveJustifications()}
            lang={lang}
            t={t}
          />
        ) : (
          <AttendanceJournalView
            attendanceData={attendanceData}
            showFullSubjectNames={showFullSubjectNames}
            lang={lang}
            t={t}
            onSubViewChange={controller.setIsJournalDayOpen}
          />
        )}
      </div>
    </div>
  ) : attendanceError ? (
    <UiEmptyState
      iconTone="red"
      icon={<AlertCircle className="w-[22px] h-[22px]" strokeWidth={2} />}
      title={attendanceError}
      action={{ label: t.refresh, onClick: onRetry }}
      className="my-12"
    />
  ) : (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <UiSpinner size="large" className="text-[var(--ios-blue)]" />
      <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
        {t.loadingTimetable}
      </span>
    </div>
  )

  return (
    <>
      {mode === 'tab' && tabsAndBody}

      <UiScreen
        isSubView
        isOpen={mode === 'subview'}
        onClose={onCloseSubview}
        title={t.attendance}
        backLabel={t.backAction}
        isReceded={hasChildOverlay}
      >
        {tabsAndBody}
      </UiScreen>

      <AttendanceDetailModal
        subjectDetail={controller.selectedSubjectDetail}
        isOpen={Boolean(controller.selectedSubjectDetail)}
        onClose={() => controller.setSelectedSubjectDetail(null)}
        showFullSubjectNames={showFullSubjectNames}
        t={t}
      />

      {attendanceData && (
        <ManualExcuseScreen
          isOpen={controller.showManualExcuse}
          onClose={() => controller.setShowManualExcuse(false)}
          attendanceData={attendanceData}
          timetableData={timetableData}
          canSubmitExcuse={canSubmitExcuse}
          showFullSubjectNames={showFullSubjectNames}
          onSubmitJustification={controller.handleSubmitJustifications}
          lang={lang}
          t={t}
          initialModeTab={controller.excuseInitialTab}
        />
      )}

      <LiveJustificationsScreen
        isOpen={controller.showLiveJustifications}
        onClose={() => controller.setShowLiveJustifications(false)}
        isLoading={controller.isLoadingLiveJustifications}
        filter={controller.liveJustificationsFilter}
        onChangeFilter={(f) => {
          controller.setLiveJustificationsFilter(f)
          controller.handleOpenLiveJustifications(f)
        }}
        onRefresh={() => controller.handleOpenLiveJustifications()}
        items={controller.liveJustifications}
        lang={lang}
        t={t}
      />
    </>
  )
}
