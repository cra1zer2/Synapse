export type Locale = 'en' | 'pl'

export const defaultLocale: Locale = 'en'

export const locales: Locale[] = ['en', 'pl']

export interface Dictionary {
    [key: string]: string | Dictionary
}