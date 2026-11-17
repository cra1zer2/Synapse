/**
 * Utils: Badge & Event Styling
 * Maps grades, timetable event categories, attendance symbols, and justification statuses to UI badge styles and labels.
 * Used by grades, schedule, events, and attendance components.
 */

import type { UiBadgeVariant } from '@/components/ui/ui-badge'
import type { AppDictionary } from '@/config/dictionary.config'
import type { TimetableEvent } from '@/models/timetable.model'
import { formatSubjectName } from '@/utils/text.util'

export function getGradeBadgeStyle(value: string): {
  bg: string
  text: string
  variant: UiBadgeVariant
} {
  const clean = (value || '').trim().toLowerCase()
  if (clean === 'nb' || /^[01]([+-])?$/.test(clean)) {
    return {
      bg: 'bg-[var(--ios-red-subtle)]',
      text: 'text-[var(--ios-red)]',
      variant: 'red'
    }
  }
  return {
    bg: 'bg-[var(--ios-element)]',
    text: 'text-[var(--ios-secondary)]',
    variant: 'neutral'
  }
}

export function getEventCategoryStyle(category: string, eventType?: string): {
  variant: UiBadgeVariant
  bgClass: string
  textClass: string
  dotClass: string
} {
  const effective = category && category !== 'info' ? category : eventType || category
  const lower = (effective || '').toLowerCase()
  if (
    lower.includes('sprawdzian') ||
    lower.includes('praca klasowa') ||
    lower.includes('exam') ||
    /\btest/i.test(lower)
  ) {
    return {
      variant: 'red',
      bgClass: 'bg-[var(--ios-red-subtle)]',
      textClass: 'text-[var(--ios-red)]',
      dotClass: 'bg-[var(--ios-red)]'
    }
  }
  if (lower.includes('kartkówka') || lower.includes('quiz')) {
    return {
      variant: 'orange',
      bgClass: 'bg-[var(--ios-orange-subtle)]',
      textClass: 'text-[var(--ios-orange)]',
      dotClass: 'bg-[var(--ios-orange)]'
    }
  }
  if (
    lower.includes('zadanie') ||
    lower.includes('domowe') ||
    lower.includes('homework')
  ) {
    return {
      variant: 'purple',
      bgClass: 'bg-[var(--ios-purple-subtle)]',
      textClass: 'text-[var(--ios-purple)]',
      dotClass: 'bg-[var(--ios-purple)]'
    }
  }
  return {
    variant: 'blue',
    bgClass: 'bg-[var(--ios-blue-subtle)]',
    textClass: 'text-[var(--ios-blue)]',
    dotClass: 'bg-[var(--ios-blue)]'
  }
}

function getEventCategoryFallbackLabel(category: string, isEn: boolean): string {
  switch (category) {
    case 'exam':
      return isEn ? 'Exam' : 'Sprawdzian'
    case 'quiz':
      return isEn ? 'Quiz' : 'Kartkówka'
    case 'homework':
      return isEn ? 'Homework' : 'Zadanie'
    case 'holiday':
      return isEn ? 'Holiday' : 'Dzień wolny'
    default:
      return isEn ? 'Notice' : 'Wydarzenie'
  }
}

export function resolveEventBadgeLabel(
  event: Pick<TimetableEvent, 'category' | 'eventType' | 'subjectName'>,
  isEn: boolean
): string {
  const shortLabel = getEventCategoryFallbackLabel(event.category, isEn)
  const rawType = (event.eventType || '').trim()
  if (!rawType) return shortLabel

  const subject = (event.subjectName || '').trim()
  const isDuplicateHeading = !subject || subject.toLowerCase() === rawType.toLowerCase()
  if (isDuplicateHeading && rawType.length > 18) {
    return shortLabel
  }

  return rawType
}

export function getEventPrimaryTitle(
  event: {
    subjectName?: string
    eventType?: string
    title?: string
    category: string
  },
  showFullSubjectNames: boolean,
  isEn: boolean
): string {
  if (event.subjectName && event.subjectName !== event.eventType) {
    return formatSubjectName(event.subjectName, showFullSubjectNames)
  }
  return event.title || event.eventType || getEventCategoryFallbackLabel(event.category, isEn)
}

export function getAttendanceTypeStyle(shortType: string): {
  variant: UiBadgeVariant
  bgClass: string
  textClass: string
  dotClass: string
} {
  const short = (shortType || '').trim().toLowerCase()
  if (short === 'nb' || short === 'nn') {
    return {
      variant: 'red',
      bgClass: 'bg-[var(--ios-red-subtle)]',
      textClass: 'text-[var(--ios-red)]',
      dotClass: 'bg-[var(--ios-red)]'
    }
  }
  if (short === 'u' || short === 'ob') {
    return {
      variant: 'green',
      bgClass: 'bg-[var(--ios-green-subtle)]',
      textClass: 'text-[var(--ios-green)]',
      dotClass: 'bg-[var(--ios-green)]'
    }
  }
  if (short === 'sp' || short === 'ns') {
    return {
      variant: 'orange',
      bgClass: 'bg-[var(--ios-orange-subtle)]',
      textClass: 'text-[var(--ios-orange)]',
      dotClass: 'bg-[var(--ios-orange)]'
    }
  }
  if (short === 'zw') {
    return {
      variant: 'purple',
      bgClass: 'bg-[var(--ios-purple-subtle)]',
      textClass: 'text-[var(--ios-purple)]',
      dotClass: 'bg-[var(--ios-purple)]'
    }
  }
  return {
    variant: 'neutral',
    bgClass: 'bg-[var(--ios-element)]',
    textClass: 'text-[var(--ios-secondary)]',
    dotClass: 'bg-[var(--ios-secondary)]'
  }
}

export function getJustificationStatusMeta(
  status: number | string,
  t?: AppDictionary
): { label: string; variant: UiBadgeVariant } {
  const num = Number(status)
  if (num === 0) {
    return {
      label: t?.justStatusPending || 'Oczekujące',
      variant: 'orange'
    }
  }
  if (num === 1) {
    return {
      label: t?.justStatusAccepted || 'Zaakceptowane',
      variant: 'green'
    }
  }
  if (num === 2) {
    return {
      label: t?.justStatusRejected || 'Odrzucone',
      variant: 'red'
    }
  }
  if (num === 3) {
    return {
      label: t?.justStatusPartial || 'Częściowe',
      variant: 'blue'
    }
  }
  return {
    label: String(status || ''),
    variant: 'neutral'
  }
}
