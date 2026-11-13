import type { IosBadgeVariant } from '@/components/ios/ios-badge'
import type { AppDictionary } from '@/config/dictionary.config'

export function getGradeBadgeStyle(value: string): {
  bg: string
  text: string
  variant: IosBadgeVariant
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

export function getEventCategoryStyle(category: string): {
  variant: IosBadgeVariant
  bgClass: string
  textClass: string
  dotClass: string
} {
  const lower = (category || '').toLowerCase()
  if (
    lower.includes('sprawdzian') ||
    lower.includes('praca klasowa') ||
    lower.includes('exam') ||
    lower.includes('test')
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

export function getAttendanceTypeStyle(shortType: string): {
  variant: IosBadgeVariant
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
  if (short === 'u') {
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
  if (short === 'ob') {
    return {
      variant: 'green',
      bgClass: 'bg-[var(--ios-green-subtle)]',
      textClass: 'text-[var(--ios-green)]',
      dotClass: 'bg-[var(--ios-green)]'
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
): { label: string; variant: IosBadgeVariant } {
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
