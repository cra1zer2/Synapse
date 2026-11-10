'use client'

import { useState, useEffect } from 'react'
import { GradeItem } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'
import { formatHumanPolishDate } from '@/utils/date.util'
import { IosSheet } from '@/components/ios/ios-sheet'
import { cn } from '@/utils/cn.util'

interface GradeDetailModalProps {
  gradeDetail: { grade: GradeItem; subject: string } | null
  isOpen: boolean
  onClose: () => void
  t: AppDictionary
}

function getGradeBadgeTone(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('0') || g.startsWith('1') || g === 'nb' || g === 'np') {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
  }
  return 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
}

export function GradeDetailModal({
  gradeDetail,
  isOpen,
  onClose,
  t
}: GradeDetailModalProps) {
  const [cached, setCached] = useState<{ grade: GradeItem; subject: string } | null>(gradeDetail)

  useEffect(() => {
    if (gradeDetail) {
      setCached(gradeDetail)
    }
  }, [gradeDetail])

  const activeData = gradeDetail || cached

  return (
    <IosSheet
      isOpen={isOpen && Boolean(activeData)}
      onClose={onClose}
      title={activeData?.subject || t.grades}
      maxWidthClass="md:max-w-[360px]"
    >
      {activeData && (
        <div className="flex flex-col gap-3.5">
          <div className="px-1 flex items-center gap-3.5">
            <div className={cn(
              'min-w-[48px] h-[48px] px-3 rounded-[14px] flex items-center justify-center font-bold text-[22px] tabular-nums shrink-0',
              getGradeBadgeTone(activeData.grade.grade)
            )}>
              {activeData.grade.grade}
            </div>

            <div className="flex flex-col min-w-0">
              <h3 className="text-[18px] font-semibold text-[var(--ios-label)] tracking-[-0.3px] leading-snug break-words">
                {activeData.grade.category || 'Ocena cząstkowa'}
              </h3>
              {activeData.grade.date && (
                <span className="text-[13px] font-normal text-[var(--ios-secondary)] tabular-nums mt-0.5">
                  {formatHumanPolishDate(activeData.grade.date)}
                </span>
              )}
            </div>
          </div>

          {activeData.grade.description ? (
            <div className="bg-[var(--bg-card-secondary)] rounded-[20px] p-3.5 px-4 flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                Komentarz
              </span>
              <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                {activeData.grade.description}
              </p>
            </div>
          ) : null}

          <div className="bg-[var(--bg-card-secondary)] rounded-[20px] overflow-hidden divide-y">
            <div className="p-3 px-4 flex items-center justify-between text-[14px]">
              <span className="text-[var(--ios-secondary)]">{t.weight}</span>
              <span className="text-[var(--ios-label)] font-semibold tabular-nums">{activeData.grade.weight}</span>
            </div>
            {activeData.grade.date && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">{t.dateLabel}</span>
                <span className="text-[var(--ios-label)] font-medium tabular-nums">{formatHumanPolishDate(activeData.grade.date)}</span>
              </div>
            )}
            {activeData.grade.teacher && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">{t.teacherLabel}</span>
                <span className="text-[var(--ios-label)] font-medium truncate max-w-[190px] text-right">{activeData.grade.teacher}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </IosSheet>
  )
}
