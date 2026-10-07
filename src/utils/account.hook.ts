'use client'

import { useState, useEffect } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { AppLanguage, AppDictionary } from '@/config/dictionary.config'
import { getStudentProfileAction } from '@/app/actions'

interface UseAccountSessionOptions {
    lang: AppLanguage
    t: AppDictionary
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

    const [authStep, setAuthStep] = useState<'input' | 'verifying' | 'preview'>('input')
    const [verifiedCandidate, setVerifiedCandidate] = useState<StudentProfile | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)

    useEffect(() => {
        const savedAccountsJson = localStorage.getItem('synapse_accounts')
        let loadedAccounts: SavedAccount[] = []
        if (savedAccountsJson) {
            try {
                loadedAccounts = JSON.parse(savedAccountsJson)
            } catch { }
        }

        const savedUser = localStorage.getItem('synapse_user') || ''
        const savedPass = localStorage.getItem('synapse_pass') || ''

        if (loadedAccounts.length === 0 && savedUser && savedPass) {
            const isStudent = savedUser.trim().toLowerCase().endsWith('u')
            const initialAccount: SavedAccount = {
                id: savedUser,
                username: savedUser,
                password: savedPass,
                role: isStudent ? 'student' : 'parent',
                profile: {
                    fullName: savedUser,
                    className: '4 Tsa Technikum',
                    schoolName: 'TEB Edukacja',
                    luckyNumber: null,
                    role: isStudent ? 'student' : 'parent'
                },
                isActive: true
            }
            loadedAccounts = [initialAccount]
            localStorage.setItem('synapse_accounts', JSON.stringify([initialAccount]))
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

        const res = await getStudentProfileAction(username, password)
        if (res.success && res.data) {
            setVerifiedCandidate(res.data)
            setAuthStep('preview')
        } else {
            setAuthError(res.error || t.loginError)
            setAuthStep('input')
        }
    }

    const handleConfirmLogin = () => {
        if (!verifiedCandidate) return
        localStorage.setItem('synapse_user', username)
        localStorage.setItem('synapse_pass', password)
        localStorage.setItem('synapse_lang', lang)

        const newAcc: SavedAccount = {
            id: username,
            username,
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
        const updated = savedAccounts.map((a) => ({
            ...a,
            isActive: a.id === acc.id
        }))
        setSavedAccounts(updated)
        localStorage.setItem('synapse_accounts', JSON.stringify(updated))
        localStorage.setItem('synapse_user', acc.username)
        localStorage.setItem('synapse_pass', acc.password)
        setUsername(acc.username)
        setPassword(acc.password)
        setProfile(acc.profile)
    }

    const handleAddSecondaryAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsAddingAcc(true)
        const res = await getStudentProfileAction(newAccUser, newAccPass)
        setIsAddingAcc(false)

        if (res.success && res.data) {
            const newAcc: SavedAccount = {
                id: newAccUser,
                username: newAccUser,
                password: newAccPass,
                role: res.data.role,
                profile: res.data,
                isActive: false
            }
            const updated = [...savedAccounts, newAcc]
            setSavedAccounts(updated)
            localStorage.setItem('synapse_accounts', JSON.stringify(updated))
            setNewAccUser('')
            setNewAccPass('')
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('synapse_user')
        localStorage.removeItem('synapse_pass')
        localStorage.removeItem('synapse_accounts')
        localStorage.removeItem('synapse_cache')
        localStorage.removeItem('synapse_week_cache')
        localStorage.removeItem('synapse_theme')
        localStorage.removeItem('synapse_text_clamp')
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
        handleStartVerification,
        handleConfirmLogin,
        handleSwitchAccount,
        handleAddSecondaryAccount,
        handleLogout,
        activeAccount
    }
}