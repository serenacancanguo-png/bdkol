'use client'

import { useState, useEffect } from 'react'
import './styles-simplified.css'

type Competitor = {
  id: string
  brand_names: string[]
}

type KeywordTemplate = {
  id: string
  label: string
  query: string
  description: string
}

type ChannelResult = {
  channelId: string
  channelTitle: string
  channelUrl: string
  subscriberCount: number
  relevanceScore: number
  evidence: string[]
}

type ApiResponse = {
  success: boolean
  competitor: string
  template: string
  channels: ChannelResult[]
  quotaInfo: {
    searchCalls: number
    videosCalls: number
    channelsCalls: number
    totalUnits: number
    cacheHit: boolean
    resetTime: string
  }
  error?: string
}

// 6 个关键词模板（六选一）
const KEYWORD_TEMPLATES: KeywordTemplate[] = [
  {
    id: 'contract_rebate',
    label: '合约+返佣',
    query: 'perps fee rebate',
    description: 'Perpetual futures + fee rebate programs'
  },
  {
    id: 'contract_partnership',
    label: '合约+联盟',
    query: 'futures partnership program',
    description: 'Futures trading partnership programs'
  },
  {
    id: 'contract_code',
    label: '合约+码',
    query: 'crypto futures referral code',
    description: 'Crypto futures referral codes'
  },
  {
    id: 'competitor_partnership',
    label: '竞品+联盟',
    query: '{competitor} futures partnership',
    description: 'Competitor-specific partnership'
  },
  {
    id: 'signals_vip',
    label: '信号群+合约',
    query: 'futures signals VIP join',
    description: 'Futures signals VIP groups'
  },
  {
    id: 'tutorial_referral',
    label: '教学+合约+返佣',
    query: 'tutorial perps referral link',
    description: 'Tutorial + perpetual + referral'
  },
]

