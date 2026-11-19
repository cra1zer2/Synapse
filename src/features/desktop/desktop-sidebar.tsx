'use client'

import React from 'react'
import {
  LayoutGrid,
  Calendar,
  CalendarClock,
  CalendarDays,
  FileCheck2,
  GraduationCap,
  CheckCircle2,
  Inbox,
  Send,
  Megaphone,
  Settings,
  PanelLeft,
  Sparkles
} from 'lucide-react'
import { SavedAccount, StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { resolveAvatarLetter, sanitizeAccountLabel } from '@/utils/account.util'
import { cn } from '@/utils/cn.util'
import { MacToolbarButton } from './mac-primitives'

export type DesktopNavSection =
  | 'overview'
  | 'timetable'
  | 'deadlines'
  | 'grades'
  | 'attendance'
  | 'attendance-journal'
  | 'attendance-justifications'
  | 'inbox'
  | 'sent'
  | 'notices'

interface DesktopSidebarProps {
  activeSection: DesktopNavSection
  onSelectSection: (section: DesktopNavSection) => void
  collapsed: boolean
  onToggleCollapse: () => void
  profile: StudentProfile | null
  username: string
  savedAccounts: SavedAccount[]
  onSwitchAccount: (account: SavedAccount) => void
  onOpenSettings: () => void
  onOpenAddAccount: () => void
  canSubmitExcuse?: boolean
  badges: {
    schedule: number
    grades: number
    attendance: number
    inbox: number
    notices: number
  }
  lang: AppLanguage
  t: AppDictionary
}

interface SidebarNavItem {
  id: DesktopNavSection
  label: string
  icon: React.ReactNode
  badge?: number
  badgeTone?: 'blue' | 'red' | 'neutral'
}

export function DesktopSidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  profile,
  username,
  savedAccounts,
  onOpenSettings,
  canSubmitExcuse = false,
  badges,
  lang,
  t
}: DesktopSidebarProps) {
  const activeAccount = savedAccounts.find((a) => a.isActive) || savedAccounts[0]
  const rawName = profile?.fullName || activeAccount?.profile?.fullName || username || 'Synapse'
  const avatarText = resolveAvatarLetter(rawName, username)
  const classLabel = sanitizeAccountLabel(profile?.className || activeAccount?.profile?.className)
  const schoolLabel = sanitizeAccountLabel(profile?.schoolName || activeAccount?.profile?.schoolName)
  const subtitle = [classLabel, schoolLabel].filter(Boolean).join(' · ') || 'Librus Synergia'
  const luckyNum = profile?.luckyNumber ?? activeAccount?.profile?.luckyNumber ?? null
  const classNum = profile?.classNumber ?? activeAccount?.profile?.classNumber ?? null
  const isLuckyMatch = luckyNum !== null && classNum !== null && luckyNum === classNum

  const groups: Array<{ title: string; items: SidebarNavItem[] }> = [
    {
      title: pickText(lang, { pl: 'Przegląd', en: 'Workspace' }),
      items: [
        {
          id: 'overview',
          label: pickText(lang, { pl: 'Pulpit', en: 'Overview' }),
          icon: <LayoutGrid className="w-[16px] h-[16px]" strokeWidth={1.9} />
        }
      ]
    },
    {
      title: pickText(lang, { pl: 'Dziennik', en: 'Academic' }),
      items: [
        {
          id: 'timetable',
          label: t.schedule,
          icon: <Calendar className="w-[16px] h-[16px]" strokeWidth={1.9} />,
          badge: badges.schedule,
          badgeTone: 'blue'
        },
        {
          id: 'deadlines',
          label: pickText(lang, { pl: 'Sprawdziany i terminy', en: 'Tests & Deadlines' }),
          icon: <CalendarClock className="w-[16px] h-[16px]" strokeWidth={1.9} />
        },
        {
          id: 'grades',
          label: t.grades,
          icon: <GraduationCap className="w-[16px] h-[16px]" strokeWidth={1.9} />,
          badge: badges.grades,
          badgeTone: 'blue'
        }
      ]
    },
    {
      title: t.attendance,
      items: [
        {
          id: 'attendance',
          label: pickText(lang, { pl: 'Podsumowanie', en: 'Summary' }),
          icon: <CheckCircle2 className="w-[16px] h-[16px]" strokeWidth={1.9} />,
          badge: badges.attendance,
          badgeTone: 'red'
        },
        {
          id: 'attendance-journal',
          label: pickText(lang, { pl: 'Dziennik obecności', en: 'Journal' }),
          icon: <CalendarDays className="w-[16px] h-[16px]" strokeWidth={1.9} />
        },
        ...(canSubmitExcuse
          ? [
              {
                id: 'attendance-justifications' as const,
                label: pickText(lang, { pl: 'Usprawiedliwienia', en: 'Justifications' }),
                icon: <FileCheck2 className="w-[16px] h-[16px]" strokeWidth={1.9} />
              }
            ]
          : [])
      ]
    },
    {
      title: pickText(lang, { pl: 'Komunikacja', en: 'Mail' }),
      items: [
        {
          id: 'inbox',
          label: t.messagesInbox,
          icon: <Inbox className="w-[16px] h-[16px]" strokeWidth={1.9} />,
          badge: badges.inbox,
          badgeTone: 'blue'
        },
        {
          id: 'sent',
          label: pickText(lang, { pl: 'Wysłane', en: 'Sent' }),
          icon: <Send className="w-[16px] h-[16px]" strokeWidth={1.9} />
        },
        {
          id: 'notices',
          label: t.messagesAnnouncements,
          icon: <Megaphone className="w-[16px] h-[16px]" strokeWidth={1.9} />,
          badge: badges.notices,
          badgeTone: 'neutral'
        }
      ]
    }
  ]

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'mac-sidebar-surface h-full shrink-0 border-r border-[var(--mac-row-divider)] flex flex-col select-none transition-[width,opacity] duration-200 ease-[cubic-bezier(0.2,0.9,0.3,1)] overflow-hidden relative z-20',
        collapsed ? 'w-0 border-r-0 opacity-0 pointer-events-none' : 'w-[256px] opacity-100'
      )}
    >
      <div className="w-[256px] h-full flex flex-col">
        {/* Top 52px Sidebar Titlebar matching Apple macOS 27 Left Pane */}
        <div className="h-[52px] px-[14px] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[8px] bg-[var(--mac-blue)] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,136,255,0.28)] shrink-0">
              <GraduationCap className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <span className="text-[14px] font-bold tracking-[-0.02em] text-[var(--mac-label-1)] truncate">
              Synapse
            </span>
            {luckyNum !== null && luckyNum !== undefined && (
              <span
                title={
                  isLuckyMatch
                    ? pickText(lang, { pl: 'Twój szczęśliwy numerek dzisiaj!', en: 'Your lucky number today!' })
                    : t.luckyNumber
                }
                className={cn(
                  'inline-flex items-center gap-1 h-[20px] px-2 rounded-full text-[11px] font-semibold tabular-nums shrink-0',
                  isLuckyMatch
                    ? 'bg-[#ffcc00]/20 text-[#b28900] dark:bg-[#ffd600]/20 dark:text-[#ffd600] ring-1 ring-[#ffcc00]/40'
                    : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-2)]'
                )}
              >
                <Sparkles className="w-3 h-3" strokeWidth={2.2} />
                {luckyNum}
              </span>
            )}
          </div>

          <MacToolbarButton
            icon={<PanelLeft className="w-4 h-4" strokeWidth={1.9} />}
            onClick={onToggleCollapse}
            title={pickText(lang, { pl: 'Ukryj pasek boczny', en: 'Hide Sidebar' })}
            aria-label={pickText(lang, { pl: 'Ukryj pasek boczny', en: 'Hide Sidebar' })}
          />
        </div>

        {/* Navigation Groups (14px inset, 18px section headers, 32px items w/ 8px radius) */}
        <nav className="flex-1 overflow-y-auto px-[14px] py-2 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <div className="h-[18px] px-2 flex items-center">
                <span className="text-[11px] font-semibold text-[var(--mac-label-2)] leading-[14px]">
                  {group.title}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectSection(item.id)}
                      className={cn(
                        'w-full h-[32px] px-2.5 rounded-[8px] flex items-center justify-between gap-2 text-left transition-colors duration-100 cursor-pointer outline-none mac-focus-ring',
                        isActive
                          ? 'bg-[var(--mac-sidebar-selected)] text-[var(--mac-label-1)] font-semibold'
                          : 'text-[var(--mac-label-1)] hover:bg-[var(--mac-sidebar-hover)] font-normal'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            'w-[20px] h-[20px] flex items-center justify-center shrink-0 transition-colors',
                            isActive ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-2)]'
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="text-[13px] leading-[16px] truncate">{item.label}</span>
                      </div>

                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={cn(
                            'min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums leading-none shrink-0',
                            item.badgeTone === 'red'
                              ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                              : item.badgeTone === 'blue'
                                ? 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
                                : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-2)]'
                          )}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Account & Settings Footer */}
        <div className="p-[14px] pt-2 border-t border-[var(--mac-row-divider)] shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            title={t.settingsTitle}
            aria-label={t.settingsTitle}
            className="w-full p-1.5 rounded-[10px] flex items-center gap-2.5 hover:bg-[var(--mac-sidebar-hover)] transition-colors cursor-pointer text-left outline-none mac-focus-ring group"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] flex items-center justify-center text-[12px] font-bold shrink-0">
              {avatarText}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-[var(--mac-label-1)] truncate leading-[15px]">
                {rawName}
              </div>
              <div className="text-[10px] text-[var(--mac-label-2)] truncate leading-[13px] mt-0.5">
                {subtitle}
              </div>
            </div>
            <Settings
              className="w-4 h-4 text-[var(--mac-label-2)] group-hover:text-[var(--mac-label-1)] transition-colors shrink-0 mr-1"
              strokeWidth={1.9}
            />
          </button>
        </div>
      </div>
    </aside>
  )
}
