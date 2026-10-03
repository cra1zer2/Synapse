'use client'

import { useState, useEffect } from 'react'
import {
  executeLibrusDiagnostics,
  executeGatewayProbe,
  getJustificationsAction
} from './actions'

type TabKey =
  | 'accountInfo'
  | 'luckyNumber'
  | 'timetable'
  | 'grades'
  | 'absences'
  | 'calendar'
  | 'inbox'
  | 'announcements'
  | 'clientInternals'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('accountInfo')

  const [probePath, setProbePath] = useState('gateway/api/2.0/Justifications?dateFrom=2026-10-01&dateTo=2026-10-03')
  const [probeResult, setProbeResult] = useState<any>(null)
  const [probeLoading, setProbeLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState('2026-10-01')
  const [dateTo, setDateTo] = useState('2026-10-03')
  const [justificationsResult, setJustificationsResult] = useState<any>(null)
  const [justificationsLoading, setJustificationsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await executeLibrusDiagnostics(username, password)
      setResult(res)
    } catch (err) {
      setResult({ success: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault()
    setProbeLoading(true)
    try {
      const res = await executeGatewayProbe(username, password, probePath)
      setProbeResult(res)
    } catch (err) {
      setProbeResult({ success: false, error: String(err) })
    } finally {
      setProbeLoading(false)
    }
  }

  const handleFetchJustifications = async (e: React.FormEvent) => {
    e.preventDefault()
    setJustificationsLoading(true)
    try {
      const res = await getJustificationsAction(username, password, dateFrom, dateTo)
      setJustificationsResult(res)
    } catch (err) {
      setJustificationsResult({ success: false, error: String(err) })
    } finally {
      setJustificationsLoading(false)
    }
  }

  const tabs: TabKey[] = [
    'accountInfo',
    'luckyNumber',
    'timetable',
    'grades',
    'absences',
    'calendar',
    'inbox',
    'announcements',
    'clientInternals'
  ]

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Synapse Diagnostics Suite</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors h-[42px]"
            >
              {loading ? 'Testing All Endpoints...' : 'Run Full Diagnostics'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-3">eUsprawiedliwienia History Inspector</h2>
        <form onSubmit={handleFetchJustifications} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={justificationsLoading || !username || !password}
              className="w-full bg-indigo-600 text-white font-medium p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors h-[40px]"
            >
              {justificationsLoading ? 'Fetching...' : 'Verify Justifications History'}
            </button>
          </div>
        </form>

        {justificationsResult && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <pre className="text-xs text-gray-800 break-all whitespace-pre-wrap">
              {JSON.stringify(justificationsResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-3">Gateway Endpoint Probe</h2>
        <form onSubmit={handleProbe} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={probePath}
            onChange={(e) => setProbePath(e.target.value)}
            className="flex-1 border border-gray-400 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
          <button
            type="submit"
            disabled={probeLoading || !username || !password}
            className="bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {probeLoading ? 'Probing...' : 'Probe Gateway'}
          </button>
        </form>

        {probeResult && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <pre className="text-xs text-gray-800 break-all whitespace-pre-wrap">
              {JSON.stringify(probeResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {result && !result.success && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl">
          <p className="font-semibold">Authentication or Gateway Error:</p>
          <pre className="text-xs mt-2 whitespace-pre-wrap">{result.error}</pre>
        </div>
      )}

      {result && result.success && (
        <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {tabs.map((tab) => {
              const tabData = result.data[tab]
              const isOk = tab === 'clientInternals' ? true : tabData?.success
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-green-400' : 'bg-red-400'}`} />
                  {tab}
                </button>
              )
            })}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <pre className="text-xs text-gray-800 break-all whitespace-pre-wrap">
              {JSON.stringify(result.data[activeTab], null, 2)}
            </pre>
          </div>
        </div>
      )}
    </main>
  )
}