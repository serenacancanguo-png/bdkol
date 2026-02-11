'use client'

import { useState, useEffect } from 'react'
import './styles-web3.css'

type Competitor = {
  id: string
  brand_names: string[]
}

type ChannelResult = {
  competitor: string
  channelId: string
  channelTitle: string
  channelUrl: string
  confidenceScore: number
  relationshipType: string
  relevanceScore?: number
  matchedKeywords?: string[]
  evidenceList: Array<{
    type: string
    snippet: string
  }>
  subscriberCount?: string
  videoCount?: number
  lastSeenDate: string
  contractSignals?: number
  monetizationSignals?: number
  isNorthAmerica?: boolean
  isLongTail?: boolean
}

type QuotaInfo = {
  exceeded: boolean
  exceededAt?: number
  estimatedCost: number
  actualSearchCalls: number
  cacheHits: number
  maxSearchRequests: number
  concurrencyLimit: number
  videosListCalls?: number
  channelsListCalls?: number
  message?: string
}

type ApiResponse = {
  success: boolean
  competitor: string
  totalChannels: number
  channels: ChannelResult[]
  quotaInfo?: QuotaInfo
  error?: string
}

export default function Home() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('')
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'x'>('youtube')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [debugMode, setDebugMode] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)

  useEffect(() => {
    fetchCompetitors()
  }, [])

  const fetchCompetitors = async () => {
    try {
      const response = await fetch('/api/competitors')
      const data = await response.json()
      if (data.success && data.competitors) {
        setCompetitors(data.competitors)
        if (data.competitors.length > 0) {
          setSelectedCompetitor(data.competitors[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch competitors:', err)
    }
  }

  const handleRun = async () => {
    if (!selectedCompetitor) {
      setError('Please select a competitor')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const apiEndpoint = selectedPlatform === 'youtube' ? '/api/run-youtube' : '/api/run-x'
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitorId: selectedCompetitor,
          debugMode,
          testMode,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const getQuotaResetTime = () => {
    const now = new Date()
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
    const beijingReset = new Date(utcMidnight.getTime() + 8 * 60 * 60 * 1000)
    return beijingReset.toLocaleString('en-US', { 
      timeZone: 'Asia/Shanghai',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="web3-container">
      {/* Background Effects - pointer-events-none to prevent blocking clicks */}
      <div className="web3-bg-gradient" style={{ pointerEvents: 'none' }}></div>
      <div className="web3-bg-grid" style={{ pointerEvents: 'none' }}></div>

      {/* Header */}
      <header className="web3-header">
        <div className="web3-header-left">
          <div className="web3-logo">
            <span className="web3-logo-icon">🎯</span>
            <h1 className="web3-logo-text">
              BD KOL <span className="web3-gradient-text">Analytics</span>
            </h1>
          </div>
        </div>
        <div className="web3-header-right">
          <div className="web3-platform-badge">
            {selectedPlatform === 'youtube' ? (
              <>
                <span className="web3-badge-icon">📺</span>
                <span>YouTube</span>
              </>
            ) : (
              <>
                <span className="web3-badge-icon">𝕏</span>
                <span>X (Soon)</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout - Two Columns */}
      <div className="web3-main-layout">
        {/* Left Panel - Configuration */}
        <div className="web3-left-panel">
          {/* Platform Selector */}
          <div className="web3-glass-card">
            <h2 className="web3-card-title">
              <span className="web3-title-icon">🌐</span>
              Platform
            </h2>
            <div className="web3-tabs">
              <button
                className={`web3-tab ${selectedPlatform === 'youtube' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('youtube')}
                disabled={loading}
              >
                <span className="web3-tab-icon">📺</span>
                YouTube
              </button>
              <button
                className={`web3-tab ${selectedPlatform === 'x' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('x')}
                disabled={loading}
                title="Coming Soon"
              >
                <span className="web3-tab-icon">𝕏</span>
                X
                <span className="web3-soon-badge">Soon</span>
              </button>
            </div>
          </div>

          {/* Competitor Selector */}
          <div className="web3-glass-card" style={{ position: 'relative', zIndex: 10 }}>
            <h2 className="web3-card-title">
              <span className="web3-title-icon">🎯</span>
              Competitor
            </h2>
            <select
              className="web3-select"
              value={selectedCompetitor}
              onChange={(e) => {
                console.log('[Competitor Select] Changed to:', e.target.value)
                setSelectedCompetitor(e.target.value)
              }}
              disabled={loading}
              style={{ position: 'relative', zIndex: 11, cursor: 'pointer' }}
            >
              <option value="">-- Select Competitor --</option>
              {competitors.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.brand_names[0]} ({comp.id.toUpperCase()})
                </option>
              ))}
            </select>
            {/* 🐛 Debug Info */}
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              <div>📊 Competitors loaded: {competitors.length}</div>
              <div>✅ Current selection: {selectedCompetitor || '(none)'}</div>
            </div>
          </div>

          {/* Mode Settings */}
          <div className="web3-glass-card">
            <h2 className="web3-card-title">
              <span className="web3-title-icon">⚙️</span>
              Settings
            </h2>
            <div className="web3-settings">
              <div className="web3-switch-row">
                <label className="web3-switch-label">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    disabled={loading}
                    className="web3-switch-input"
                  />
                  <span className="web3-switch-slider"></span>
                  <span className="web3-switch-text">
                    <span className="web3-switch-icon">🐛</span>
                    Debug Mode
                  </span>
                </label>
              </div>
              <div className="web3-switch-row">
                <label className="web3-switch-label">
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    disabled={loading}
                    className="web3-switch-input"
                  />
                  <span className="web3-switch-slider"></span>
                  <span className="web3-switch-text">
                    <span className="web3-switch-icon">🧪</span>
                    Test Mode
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            className={`web3-run-button ${loading ? 'loading' : ''}`}
            onClick={handleRun}
            disabled={loading || !selectedCompetitor}
          >
            {loading ? (
              <>
                <span className="web3-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className="web3-button-icon">🚀</span>
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Right Panel - Status & Results */}
        <div className="web3-right-panel">
          {/* Quota Status Card */}
          <div className="web3-glass-card">
            <h2 className="web3-card-title">
              <span className="web3-title-icon">💎</span>
              Quota Status
            </h2>
            <div className="web3-quota-grid">
              <div className="web3-quota-item">
                <div className="web3-quota-label">search.list</div>
                <div className="web3-quota-value">
                  {result?.quotaInfo?.actualSearchCalls || 0}
                  <span className="web3-quota-unit">calls</span>
                </div>
              </div>
              <div className="web3-quota-item">
                <div className="web3-quota-label">videos.list</div>
                <div className="web3-quota-value">
                  {result?.quotaInfo?.videosListCalls || 0}
                  <span className="web3-quota-unit">calls</span>
                </div>
              </div>
              <div className="web3-quota-item">
                <div className="web3-quota-label">channels.list</div>
                <div className="web3-quota-value">
                  {result?.quotaInfo?.channelsListCalls || 0}
                  <span className="web3-quota-unit">calls</span>
                </div>
              </div>
              <div className="web3-quota-item">
                <div className="web3-quota-label">Cache Hits</div>
                <div className="web3-quota-value web3-success">
                  {result?.quotaInfo?.cacheHits || 0}
                  <span className="web3-quota-unit">hits</span>
                </div>
              </div>
              <div className="web3-quota-item web3-quota-highlight">
                <div className="web3-quota-label">Estimated Cost</div>
                <div className="web3-quota-value web3-large">
                  {result?.quotaInfo?.estimatedCost || 0}
                  <span className="web3-quota-unit">units</span>
                </div>
              </div>
              <div className="web3-quota-item">
                <div className="web3-quota-label">Reset Time</div>
                <div className="web3-quota-value web3-small">
                  {getQuotaResetTime()}
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="web3-glass-card web3-error-card">
              <div className="web3-error-icon">⚠️</div>
              <div className="web3-error-text">{error}</div>
            </div>
          )}

          {/* Results Display */}
          {result && result.channels && result.channels.length > 0 && (
            <div className="web3-glass-card">
              <div className="web3-results-header">
                <h2 className="web3-card-title">
                  <span className="web3-title-icon">📊</span>
                  Results
                </h2>
                <div className="web3-results-badge">
                  {result.totalChannels} Channels Found
                </div>
              </div>
              <div className="web3-results-list">
                {result.channels.slice(0, 5).map((channel, index) => (
                  <div key={channel.channelId} className="web3-result-item">
                    <div className="web3-result-rank">#{index + 1}</div>
                    <div className="web3-result-content">
                      <a
                        href={channel.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="web3-result-title"
                      >
                        {channel.channelTitle}
                      </a>
                      <div className="web3-result-meta">
                        <span className="web3-result-subs">
                          👥 {channel.subscriberCount ? parseInt(channel.subscriberCount).toLocaleString() : 'N/A'}
                        </span>
                        {channel.relevanceScore !== undefined && (
                          <span className="web3-result-score">
                            🎯 {channel.relevanceScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {result.totalChannels > 5 && (
                <div className="web3-results-more">
                  +{result.totalChannels - 5} more channels
                </div>
              )}
            </div>
          )}

          {/* Debug Stats Panel (Collapsible) */}
          {result && (
            <div className="web3-glass-card">
              <button
                className="web3-collapse-header"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                <span className="web3-card-title">
                  <span className="web3-title-icon">🔍</span>
                  Debug Stats
                </span>
                <span className={`web3-collapse-icon ${showDebugPanel ? 'open' : ''}`}>
                  ▼
                </span>
              </button>
              {showDebugPanel && result.quotaInfo && (
                <div className="web3-debug-content">
                  <div className="web3-debug-item">
                    <span className="web3-debug-label">Max Requests:</span>
                    <span className="web3-debug-value">{result.quotaInfo.maxSearchRequests}</span>
                  </div>
                  <div className="web3-debug-item">
                    <span className="web3-debug-label">Concurrency Limit:</span>
                    <span className="web3-debug-value">{result.quotaInfo.concurrencyLimit}</span>
                  </div>
                  <div className="web3-debug-item">
                    <span className="web3-debug-label">Quota Exceeded:</span>
                    <span className={`web3-debug-value ${result.quotaInfo.exceeded ? 'web3-error' : 'web3-success'}`}>
                      {result.quotaInfo.exceeded ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {result.quotaInfo.message && (
                    <div className="web3-debug-message">
                      {result.quotaInfo.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Powered By */}
          <div className="web3-footer-text">
            Powered by YouTube Data API v3 • Evidence-Based KOL Discovery
          </div>
        </div>
      </div>
    </div>
  )
}
