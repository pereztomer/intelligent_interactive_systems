import React from 'react'
import './ProsodicDiagram.css'

const ProsodicDiagram = ({ prosodicMetrics }) => {
  if (!prosodicMetrics) return null

  // Use the metrics directly
  const metrics = prosodicMetrics

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
