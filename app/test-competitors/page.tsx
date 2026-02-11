'use client'

import { useState, useEffect } from 'react'

export default function TestCompetitors() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [fetchStatus, setFetchStatus] = useState<string>('Initializing...')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchStatus('🔄 Fetching /api/competitors...')
        console.log('[Test] Starting fetch...')
        
        const response = await fetch('/api/competitors', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        setFetchStatus(`✅ Response received (status: ${response.status})`)
        console.log('[Test] Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const jsonData = await response.json()
        setFetchStatus('✅ JSON parsed successfully')
        console.log('[Test] Data:', jsonData)
        
        setData(jsonData)
        setLoading(false)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setFetchStatus(`❌ Error: ${errorMsg}`)
        console.error('[Test] Error:', err)
        setError(errorMsg)
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Competitors API Test</h1>
      
      {/* Fetch Status */}
      <div style={{ 
        background: loading ? '#fff3cd' : (error ? '#f8d7da' : '#d4edda'), 
        padding: '15px', 
        marginTop: '20px', 
        borderRadius: '8px',
        border: '1px solid ' + (loading ? '#ffc107' : (error ? '#f5c6cb' : '#c3e6cb'))
      }}>
        <strong>Status:</strong> {fetchStatus}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ background: '#fee', padding: '20px', marginTop: '20px', borderRadius: '8px', border: '2px solid #f00' }}>
          <h2>❌ Error Occurred</h2>
          <pre style={{ color: '#c00', fontSize: '14px' }}>{error}</pre>
          <hr />
          <p><strong>Troubleshooting:</strong></p>
          <ol>
            <li>Check if the dev server is running on port 3001</li>
            <li>Open browser console (F12) for more details</li>
            <li>Try accessing: <a href="/api/competitors" target="_blank">/api/competitors</a> directly</li>
          </ol>
        </div>
      )}

      {/* Success Display */}
      {data && data.success && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ background: '#d4edda', padding: '20px', borderRadius: '8px', border: '2px solid #28a745' }}>
            <h2>✅ API Response Successful</h2>
            <p><strong>Success:</strong> {String(data.success)}</p>
            <p><strong>Count:</strong> {data.count}</p>
            <p><strong>Timestamp:</strong> {data.timestamp}</p>
          </div>
          
          <h3 style={{ marginTop: '30px' }}>📋 Competitors List:</h3>
          {data.competitors && data.competitors.length > 0 ? (
            <div>
              <ul style={{ fontSize: '16px', lineHeight: '2' }}>
                {data.competitors.map((comp: any, idx: number) => (
                  <li key={comp.id}>
                    <strong>#{idx + 1}</strong> - <code>{comp.id.toUpperCase()}</code>: {comp.brand_names[0]}
                  </li>
                ))}
              </ul>

              <h3>🎯 Dropdown Preview (This is what should appear on the main page):</h3>
              <select style={{ 
                width: '100%', 
                padding: '15px', 
                fontSize: '16px',
                marginTop: '10px',
                border: '2px solid #333',
                borderRadius: '6px'
              }}>
                <option value="">-- Select Competitor --</option>
                {data.competitors.map((comp: any) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.brand_names[0]} ({comp.id.toUpperCase()})
                  </option>
                ))}
              </select>

              <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
                <strong>✅ If you see 4 options above (WEEX, BITUNIX, BLOFIN, LBANK), the API works!</strong>
                <p style={{ marginTop: '10px' }}>Go back to the main page and hard-refresh: <strong>Cmd+Shift+R</strong> (Mac) or <strong>Ctrl+Shift+R</strong> (Windows)</p>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fee', padding: '20px', borderRadius: '8px' }}>
              <p>⚠️ No competitors found in response</p>
            </div>
          )}

          <details style={{ marginTop: '30px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
              🔍 Show Full JSON Response
            </summary>
            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '10px', overflow: 'auto' }}>
              <pre style={{ fontSize: '12px' }}>{JSON.stringify(data, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}

      {/* Loading Display */}
      {loading && !error && (
        <div style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <p style={{ fontSize: '18px', marginTop: '10px' }}>Loading API data...</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            If this takes more than 5 seconds, check the browser console (F12)
          </p>
        </div>
      )}

      {/* Direct API Link */}
      <div style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
        <h3>🔗 Direct API Access</h3>
        <p>Click here to test the API endpoint directly in a new tab:</p>
        <a 
          href="/api/competitors" 
          target="_blank" 
          style={{ 
            display: 'inline-block', 
            marginTop: '10px', 
            padding: '10px 20px', 
            background: '#007bff', 
            color: '#fff', 
            textDecoration: 'none', 
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          Open /api/competitors →
        </a>
      </div>
    </div>
  )
}
