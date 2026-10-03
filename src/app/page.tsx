'use client'

import { useState } from 'react'
import { testLibrusConnection } from './actions'

export default function Home() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await testLibrusConnection(username, password)
    setResult(res)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">Synapse API Test</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-400 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connecting...' : 'Test Connection'}
          </button>
        </form>

        {result && (
          <div className="mt-6 border border-gray-200 bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-800 break-all whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}