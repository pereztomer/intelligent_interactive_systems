import { useState } from 'react'
import './ProfilePage.css'

function ProfilePage({ currentUser, onUpdateUserStats }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedStats, setEditedStats] = useState(null)

  // Initialize edited stats when entering edit mode
  const handleEditClick = () => {
    if (currentUser?.surveyData) {
      setEditedStats({ ...currentUser.surveyData })
      setIsEditing(true)
    }
  }

  // Handle stat field change
  const handleStatChange = (field, value) => {
    setEditedStats(prev => ({ ...prev, [field]: value }))
  }

  // Save stats changes
  const handleSaveStats = async () => {
    if (currentUser && editedStats && onUpdateUserStats) {
      try {
        await onUpdateUserStats(currentUser.id, editedStats)
        setIsEditing(false)
        setEditedStats(null)
      } catch (error) {
        console.error('Error updating stats:', error)
        alert('Failed to update stats: ' + error.message)
      }
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedStats(null)
  }

  // Format stat labels for display
  const formatStatLabel = (key) => {
    const labels = {
      age: 'Age',
      gender: 'Gender',
      education: 'Education',
      englishFluency: 'English Fluency',
      lastPresentation: 'Last Presentation',
      managerialExperience: 'Managerial Experience',
      presentationTime: 'Presentation Time (min)',
      confidenceLevel: 'Confidence Level',
      domainKnowledge: 'Domain Knowledge',
      crowdAttention: 'Crowd Attention'
    }
    return labels[key] || key
  }

  // Format stat values for display
  const formatStatValue = (key, value) => {
    if (!value) return 'Not set'
    
    const formatMap = {
      gender: {
        'male': 'Male',
        'female': 'Female',
        'prefer_not_to_answer': 'Prefer not to answer'
      },
      education: {
        'high_school': 'High School',
        'bachelor': 'Bachelor',
        'master': 'Master',
        'higher': 'Higher'
      },
      englishFluency: {
        'beginner': 'Beginner',
        'intermediate': 'Intermediate',
        'advanced': 'Advanced',
        'native': 'Native'
      },
      lastPresentation: {
        'week': 'Within a week',
        'month': 'Within a month',
        '6_months': 'Within 6 months',
        'more_than_year': 'More than a year'
      },
      managerialExperience: {
        'yes': 'Yes',
        'no': 'No'
      },
      presentationTime: value => `${value} minute${value > 1 ? 's' : ''}`,
      confidenceLevel: value => `${value}/7`,
      domainKnowledge: value => `${value}/7`,
      crowdAttention: value => `${value}/7`
    }

    if (formatMap[key]) {
      if (typeof formatMap[key] === 'function') {
        return formatMap[key](value)
      }
      return formatMap[key][value] || value
    }
    return value
  }

  if (!currentUser?.surveyData) {
    return (
      <div className="profile-page">
        <div className="main-content-card">
          <div className="hero-section">
            <img src="/hero-image.png" alt="Hero" className="hero-image" />
            <h1 className="hero-title">Presentation Rehearsal Coach</h1>
            <div className="profile-header-overlay">
              <h2>My Stats</h2>
            </div>
          </div>
          <div className="page-content">
            <div className="profile-content">
              <p>No profile data available.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="main-content-card">
        <div className="hero-section">
          <img src="/hero-image.png" alt="Hero" className="hero-image" />
          <h1 className="hero-title">Presentation Rehearsal Coach</h1>
          <div className="profile-header-overlay">
            <h2>My Stats</h2>
          </div>
        </div>
        
        <div className="page-content">
          <div className="profile-content">
            {!isEditing ? (
              <>
                <div className="profile-actions">
                  <button className="edit-profile-button" onClick={handleEditClick}>
                    Edit Stats
                  </button>
                </div>
                <div className="stats-grid">
                  {Object.entries(currentUser.surveyData).map(([key, value]) => (
                    <div key={key} className="stat-card">
                      <div className="stat-card-label">{formatStatLabel(key)}</div>
                      <div className="stat-card-value">{formatStatValue(key, value)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="profile-edit">
                <div className="profile-edit-header">
                  <h3>Edit Your Profile</h3>
                  <p className="profile-edit-subtitle">Update your information below</p>
                </div>
                <form className="profile-edit-form" onSubmit={(e) => { e.preventDefault(); handleSaveStats(); }}>
                  {Object.entries(editedStats || {}).map(([key, value]) => (
                    <div key={key} className="profile-edit-field">
                      <label className="profile-edit-label">{formatStatLabel(key)}</label>
                      {key === 'age' || key === 'presentationTime' ? (
                        <select
                          value={value || ''}
                          onChange={(e) => handleStatChange(key, e.target.value)}
                          className="profile-edit-input"
                        >
                          <option value="">Select...</option>
                          {key === 'age' ? (
                            Array.from({ length: 84 }, (_, i) => i + 16).map(age => (
                              <option key={age} value={age}>{age}</option>
                            ))
                          ) : (
                            Array.from({ length: 60 }, (_, i) => i + 1).map(time => (
                              <option key={time} value={time}>{time} minute{time > 1 ? 's' : ''}</option>
                            ))
                          )}
                        </select>
                      ) : key === 'gender' ? (
                        <div className="profile-edit-radio-group">
                          {['male', 'female', 'prefer_not_to_answer'].map(opt => (
                            <label key={opt} className="profile-edit-radio">
                              <input
                                type="radio"
                                name={`edit-${key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleStatChange(key, e.target.value)}
                              />
                              {formatStatValue(key, opt)}
                            </label>
                          ))}
                        </div>
                      ) : key === 'education' ? (
                        <div className="profile-edit-radio-group">
                          {['high_school', 'bachelor', 'master', 'higher'].map(opt => (
                            <label key={opt} className="profile-edit-radio">
                              <input
                                type="radio"
                                name={`edit-${key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleStatChange(key, e.target.value)}
                              />
                              {formatStatValue(key, opt)}
                            </label>
                          ))}
                        </div>
                      ) : key === 'englishFluency' ? (
                        <div className="profile-edit-radio-group">
                          {['beginner', 'intermediate', 'advanced', 'native'].map(opt => (
                            <label key={opt} className="profile-edit-radio">
                              <input
                                type="radio"
                                name={`edit-${key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleStatChange(key, e.target.value)}
                              />
                              {formatStatValue(key, opt)}
                            </label>
                          ))}
                        </div>
                      ) : key === 'lastPresentation' ? (
                        <div className="profile-edit-radio-group">
                          {['week', 'month', '6_months', 'more_than_year'].map(opt => (
                            <label key={opt} className="profile-edit-radio">
                              <input
                                type="radio"
                                name={`edit-${key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleStatChange(key, e.target.value)}
                              />
                              {formatStatValue(key, opt)}
                            </label>
                          ))}
                        </div>
                      ) : key === 'managerialExperience' ? (
                        <div className="profile-edit-radio-group">
                          {['yes', 'no'].map(opt => (
                            <label key={opt} className="profile-edit-radio">
                              <input
                                type="radio"
                                name={`edit-${key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleStatChange(key, e.target.value)}
                              />
                              {formatStatValue(key, opt)}
                            </label>
                          ))}
                        </div>
                      ) : ['confidenceLevel', 'domainKnowledge', 'crowdAttention'].includes(key) ? (
                        <div className="profile-edit-scale">
                          <div className="profile-edit-scale-labels">
                            <span className="scale-label-left">
                              {key === 'confidenceLevel' ? '1 - Not at all' : 
                               key === 'domainKnowledge' ? '1 - No knowledge' : 
                               '1 - Very poor'}
                            </span>
                            <span className="scale-label-right">
                              {key === 'confidenceLevel' ? '7 - Extremely' : 
                               key === 'domainKnowledge' ? '7 - Mastery' : 
                               '7 - Excellent'}
                            </span>
                          </div>
                          <div className="profile-edit-scale-options">
                            {[1, 2, 3, 4, 5, 6, 7].map(num => (
                              <label key={num} className="profile-edit-scale-option">
                                <input
                                  type="radio"
                                  name={`edit-${key}`}
                                  value={String(num)}
                                  checked={value === String(num)}
                                  onChange={(e) => handleStatChange(key, e.target.value)}
                                />
                                <span>{num}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={value || ''}
                          onChange={(e) => handleStatChange(key, e.target.value)}
                          className="profile-edit-input"
                        />
                      )}
                    </div>
                  ))}
                  <div className="profile-edit-buttons">
                    <button type="button" className="cancel-profile-button" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button type="submit" className="save-profile-button">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
