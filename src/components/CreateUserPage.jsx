import { useState } from 'react'
import './CreateUserPage.css'

function CreateUserPage({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    userName: '',
    age: '',
    gender: '',
    education: '',
    englishFluency: '',
    lastPresentation: '',
    managerialExperience: '',
    presentationTime: '',
    confidenceLevel: '',
    domainKnowledge: '',
    crowdAttention: ''
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate required fields
    const { userName, age, gender, education, englishFluency, lastPresentation, 
            managerialExperience, presentationTime, confidenceLevel, domainKnowledge, crowdAttention } = formData
    
    if (!userName.trim()) {
      alert('Please enter a user name')
      return
    }
    
    const requiredFields = { age, gender, education, englishFluency, lastPresentation, 
                            managerialExperience, presentationTime, confidenceLevel, domainKnowledge, crowdAttention }
    const emptyFields = Object.entries(requiredFields).filter(([_, value]) => !value)
    
    if (emptyFields.length > 0) {
      alert('Please fill in all survey fields before submitting.')
      return
    }
    
    const surveyData = {
      age,
      gender,
      education,
      englishFluency,
      lastPresentation,
      managerialExperience,
      presentationTime,
      confidenceLevel,
      domainKnowledge,
      crowdAttention
    }
    
    onSubmit(formData.userName, surveyData)
  }

  return (
    <div className="create-user-page">
      <div className="main-content-card">
        <div className="hero-section">
          <img src="/hero-image.png" alt="Hero" className="hero-image" />
          <h1 className="hero-title">Presentation Rehearsal Coach</h1>
        </div>
        
        <div className="page-content">
          <div className="create-user-content">
            <h2>Create New User</h2>
            <p className="subtitle">Please fill in your information to get started</p>
            
            <form onSubmit={handleSubmit} className="create-user-form">
              {/* User Name */}
              <div className="form-field">
                <label htmlFor="userName">User Name *</label>
                <input
                  id="userName"
                  type="text"
                  value={formData.userName}
                  onChange={(e) => handleChange('userName', e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Question 1: Age */}
              <div className="form-field">
                <label htmlFor="age">1. Age *</label>
                <select 
                  id="age"
                  value={formData.age} 
                  onChange={(e) => handleChange('age', e.target.value)}
                  required
                >
                  <option value="">Select your age</option>
                  {Array.from({ length: 84 }, (_, i) => i + 16).map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              {/* Question 2: Gender */}
              <div className="form-field">
                <label>2. Gender *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      required
                    />
                    Male
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                    />
                    Female
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value="prefer_not_to_answer"
                      checked={formData.gender === 'prefer_not_to_answer'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                    />
                    Prefer not to answer
                  </label>
                </div>
              </div>

              {/* Question 3: Education */}
              <div className="form-field">
                <label>3. Education *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="education"
                      value="high_school"
                      checked={formData.education === 'high_school'}
                      onChange={(e) => handleChange('education', e.target.value)}
                      required
                    />
                    High School
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="education"
                      value="bachelor"
                      checked={formData.education === 'bachelor'}
                      onChange={(e) => handleChange('education', e.target.value)}
                    />
                    Bachelor
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="education"
                      value="master"
                      checked={formData.education === 'master'}
                      onChange={(e) => handleChange('education', e.target.value)}
                    />
                    Master
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="education"
                      value="higher"
                      checked={formData.education === 'higher'}
                      onChange={(e) => handleChange('education', e.target.value)}
                    />
                    Higher
                  </label>
                </div>
              </div>

              {/* Question 4: English Fluency */}
              <div className="form-field">
                <label>4. English Fluency *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="englishFluency"
                      value="beginner"
                      checked={formData.englishFluency === 'beginner'}
                      onChange={(e) => handleChange('englishFluency', e.target.value)}
                      required
                    />
                    Beginner
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="englishFluency"
                      value="intermediate"
                      checked={formData.englishFluency === 'intermediate'}
                      onChange={(e) => handleChange('englishFluency', e.target.value)}
                    />
                    Intermediate
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="englishFluency"
                      value="advanced"
                      checked={formData.englishFluency === 'advanced'}
                      onChange={(e) => handleChange('englishFluency', e.target.value)}
                    />
                    Advanced
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="englishFluency"
                      value="native"
                      checked={formData.englishFluency === 'native'}
                      onChange={(e) => handleChange('englishFluency', e.target.value)}
                    />
                    Native
                  </label>
                </div>
              </div>

              {/* Question 5: Last Presentation */}
              <div className="form-field">
                <label>5. When was the last time you presented in front of a crowd (more than 3 people)? *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="lastPresentation"
                      value="week"
                      checked={formData.lastPresentation === 'week'}
                      onChange={(e) => handleChange('lastPresentation', e.target.value)}
                      required
                    />
                    Within a week
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="lastPresentation"
                      value="month"
                      checked={formData.lastPresentation === 'month'}
                      onChange={(e) => handleChange('lastPresentation', e.target.value)}
                    />
                    Within a month
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="lastPresentation"
                      value="6_months"
                      checked={formData.lastPresentation === '6_months'}
                      onChange={(e) => handleChange('lastPresentation', e.target.value)}
                    />
                    Within 6 months
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="lastPresentation"
                      value="more_than_year"
                      checked={formData.lastPresentation === 'more_than_year'}
                      onChange={(e) => handleChange('lastPresentation', e.target.value)}
                    />
                    More than a year
                  </label>
                </div>
              </div>

              {/* Question 6: Managerial Experience */}
              <div className="form-field">
                <label>6. Do you have previous experience in a managerial position (military or industry)? *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="managerialExperience"
                      value="yes"
                      checked={formData.managerialExperience === 'yes'}
                      onChange={(e) => handleChange('managerialExperience', e.target.value)}
                      required
                    />
                    Yes
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="managerialExperience"
                      value="no"
                      checked={formData.managerialExperience === 'no'}
                      onChange={(e) => handleChange('managerialExperience', e.target.value)}
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Question 7: Presentation Time */}
              <div className="form-field">
                <label htmlFor="presentationTime">7. What is the required time you are allowed/planning to present? (in minutes) *</label>
                <select 
                  id="presentationTime"
                  value={formData.presentationTime} 
                  onChange={(e) => handleChange('presentationTime', e.target.value)}
                  required
                >
                  <option value="">Select presentation time</option>
                  {Array.from({ length: 60 }, (_, i) => i + 1).map(time => (
                    <option key={time} value={time}>{time} minute{time > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Question 8: Confidence Level */}
              <div className="form-field">
                <label>8. How confident do you feel about presenting in front of an audience? *</label>
                <div className="scale-container">
                  <span className="scale-label-left">1 - Not at all</span>
                  <div className="scale-options">
                    {[1, 2, 3, 4, 5, 6, 7].map(value => (
                      <label key={value} className="scale-option">
                        <input
                          type="radio"
                          name="confidenceLevel"
                          value={value}
                          checked={formData.confidenceLevel === String(value)}
                          onChange={(e) => handleChange('confidenceLevel', e.target.value)}
                          required
                        />
                        <span className="scale-number">{value}</span>
                      </label>
                    ))}
                  </div>
                  <span className="scale-label-right">7 - Extremely</span>
                </div>
              </div>

              {/* Question 9: Domain Knowledge */}
              <div className="form-field">
                <label>9. How knowledgeable are you about the topic you will be presenting? *</label>
                <div className="scale-container">
                  <span className="scale-label-left">1 - No knowledge</span>
                  <div className="scale-options">
                    {[1, 2, 3, 4, 5, 6, 7].map(value => (
                      <label key={value} className="scale-option">
                        <input
                          type="radio"
                          name="domainKnowledge"
                          value={value}
                          checked={formData.domainKnowledge === String(value)}
                          onChange={(e) => handleChange('domainKnowledge', e.target.value)}
                          required
                        />
                        <span className="scale-number">{value}</span>
                      </label>
                    ))}
                  </div>
                  <span className="scale-label-right">7 - Mastery</span>
                </div>
              </div>

              {/* Question 10: Crowd Attention */}
              <div className="form-field">
                <label>10. How would you rate your ability to capture and maintain an audience's attention? *</label>
                <div className="scale-container">
                  <span className="scale-label-left">1 - Very poor</span>
                  <div className="scale-options">
                    {[1, 2, 3, 4, 5, 6, 7].map(value => (
                      <label key={value} className="scale-option">
                        <input
                          type="radio"
                          name="crowdAttention"
                          value={value}
                          checked={formData.crowdAttention === String(value)}
                          onChange={(e) => handleChange('crowdAttention', e.target.value)}
                          required
                        />
                        <span className="scale-number">{value}</span>
                      </label>
                    ))}
                  </div>
                  <span className="scale-label-right">7 - Excellent</span>
                </div>
              </div>

              <div className="form-buttons">
                <button type="button" onClick={onCancel} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create User & Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateUserPage
