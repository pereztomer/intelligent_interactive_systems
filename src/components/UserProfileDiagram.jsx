import React from 'react'
import './UserProfileDiagram.css'

const UserProfileDiagram = ({ sessions, userName }) => {
  // Calculate average metrics across all attempts in all sessions
  const calculateAverageMetrics = () => {
    let totalMetrics = {
      pacing: 0,
      fluency: 0,
      expressiveness: 0,
      stability: 0
    }
    let count = 0

    sessions.forEach(session => {
      if (session.attempts) {
        session.attempts.forEach(attempt => {
          if (attempt.prosodicMetrics) {
            totalMetrics.pacing += attempt.prosodicMetrics.pacing
            totalMetrics.fluency += attempt.prosodicMetrics.fluency
            totalMetrics.expressiveness += attempt.prosodicMetrics.expressiveness
            totalMetrics.stability += attempt.prosodicMetrics.stability
            count++
          }
        })
      }
    })

    if (count === 0) {
      return null
    }

    return {
      pacing: totalMetrics.pacing / count,
      fluency: totalMetrics.fluency / count,
      expressiveness: totalMetrics.expressiveness / count,
      stability: totalMetrics.stability / count,
      totalAttempts: count
    }
  }

  const metrics = calculateAverageMetrics()

  if (!metrics) {
    return (
      <div className="user-profile-diagram-container">
        <h3>👤 Speaker Profile</h3>
        <p style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
          No analyzed attempts yet. Complete some presentations with analysis to see your speaker profile!
        </p>
      </div>
    )
  }

  // Radar chart configuration
  const radius = 100
  const centerX = 180
  const centerY = 180
  const levels = 5 // Number of concentric circles

  // Metric configuration (clockwise from top)
  const metricConfig = [
    { key: 'pacing', label: 'Pacing', angle: 0 }, // Top (12 o'clock)
    { key: 'fluency', label: 'Fluency', angle: 90 }, // Right (3 o'clock)
    { key: 'expressiveness', label: 'Expressiveness', angle: 180 }, // Bottom (6 o'clock)
    { key: 'stability', label: 'Stability', angle: 270 } // Left (9 o'clock)
  ]

  // Convert polar coordinates to cartesian
  const polarToCartesian = (angle, distance) => {
    const radians = (angle - 90) * (Math.PI / 180)
    return {
      x: centerX + distance * Math.cos(radians),
      y: centerY + distance * Math.sin(radians)
    }
  }

  // Generate points for the data polygon
  const generateDataPoints = () => {
    return metricConfig.map(config => {
      const value = metrics[config.key]
      const distance = (value / 100) * radius
      return polarToCartesian(config.angle, distance)
    })
  }

  // Generate path string for the data polygon
  const dataPoints = generateDataPoints()
  const dataPath = dataPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z'

  return (
    <div className="user-profile-diagram-container">
      <h3>👤 {userName}'s Speaker Profile</h3>
      <p className="profile-subtitle">
        Average across {metrics.totalAttempts} analyzed attempt{metrics.totalAttempts !== 1 ? 's' : ''}
      </p>

      <div className="radar-chart-wrapper">
        <svg width="360" height="360" className="radar-chart" viewBox="0 0 360 360">
          {/* Background circles (grid) */}
          <g className="grid-circles">
            {[...Array(levels)].map((_, i) => {
              const levelRadius = radius * ((i + 1) / levels)
              return (
                <circle
                  key={i}
                  cx={centerX}
                  cy={centerY}
                  r={levelRadius}
                  fill="none"
                  stroke="rgba(200, 200, 200, 0.3)"
                  strokeWidth="1"
                />
              )
            })}
          </g>

          {/* Axis lines */}
          <g className="axis-lines">
            {metricConfig.map((config, index) => {
              const endPoint = polarToCartesian(config.angle, radius)
              return (
                <line
                  key={index}
                  x1={centerX}
                  y1={centerY}
                  x2={endPoint.x}
                  y2={endPoint.y}
                  stroke="rgba(150, 150, 150, 0.5)"
                  strokeWidth="1"
                />
              )
            })}
          </g>

          {/* Data polygon */}
          <path
            d={dataPath}
            fill="rgba(52, 152, 219, 0.5)"
            stroke="rgb(52, 152, 219)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {dataPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="rgb(52, 152, 219)"
              stroke="white"
              strokeWidth="2"
            >
              <title>{metricConfig[index].label}: {metrics[metricConfig[index].key].toFixed(1)}%</title>
            </circle>
          ))}

          {/* Labels */}
          {metricConfig.map((config, index) => {
            const labelDistance = radius + 15
            const labelPoint = polarToCartesian(config.angle, labelDistance)
            
            // Adjust text anchor based on position
            let textAnchor = 'middle'
            if (config.angle === 90) textAnchor = 'start'
            if (config.angle === 270) textAnchor = 'end'
            
            return (
              <text
                key={index}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                alignmentBaseline="middle"
                fontSize="15"
                fontWeight="700"
                fill="#2c3e50"
              >
                {config.label}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Metric values */}
      <div className="profile-metrics-list">
        {metricConfig.map(config => (
          <div key={config.key} className="profile-metric-item">
            <span className="metric-name">{config.label}:</span>
            <span className="metric-value">{metrics[config.key].toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserProfileDiagram
