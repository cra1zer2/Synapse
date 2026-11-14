'use client'

import { useState, useEffect } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { AppLanguage, AppDictionary } from '@/config/dictionary.config'
import { getStudentProfileAction } from '@/app/actions'
import { isStudentUsername, sanitizeAccountLabel } from '@/utils/account.util'

interface UseAccountSessionOptions {
    lang: AppLanguage
    t: AppDictionary
}

function sanitizeSavedProfile(profile?: StudentProfile | null, fallbackRole: 'student' | 'parent' = 'parent'): StudentProfile {
    return {
        fullName: profile?.fullName || '',
        className: sanitizeAccountLabel(profile?.className),
        schoolName: sanitizeAccountLabel(profile?.schoolName),
        luckyNumber: profile?.luckyNumber ?? null,
        classNumber: profile?.classNumber ?? null,
        role: profile?.role || fallbackRole
    }
}

function deduplicateSavedAccounts(accounts: SavedAccount[]): SavedAccount[] {
    const map = new Map<string, SavedAccount>()
    for (const acc of accounts) {
        if (!acc || !acc.username) continue
        const key = acc.username.trim().toLowerCase()
        const normalizedProfile = sanitizeSavedProfile(acc.profile, acc.role || 'parent')
        const existing = map.get(key)
        if (!existing) {
            map.set(key, { ...acc, id: key, username: acc.username.trim(), profile: normalizedProfile })
        } else if (acc.isActive) {
            map.set(key, { ...acc, id: key, username: acc.username.trim(), profile: normalizedProfile, isActive: true })
        }
    }
    return Array.from(map.values())
}

export function useAccountSession({ lang, t }: UseAccountSessionOptions) {
    const [isConfigured, setIsConfigured] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
    const [profile, setProfile] = useState<StudentProfile | null>(null)

    const [newAccUser, setNewAccUser] = useState('')
    const [newAccPass, setNewAccPass] = useState('')
    const [isAddingAcc, setIsAddingAcc] = useState(false)
    const [addAccountStep, setAddAccountStep] = useState<'input' | 'verifying' | 'preview'>('input')
    const [addAccountCandidate, setAddAccountCandidate] = useState<StudentProfile | null>(null)
    const [addAccountError, setAddAccountError] = useState<string | null>(null)

    const [authStep, setAuthStep] = useState<'input' | 'verifying' | 'preview'>('input')
    const [verifiedCandidate, setVerifiedCandidate] = useState<StudentProfile | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)

    useEffect(() => {
        const savedAccountsJson = localStorage.getItem('synapse_accounts')
        let loadedAccounts: SavedAccount[] = []
        if (savedAccountsJson) {
            try {
                const parsed = JSON.parse(savedAccountsJson)
                if (Array.isArray(parsed)) {
                    loadedAccounts = deduplicateSavedAccounts(parsed)
                }
            } catch { }
        }

        const savedUser = (localStorage.getItem('synapse_user') || '').trim()
        const savedPass = localStorage.getItem('synapse_pass') || ''

        if (loadedAccounts.length === 0 && savedUser && savedPass) {
            const isStudent = isStudentUsername(savedUser)
            const initialAccount: SavedAccount = {
                id: savedUser.toLowerCase(),
                username: savedUser,
                password: savedPass,
                role: isStudent ? 'student' : 'parent',
                profile: {
                    fullName: savedUser,
                    className: '',
                    schoolName: '',
                    luckyNumber: null,
                    role: isStudent ? 'student' : 'parent'
                },
                isActive: true
            }
            loadedAccounts = [initialAccount]
        }

        if (loadedAccounts.length > 0) {
            localStorage.setItem('synapse_accounts', JSON.stringify(loadedAccounts))
        }

        setSavedAccounts(loadedAccounts)

        const activeAcc = loadedAccounts.find((a) => a.isActive) || loadedAccounts[0]
        const effectiveUser = activeAcc ? activeAcc.username : savedUser
        const effectivePass = activeAcc ? activeAcc.password : savedPass

        setUsername(effectiveUser)
        setPassword(effectivePass)

        const hasAccount = Boolean(effectiveUser && effectivePass)
        setIsConfigured(hasAccount)
        if (activeAcc?.profile) {
            setProfile(activeAcc.profile)
        }
    }, [])

    const handleStartVerification = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError(null)
        setAuthStep('verifying')

        const cleanUser = username.trim()
        const res = await getStudentProfileAction(cleanUser, password)
        if (res.success && res.data) {
            setUsername(cleanUser)
            setVerifiedCandidate(res.data)
            setAuthStep('preview')
        } else {
            setAuthError(res.error || t.loginError)
            setAuthStep('input')
        }
    }

    const handleConfirmLogin = () => {
        if (!verifiedCandidate) return
        const cleanUser = username.trim()
        localStorage.setItem('synapse_user', cleanUser)
        localStorage.setItem('synapse_pass', password)
        localStorage.setItem('synapse_lang', lang)

        const newAcc: SavedAccount = {
            id: cleanUser.toLowerCase(),
            username: cleanUser,
            password,
            role: verifiedCandidate.role,
            profile: verifiedCandidate,
            isActive: true
        }

        const updated = [newAcc]
        setSavedAccounts(updated)
        localStorage.setItem('synapse_accounts', JSON.stringify(updated))

        setProfile(verifiedCandidate)
        setIsConfigured(true)
        setAuthStep('input')
    }

    const handleSwitchAccount = (acc: SavedAccount) => {
        const targetKey = acc.username.trim().toLowerCase()
        const updated = savedAccounts.map((a) => ({
            ...a,
            isActive: a.username.trim().toLowerCase() === targetKey
        }))
        setSavedAccounts(updated)
        localStorage.setItem('synapse_accounts', JSON.stringify(updated))
        localStorage.setItem('synapse_user', acc.username)
        localStorage.setItem('synapse_pass', acc.password)
        setUsername(acc.username)
        setPassword(acc.password)
        setProfile(acc.profile)
    }

    const handleStartAddAccountVerification = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddAccountError(null)

        const cleanCandidateUser = newAccUser.trim()
        const candidateKey = cleanCandidateUser.toLowerCase()

        const alreadyExists = savedAccounts.some(
            (a) => a.username.trim().toLowerCase() === candidateKey
        )
        if (alreadyExists) {
            setAddAccountError(
                lang === 'en'
                    ? 'This account is already added.'
                    : 'To konto jest już dodane na tym urządzeniu.'
            )
            setAddAccountStep('input')
            return
        }

        setAddAccountStep('verifying')
        setIsAddingAcc(true)

        const res = await getStudentProfileAction(cleanCandidateUser, newAccPass)
        setIsAddingAcc(false)

        if (res.success && res.data) {
            const sameRoleAndPerson = savedAccounts.some(
                (a) =>
                    a.role === res.data!.role &&
                    a.profile?.fullName &&
                    res.data!.fullName &&
                    a.profile.fullName.toLowerCase() === res.data!.fullName.toLowerCase() &&
                    a.username.trim().toLowerCase() === candidateKey
            )
            if (sameRoleAndPerson) {
                setAddAccountError(
                    lang === 'en'
                        ? 'This account is already added.'
                        : 'To konto jest już dodane na tym urządzeniu.'
                )
                setAddAccountStep('input')
                return
            }

            setNewAccUser(cleanCandidateUser)
            setAddAccountCandidate(res.data)
            setAddAccountStep('preview')
        } else {
            setAddAccountError(res.error || t.loginError)
            setAddAccountStep('input')
        }
    }

    const handleConfirmAddAccount = (): boolean => {
        if (!addAccountCandidate || !newAccUser || !newAccPass) return false

        const cleanUser = newAccUser.trim()
        const key = cleanUser.toLowerCase()

        if (savedAccounts.some((a) => a.username.trim().toLowerCase() === key)) {
            setAddAccountError(
                lang === 'en'
                    ? 'This account is already added.'
                    : 'To konto jest już dodane na tym urządzeniu.'
            )
            setAddAccountStep('input')
            return false
        }

        const newAcc: SavedAccount = {
            id: key,
            username: cleanUser,
            password: newAccPass,
            role: addAccountCandidate.role,
            profile: addAccountCandidate,
            isActive: false
        }
        const updated = deduplicateSavedAccounts([...savedAccounts, newAcc])
        setSavedAccounts(updated)
        localStorage.setItem('synapse_accounts', JSON.stringify(updated))
        setNewAccUser('')
        setNewAccPass('')
        setAddAccountCandidate(null)
        setAddAccountStep('input')
        setAddAccountError(null)
        return true
    }

    const handleResetAddAccount = () => {
        setNewAccUser('')
        setNewAccPass('')
        setAddAccountCandidate(null)
        setAddAccountStep('input')
        setAddAccountError(null)
    }

    const handleLogout = () => {
        const storedUser = localStorage.getItem('synapse_user')
        const usernames = new Set<string>(
            [username, storedUser || '', ...savedAccounts.map((a) => a.username)].filter(Boolean)
        )
        usernames.forEach((u) => {
            localStorage.removeItem(`synapse_cache_${u}`)
            localStorage.removeItem(`synapse_week_cache_${u}`)
            localStorage.removeItem(`synapse_msg_${u}`)
        })
        localStorage.removeItem('synapse_user')
        localStorage.removeItem('synapse_pass')
        localStorage.removeItem('synapse_accounts')
        localStorage.removeItem('synapse_cache')
        localStorage.removeItem('synapse_week_cache')
        localStorage.removeItem('synapse_allow_student_justifications')
        setUsername('')
        setPassword('')
        setProfile(null)
        setSavedAccounts([])
        setIsConfigured(false)
        setAuthStep('input')
        setVerifiedCandidate(null)
    }

    const activeAccount = savedAccounts.find((a) => a.isActive) || savedAccounts[0]

    return {
        isConfigured,
        username,
        setUsername,
        password,
        setPassword,
        savedAccounts,
        profile,
        setProfile,
        newAccUser,
        setNewAccUser,
        newAccPass,
        setNewAccPass,
        isAddingAcc,
        authStep,
        setAuthStep,
        verifiedCandidate,
        authError,
        setAuthError,
        handleStartVerification,
        handleConfirmLogin,
        handleSwitchAccount,
        handleAddSecondaryAccount: handleStartAddAccountVerification,
        addAccountStep,
        setAddAccountStep,
        addAccountCandidate,
        addAccountError,
        setAddAccountError,
        handleStartAddAccountVerification,
        handleConfirmAddAccount,
        handleResetAddAccount,
        handleLogout,
        activeAccount
    }
}
