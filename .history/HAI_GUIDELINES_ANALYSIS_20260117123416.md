# HAI Guidelines Analysis for Presentation Rehearsal Coach

## Guidelines Addressed by Our System

### ✅ **INITIALLY** (2 guidelines)

#### 1. **Make clear what the system can do.** ✅ **ADDRESSED**
**How our system addresses it:**
- System clearly states it provides presentation feedback on pacing, filler words, clarity, and navigation patterns
- Users understand the system analyzes audio recordings and PDF navigation
- Interface shows what metrics are measured (pacing, pauses, filler words, pitch)
- Users know the system provides AI-generated coaching feedback

**Evidence:**
- Clear interface showing what the system measures
- Users see both raw metrics and AI interpretation
- System description explains capabilities upfront

---

#### 2. **Make clear how well the system can do what it can do.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- System shows objective metrics (quantifiable measurements)
- Users can see raw data alongside AI interpretation
- However: System doesn't explicitly state accuracy rates or confidence levels for AI feedback

**Evidence:**
- Raw metrics are always visible (transparent measurement)
- AI feedback is presented alongside metrics (users can verify)
- **Gap**: No explicit confidence indicators for AI interpretations

---

### ✅ **DURING INTERACTION** (4 guidelines)

#### 3. **Time services based on context.** ✅ **ADDRESSED**
**How our system addresses it:**
- System provides feedback **after** the presentation attempt, not during
- Feedback is contextually appropriate (post-attempt analysis)
- No interruptions during the actual presentation
- Analysis happens when user requests it

