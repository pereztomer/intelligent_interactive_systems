import React from 'react'
import './ProsodicDiagram.css'

const ProsodicDiagram = ({ analysisResult }) => {
  if (!analysisResult) return null

  // Parse the analysisResult string to extract the metrics
  const parseMetrics = (text) => {
    const metrics = {
      pacing: 0,
      fluency: 0,
      expressiveness: 0,
      stability: 0
    }

    const lines = text.split('\n')
    lines.forEach(line => {
      const match = line.match(/\*\*(\d+\.?\d*)%\*\*/)
      if (match) {
        const value = parseFloat(match[1])
        if (line.includes('Pacing:')) {
          metrics.pacing = value
        } else if (line.includes('Fluency:')) {
          metrics.fluency = value
        } else if (line.includes('Expressiveness:')) {
          metrics.expressiveness = value
        } else if (line.includes('Stability:')) {
          metrics.stability = value
        }
      }
    })

    return metrics
  }

  const metrics = parseMetrics(analysisResult)

  // Define metric configurations with colors and labels
  const metricConfig = [
    {
      key: 'pacing',
      label: 'Pacing',
      icon: '⚡',
      color: '#3498db',
      description: 'Words per minute'
    },
    {
      key: 'fluency',
      label: 'Fluency',
      icon: '💬',
      color: '#2ecc71',
      description: 'Speaking consistency'
    },
    {
      key: 'expressiveness',
      label: 'Expressiveness',
      icon: '🎭',
      color: '#e74c3c',
      description: 'Vocal variation'
    },
    {
      key: 'stability',
      label: 'Stability',
      icon: '🎯',
      color: '#f39c12',
      description: 'Volume control'
    }
  ]

  return (
    <div className="prosodic-diagram-container">
      <h3>📊 Voice Metrics Visualization</h3>
      <div className="prosodic-diagram">
        {metricConfig.map((config) => {
          const value = metrics[config.key]
          return (
            <div key={config.key} className="metric-row">
              <div className="metric-label">
                <span className="metric-icon">{config.icon}</span>
                <div className="metric-info">
                  <span className="metric-name">{config.label}</span>
                  <span className="metric-description">{config.description}</span>
                </div>
              </div>
              <div className="metric-bar-container">
                <div 
                  className="metric-bar"
                  style={{
                    width: `${value}%`,
                    backgroundColor: config.color
                  }}
                >
                  <span className="metric-value">{value.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="diagram-legend">
        <p>💡 These metrics are normalized to show relative performance (0-100%)</p>
      </div>
    </div>
  )
}

export default ProsodicDiagram