export default function Home() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('')
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'x'>('youtube')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string>('')

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
    if (!selectedCompetitor || !selectedTemplate) {
      setError('Please select competitor and keyword template')
      return
    }

    if (selectedPlatform === 'x') {
      setError('X platform is not configured yet')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/run-single-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitor: selectedCompetitor,
          platform: selectedPlatform,
          templateId: selectedTemplate,
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

  const canRun = selectedCompetitor && selectedTemplate && selectedPlatform === 'youtube'

  return (
    <div className="simp-container">
      {/* Background */}
      <div className="simp-bg-gradient"></div>
      <div className="simp-bg-grid"></div>

      {/* Header */}
      <header className="simp-header">
        <div className="simp-logo">
          <span className="simp-logo-icon">🎯</span>
          <h1 className="simp-logo-text">
            BD KOL <span className="simp-gradient-text">Analytics</span>
          </h1>
        </div>
        
        {/* Small Quota Badge */}
        {result?.quotaInfo && (
          <div className="simp-quota-badge">
            {result.quotaInfo.cacheHit ? (
              <span className="simp-badge-success">
                ⚡ Cache Hit
              </span>
            ) : (
              <span className="simp-badge-info">
                💎 {result.quotaInfo.totalUnits} units
              </span>
            )}
            <span className="simp-badge-time">
              🕐 Reset: {result.quotaInfo.resetTime}
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="simp-main">
        {/* Configuration Panel */}
        <div className="simp-config-panel">
          {/* Competitor Select */}
          <div className="simp-section">
            <label className="simp-label">
              <span className="simp-label-icon">🎯</span>
              Competitor
            </label>
            <select
              className="simp-select"
              value={selectedCompetitor}
              onChange={(e) => {
                console.log('[Select] Competitor:', e.target.value)
                setSelectedCompetitor(e.target.value)
              }}
              disabled={loading}
            >
              <option value="">-- Select --</option>
              {competitors.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.brand_names[0]}
                </option>
              ))}
            </select>
            {/* Debug: Show state */}
            <div className="simp-debug-info">
              📊 {competitors.length} loaded | ✅ {selectedCompetitor || 'none'}
            </div>
          </div>

          {/* Platform Select */}
          <div className="simp-section">
            <label className="simp-label">
              <span className="simp-label-icon">🌐</span>
              Platform
            </label>
            <select
              className="simp-select"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as 'youtube' | 'x')}
              disabled={loading}
            >
              <option value="youtube">📺 YouTube</option>
              <option value="x">𝕏 X (Twitter)</option>
            </select>
            {selectedPlatform === 'x' && (
              <div className="simp-warning">⚠️ X platform not configured</div>
            )}
          </div>

          {/* Keyword Template (六选一) */}
          <div className="simp-section">
            <label className="simp-label">
              <span className="simp-label-icon">🔑</span>
              Keyword Template <span className="simp-required">(Required)</span>
            </label>
            <div className="simp-radio-group">
              {KEYWORD_TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className={`simp-radio-card ${selectedTemplate === template.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    disabled={loading}
                    className="simp-radio-input"
                  />
                  <div className="simp-radio-content">
                    <div className="simp-radio-label">{template.label}</div>
                    <div className="simp-radio-query">"{template.query}"</div>
                    <div className="simp-radio-desc">{template.description}</div>
                  </div>
                  {selectedTemplate === template.id && (
                    <div className="simp-radio-check">✓</div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <button
            className={`simp-run-button ${!canRun ? 'disabled' : ''}`}
            onClick={handleRun}
            disabled={!canRun || loading}
          >
            {loading ? (
              <>
                <span className="simp-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className="simp-button-icon">🚀</span>
                Run Analysis
              </>
            )}
          </button>
          {!canRun && !loading && (
            <div className="simp-hint">
              {!selectedCompetitor && '⚠️ Select competitor'}
              {!selectedTemplate && selectedCompetitor && '⚠️ Select keyword template'}
              {selectedPlatform === 'x' && '⚠️ X platform not configured'}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="simp-results-panel">
          {/* Error Display */}
          {error && (
            <div className="simp-error-card">
              <div className="simp-error-icon">⚠️</div>
              <div className="simp-error-text">{error}</div>
            </div>
          )}

          {/* Results - Top 5 Channels */}
          {result && result.channels && result.channels.length > 0 && (
            <div className="simp-results-card">
              <div className="simp-results-header">
                <h2 className="simp-results-title">
                  <span className="simp-title-icon">📊</span>
                  Top 5 Channels
                </h2>
                <div className="simp-results-count">{result.channels.length} found</div>
              </div>

              <div className="simp-channels-list">
                {result.channels.slice(0, 5).map((channel, index) => (
                  <div key={channel.channelId} className="simp-channel-card">
                    <div className="simp-channel-rank">#{index + 1}</div>
                    <div className="simp-channel-content">
                      <a
                        href={channel.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="simp-channel-title"
                      >
                        {channel.channelTitle}
                      </a>
                      <div className="simp-channel-stats">
                        <span className="simp-stat-item">
                          👥 {channel.subscriberCount.toLocaleString()}
                        </span>
                        <span className="simp-stat-item simp-stat-score">
                          🎯 {channel.relevanceScore}
                        </span>
                      </div>
                      {channel.evidence && channel.evidence.length > 0 && (
                        <div className="simp-channel-evidence">
                          {channel.evidence.slice(0, 2).map((ev, i) => (
                            <div key={i} className="simp-evidence-snippet">
                              💬 {ev}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && !error && !loading && (
            <div className="simp-empty-state">
              <div className="simp-empty-icon">🔍</div>
              <div className="simp-empty-text">Select options and run analysis</div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="simp-loading-state">
              <div className="simp-loading-spinner"></div>
              <div className="simp-loading-text">Analyzing YouTube channels...</div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="simp-footer">
        Powered by YouTube Data API v3 • Evidence-Based KOL Discovery
      </footer>
    </div>
  )
}