**Evidence:**
- Feedback only appears after recording stops
- User controls when to view feedback
- System respects presentation flow (doesn't interrupt)

---

#### 4. **Match relevant social norms.** ✅ **ADDRESSED**
**How our system addresses it:**
- System acts as a coaching tool, not an evaluator
- Feedback tone is supportive and educational (expert presentation coach role)
- No intrusive interruptions (unlike Clippy-style assistants)
- Respects user's presentation practice context

**Evidence:**
- AI prompt instructs system to act as "expert presentation coach"
- Feedback is constructive, not judgmental
- System is socially invisible during presentation (no interruptions)

---

#### 5. **Show contextually relevant information.** ✅ **ADDRESSED**
**How our system addresses it:**
- Feedback is based on actual presentation performance (audio + navigation + content)
- AI understands context (e.g., pause after slide change vs. mid-sentence)
- Multi-modal analysis provides relevant insights
- Session-level analysis shows trends across attempts

**Evidence:**
- Feedback correlates audio metrics with navigation patterns
- AI interprets relationships between metrics (e.g., fast pace + high filler words = nervousness)
- Context-aware pause analysis (slide transitions vs. speech pauses)

---

#### 6. **Mitigate social biases.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- System focuses on objective, measurable metrics (pacing, pauses, filler words)
- No demographic information collected or used
- Fair evaluation based on presentation skills, not personal characteristics

**Evidence:**
- Metrics are objective (words/min, pause duration, filler word count)
- No bias in what is measured
- **Gap**: System doesn't explicitly account for accent/dialect differences (potential bias from Lecture 10)

---

### ✅ **WHEN WRONG** (5 guidelines)

#### 7. **Support efficient invocation.** ✅ **ADDRESSED**
**How our system addresses it:**
- User can easily start a new recording session
- Simple interface to create new attempts
- Clear workflow for starting analysis

**Evidence:**
- "Start Recording" button
- Easy session/attempt creation
- Straightforward navigation

---

#### 8. **Support efficient correction.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- Users can practice again (create new attempts) to improve
- Multiple attempts allow iterative improvement
- However: Users cannot directly correct AI feedback or provide corrections to the system

**Evidence:**
- Multiple attempts per session
- Users can re-record to address issues
- **Gap**: No mechanism to flag incorrect feedback or provide corrections

---

#### 9. **Support efficient dismissal.** ✅ **ADDRESSED**
**How our system addresses it:**
- Users can ignore feedback if they choose
- Feedback is non-intrusive (appears only when user views it)
- Users can close feedback view and continue practicing
- No forced interaction with feedback

**Evidence:**
- Feedback is optional to view
- Users can navigate away from feedback
- No pop-ups or forced interactions

---

#### 10. **Scope services when in doubt.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- System shows raw metrics even if AI fails (graceful degradation)
- If AI interpretation fails, objective metrics are still available
- However: System doesn't explicitly state when it's uncertain or scope its services

**Evidence:**
- Graceful degradation (metrics available if AI fails)
- **Gap**: No explicit uncertainty expression in feedback (from Lecture 9 - Kim et al., 2024)

---

#### 11. **Make clear why the system did what it did.** ✅ **ADDRESSED**
**How our system addresses it:**
- AI feedback explains why issues matter (e.g., "high filler words + fast pace = nervousness")
- Users see both raw metrics and AI interpretation (can understand reasoning)
- Feedback is contextual and educational, not just metric reporting
- System shows what it measures (transparency)

**Evidence:**
- AI provides contextual explanations (not just numbers)
- Users can see metrics that led to feedback
- Feedback connects metrics to presentation concepts

---

### ✅ **OVER TIME** (7 guidelines)

#### 12. **Remember recent interactions.** ✅ **ADDRESSED**
**How our system addresses it:**
- System tracks multiple attempts within a session
- Session-level analysis remembers previous attempts
- Users can see history of their practice sessions

**Evidence:**
- Multiple attempts stored per session
- Session-level trend analysis
- Historical data available

---

#### 13. **Learn from user behavior.** ❌ **NOT ADDRESSED**
**How our system does NOT address it:**
- System does not adapt based on user behavior
- No personalization based on user's improvement patterns
- Feedback is generated fresh each time (no learning from past interactions)

**Evidence:**
- Each analysis is independent
- No user-specific adaptation
- No learning mechanism implemented

---

#### 14. **Update and adapt cautiously.** ⚠️ **N/A or PARTIALLY**
**How our system addresses it:**
- System uses stable LLM model (Gemini 2.0 Flash)
- No frequent updates that change behavior
- However: This guideline is more relevant for systems that update frequently

**Evidence:**
- Stable model usage
- **Note**: System doesn't update frequently, so this is less relevant

---

#### 15. **Encourage granular feedback.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- System provides specific, actionable feedback points
- Feedback is granular (2-3 focused points)
- However: System doesn't encourage users to provide feedback about the system itself

**Evidence:**
- Granular feedback output (specific points)
- **Gap**: No user feedback mechanism for system improvement

---

#### 16. **Convey the consequences of user actions.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- Session-level analysis shows improvement trends
- Users can see impact of their practice (progress over time)
- However: System doesn't explicitly explain consequences of following/not following feedback

**Evidence:**
- Trend analysis shows progress
- **Gap**: No explicit connection between following feedback and outcomes

---

#### 17. **Provide global controls.** ⚠️ **PARTIALLY ADDRESSED**
**How our system addresses it:**
- Users can control when to record and analyze
- Users can delete sessions/attempts
- However: Limited global settings (no preferences for feedback style, sensitivity, etc.)

**Evidence:**
- User controls recording and analysis
- Session management (create, delete)
- **Gap**: No global preferences or settings

---

#### 18. **Notify users about changes.** ❌ **NOT ADDRESSED**
**How our system does NOT address it:**
- System doesn't notify users about changes
- No version updates or feature changes to communicate
- This is less relevant for a prototype/assignment project

**Evidence:**
- No notification system
- **Note**: Less relevant for prototype stage

---

## Summary

### ✅ **Fully Addressed** (9 guidelines):
1. Make clear what the system can do
3. Time services based on context
4. Match relevant social norms
5. Show contextually relevant information
7. Support efficient invocation
9. Support efficient dismissal
11. Make clear why the system did what it did
12. Remember recent interactions

### ⚠️ **Partially Addressed** (7 guidelines):
2. Make clear how well the system can do what it can do
6. Mitigate social biases
8. Support efficient correction
10. Scope services when in doubt
15. Encourage granular feedback
16. Convey the consequences of user actions
17. Provide global controls

### ❌ **Not Addressed** (2 guidelines):
13. Learn from user behavior
18. Notify users about changes

---

## Recommended Focus for Report (Top 3)

Based on strong implementation and relevance:

1. **Guideline 11: Make clear why the system did what it did** ✅
   - Strong implementation: AI explains reasoning, shows metrics
   - Core to system's value proposition

2. **Guideline 5: Show contextually relevant information** ✅
   - Strong implementation: Multi-modal analysis, context-aware interpretation
   - Unique aspect of the system

3. **Guideline 1: Make clear what the system can do** ✅
   - Strong implementation: Clear interface, transparent metrics
   - Fundamental HAI principle

**Alternative options:**
- **Guideline 3: Time services based on context** (post-attempt feedback, no interruptions)
- **Guideline 12: Remember recent interactions** (session-level analysis)

