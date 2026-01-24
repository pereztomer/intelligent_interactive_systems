import React, { useState } from 'react'
import './SessionDiagram.css'

const SessionDiagram = ({ attempts }) => {
  const [selectedMetric, setSelectedMetric] = useState(null)
  
  // Filter attempts that have prosodic metrics
  const attemptsWithMetrics = attempts
    .filter(attempt => attempt.prosodicMetrics)
    .map((attempt, index) => ({
      attemptNumber: attempts.indexOf(attempt) + 1,
      metrics: attempt.prosodicMetrics,
      timestamp: attempt.timestamp
    }))

  if (attemptsWithMetrics.length === 0) {
    return null
  }

  // Metric configurations
  const metricConfig = [
    { key: 'pacing', label: 'Pacing', icon: '⚡', color: '#3498db' },
    { key: 'fluency', label: 'Fluency', icon: '💬', color: '#2ecc71' },
    { key: 'expressiveness', label: 'Expressiveness', icon: '🎭', color: '#e74c3c' },
    { key: 'stability', label: 'Stability', icon: '🎯', color: '#f39c12' }
  ]

  // Calculate SVG dimensions
  const width = 800
  const height = 300
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Scale functions
  const xScale = (index) => {
    return padding.left + (index / Math.max(attemptsWithMetrics.length - 1, 1)) * chartWidth
  }

  const yScale = (value) => {
    return padding.top + chartHeight - (value / 100) * chartHeight
  }

  // Generate path for a metric
  const generatePath = (metricKey) => {
    return attemptsWithMetrics
      .map((attempt, index) => {
        const x = xScale(index)
        const y = yScale(attempt.metrics[metricKey])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(' ')
  }

  // Calculate improvement for each metric
  const calculateImprovement = (metricKey) => {
    if (attemptsWithMetrics.length < 2) return null
    const first = attemptsWithMetrics[0].metrics[metricKey]
    const last = attemptsWithMetrics[attemptsWithMetrics.length - 1].metrics[metricKey]
    const change = last - first
    return {
      value: change,
      percentage: ((change / first) * 100).toFixed(1),
      isImprovement: change > 0
    }
  }

  return (
    <div className="session-diagram-container">
      <h3>📈 Progress Tracking Across Attempts</h3>
      <p className="session-diagram-subtitle">
        Visualizing your improvement journey • {attemptsWithMetrics.length} analyzed attempt(s)
      </p>

      <div className="session-chart-wrapper">
        <svg width={width} height={height} className="session-chart">
          {/* Grid lines */}
          <g className="grid">
            {[0, 25, 50, 75, 100].map(value => (
              <g key={value}>
                <line
                  x1={padding.left}
                  y1={yScale(value)}
                  x2={width - padding.right}
                  y2={yScale(value)}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={yScale(value)}
                  fill="rgba(255, 255, 255, 0.6)"
                  fontSize="12"
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {value}%
                </text>
              </g>
            ))}
          </g>

          {/* X-axis labels */}
          <g className="x-axis">
            {attemptsWithMetrics.map((attempt, index) => (
              <text
                key={index}
                x={xScale(index)}
                y={height - padding.bottom + 20}
                fill="rgba(255, 255, 255, 0.8)"
                fontSize="12"
                textAnchor="middle"
              >
                Attempt {attempt.attemptNumber}
              </text>
            ))}
          </g>

          {/* Plot lines for each metric */}
          {metricConfig.map((config) => (
            <g key={config.key}>
              {/* Line */}
              <path
                d={generatePath(config.key)}
                fill="none"
                stroke={config.color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={selectedMetric === null || selectedMetric === config.key ? 1 : 0.15}
                style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
              />
              {/* Points */}
              {attemptsWithMetrics.map((attempt, index) => (
                <g key={index}>
                  <circle
                    cx={xScale(index)}
                    cy={yScale(attempt.metrics[config.key])}
                    r="6"
                    fill={config.color}
                    stroke="white"
                    strokeWidth="2"
                    opacity={selectedMetric === null || selectedMetric === config.key ? 1 : 0.15}
                    style={{ transition: 'opacity 0.3s ease, r 0.3s ease' }}
                  />
                  {/* Value label on hover */}
                  <title>
                    {config.label}: {attempt.metrics[config.key].toFixed(1)}%
                  </title>
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend and Improvement Summary */}
      <div className="session-metrics-summary">
        {metricConfig.map((config) => {
          const improvement = calculateImprovement(config.key)
          return (
            <div 
              key={config.key} 
              className={`metric-summary-item ${selectedMetric === config.key ? 'selected' : ''}`}
              onClick={() => setSelectedMetric(selectedMetric === config.key ? null : config.key)}
              style={{
                cursor: 'pointer',
                opacity: selectedMetric === null || selectedMetric === config.key ? 1 : 0.4,
                transform: selectedMetric === config.key ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <div className="metric-summary-header">
                <span className="metric-icon">{config.icon}</span>
                <span className="metric-label" style={{ color: config.color }}>
                  {config.label}
                </span>
              </div>
              {improvement && (
                <div className="metric-change">
                  <span className={improvement.isImprovement ? 'change-positive' : 'change-negative'}>
                    {improvement.isImprovement ? '↗' : '↘'} 
                    {Math.abs(improvement.value).toFixed(1)}% 
                    ({improvement.isImprovement ? '+' : ''}{improvement.percentage}%)
                  </span>
                </div>
              )}
              {!improvement && (
                <div className="metric-change">
                  <span className="change-neutral">Single attempt</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="session-diagram-footer">
        <p>💡 Track your progress over time and identify areas for continued improvement</p>
      </div>
    </div>
  )
}

export default SessionDiagram
