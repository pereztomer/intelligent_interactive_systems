// Analysis formatting utilities

// Normalize analysis result to handle both camelCase and snake_case
const normalizeAnalysisResult = (result) => {
  const segments = result.speechSegments || result.speech_segments || []
  const pacing = result.pacing || result.pacing_metrics || {}
  
  return {
    duration: result.duration,
    segments: segments.map(seg => ({
      duration: seg.duration,
      features: {
        wordsPerMinute: seg.audioFeatures?.wordsPerMinute || seg.audio_features?.words_per_minute || 0,
        pitchRangeHz: seg.audioFeatures?.pitchRangeHz || seg.audio_features?.pitch_range_hz || 0,
        energyVariance: seg.audioFeatures?.energyVariance || seg.audio_features?.energy_variance || 0,
        fillerWords: seg.audioFeatures?.fillerWords || seg.audio_features?.filler_words || []
      }
    })),
    speakingPercentage: pacing.speakingPercentage || pacing.speaking_percentage || 0,
    geminiFeedback: result.geminiFeedback || result.gemini_feedback || null
  }
}

// Generate speaker profile from analysis result
export const generateSpeakerProfile = (result) => {
  const normalized = normalizeAnalysisResult(result)
  
  let totalSpeechDuration = 0
  let weightedWpmSum = 0
  let weightedPitchRangeSum = 0
  let weightedEnergyVarSum = 0
  let allFillers = []

  normalized.segments.forEach(seg => {
    const dur = seg.duration
    const features = seg.features

    totalSpeechDuration += dur
    weightedWpmSum += features.wordsPerMinute * dur
    weightedPitchRangeSum += features.pitchRangeHz * dur
    weightedEnergyVarSum += features.energyVariance * dur
    allFillers.push(...features.fillerWords)
  })

  const avgWpm = totalSpeechDuration > 0 ? weightedWpmSum / totalSpeechDuration : 0
  const avgPitchRange = totalSpeechDuration > 0 ? weightedPitchRangeSum / totalSpeechDuration : 0
  const avgEnergyVar = totalSpeechDuration > 0 ? weightedEnergyVarSum / totalSpeechDuration : 0
  const speakingPct = normalized.speakingPercentage
  const uniqueFillers = [...new Set(allFillers)]

  // Normalize values to percentages (0-100)
  const normalizedWpm = Math.min(100, (avgWpm / 200) * 100)
  const normalizedPitchRange = Math.min(100, (avgPitchRange / 400) * 100)
  const normalizedEnergyVar = Math.min(100, (avgEnergyVar / 0.015) * 100)

  const profile = {}

  // Pacing Analysis
  if (avgWpm < 110) {
    profile.pacing = `The speaker maintains a slow, deliberate pace.`
  } else if (avgWpm <= 140) {
    profile.pacing = `The speaker communicates at an ideal conversational rate.`
  } else {
    profile.pacing = `The delivery is rapid, suggesting high urgency.`
  }

  // Fluency Analysis
  if (speakingPct < 55) {
    profile.fluency = `The speech is highly fragmented with long silences.`
  } else if (speakingPct <= 75) {
    profile.fluency = `The flow is natural with balanced pauses.`
  } else {
    profile.fluency = `The speaker is exceptionally fluent with minimal interruptions.`
  }

  // Expressiveness Analysis
  if (avgPitchRange < 150) {
    profile.expressiveness = `The vocal tone is relatively monotone.`
  } else if (avgPitchRange <= 250) {
    profile.expressiveness = `The voice shows healthy modulation.`
  } else {
    profile.expressiveness = `The speaker is highly dynamic, using a wide pitch range to emphasize points.`
  }

  // Stability Analysis
  if (avgEnergyVar < 0.002) {
    profile.stability = `The speaker exhibits exceptional vocal control, maintaining a very steady and professional volume.`
  } else if (avgEnergyVar <= 0.007) {
    profile.stability = `Volume levels are mostly consistent, with natural energy shifts that help maintain listener interest.`
  } else {
    profile.stability = `There are significant fluctuations in vocal energy, which may suggest inconsistent breath control or very intense emotional emphasis.`
  }

  // Filler Words
  if (uniqueFillers.length > 0) {
    profile.fillers = `Usage of filler words like '${uniqueFillers.join(", ")}' was noted.`
  } else {
    profile.fillers = "The speech is clean, with no detectable filler words."
  }

  return profile
}

// Extract prosodic metrics as percentages for visualization
export const extractProsodicMetrics = (result) => {
  const normalized = normalizeAnalysisResult(result)
  
  let totalSpeechDuration = 0
  let weightedWpmSum = 0
  let weightedPitchRangeSum = 0
  let weightedEnergyVarSum = 0

  normalized.segments.forEach(seg => {
    const dur = seg.duration
    const features = seg.features

    totalSpeechDuration += dur
    weightedWpmSum += features.wordsPerMinute * dur
    weightedPitchRangeSum += features.pitchRangeHz * dur
    weightedEnergyVarSum += features.energyVariance * dur
  })

  const avgWpm = totalSpeechDuration > 0 ? weightedWpmSum / totalSpeechDuration : 0
  const avgPitchRange = totalSpeechDuration > 0 ? weightedPitchRangeSum / totalSpeechDuration : 0
  const avgEnergyVar = totalSpeechDuration > 0 ? weightedEnergyVarSum / totalSpeechDuration : 0
  const speakingPct = normalized.speakingPercentage

  // Normalize values to percentages (0-100)
  const normalizedWpm = Math.min(100, (avgWpm / 200) * 100)
  const normalizedPitchRange = Math.min(100, (avgPitchRange / 400) * 100)
  const normalizedEnergyVar = Math.min(100, (avgEnergyVar / 0.015) * 100)

  return {
    pacing: parseFloat(normalizedWpm.toFixed(1)),
    fluency: parseFloat(speakingPct.toFixed(1)),
    expressiveness: parseFloat(normalizedPitchRange.toFixed(1)),
    stability: parseFloat(normalizedEnergyVar.toFixed(1))
  }
}

// Format Gemini feedback text
export const formatGeminiFeedback = (result) => {
  const feedback = result.geminiFeedback || result.feedback || null
  if (!feedback) return null
  
  return feedback
    .split(/[.!?]\s+/)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const trimmed = line.trim()
      return trimmed && !trimmed.match(/[.!?]$/) ? trimmed + '.' : trimmed
    })
    .join('\n')
}

// Format analysis results for display
export const formatAnalysisResults = (result) => {
  const normalized = normalizeAnalysisResult(result)
  const lines = []
  
  lines.push(`⏱️  Duration: ${normalized.duration.toFixed(1)}s`)
  lines.push('')

  if (normalized.segments.length > 0) {
    const profile = generateSpeakerProfile(result)
    lines.push('👤 SPEAKER PROFILE:')
    lines.push(`   • Pacing: ${profile.pacing}`)
    lines.push(`   • Fluency: ${profile.fluency}`)
    lines.push(`   • Expressiveness: ${profile.expressiveness}`)
    lines.push(`   • Stability: ${profile.stability}`)
    lines.push(`   • Fillers: ${profile.fillers}`)
  }
  
  return lines.join('\n')
}

