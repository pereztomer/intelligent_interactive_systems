# HAI Guidelines Implementation

## How Our System Addresses Five Core HAI Guidelines

Our Presentation Rehearsal Coach addresses five key guidelines from Amershi et al.'s (2019) framework for Human-AI Interaction, ensuring effective collaboration between users and the AI system.

### Guideline 1: Make Clear What the System Can Do

Our system explicitly communicates its capabilities through a transparent interface design. Upon starting a session, users understand that the system analyzes presentation performance across four key dimensions: speech pacing, filler word usage, pause patterns, and slide navigation timing. The interface displays both raw metrics (words per minute, pause durations, filler word counts) and AI-generated interpretations, making it clear that the system provides coaching feedback rather than evaluation. Users can see exactly what data is being collected—audio recordings, navigation events, and PDF content—before analysis begins. This transparency builds appropriate expectations and helps users understand the system's scope: it is a coaching tool for practice, not a replacement for human feedback or formal evaluation.

### Guideline 3: Time Services Based on Context

The system demonstrates contextual awareness by providing feedback at appropriate moments rather than interrupting the user's presentation flow. Analysis and feedback occur exclusively *after* a recording session completes, never during the actual presentation. This design respects the user's need for uninterrupted practice while ensuring feedback is available when the user is ready to reflect. The system recognizes that the context of receiving feedback (post-attempt reflection) differs fundamentally from the context of giving a presentation (active performance), and times its services accordingly. Users maintain full control over when to view feedback, allowing them to practice multiple times before reviewing results, which aligns with natural learning patterns.

### Guideline 5: Show Contextually Relevant Information

Our system excels at providing contextually relevant feedback through multi-modal analysis that synthesizes audio, text, and navigation data. The AI understands that a pause occurring after a slide transition serves a different purpose than a pause mid-sentence, and interprets metrics accordingly. For example, the system recognizes that high filler word count combined with fast speaking pace in the context of a presentation indicates nervousness, rather than simply reporting isolated metrics. The feedback correlates navigation patterns (time spent on each slide) with speech patterns (pacing, pauses) to identify whether content is being delivered too quickly or if slides are being rushed. This contextual understanding enables the system to provide relevant, actionable insights rather than generic observations.

### Guideline 11: Make Clear Why the System Did What It Did

Transparency in reasoning is a core strength of our system. The AI feedback explicitly explains the relationships between metrics and their implications for presentation quality. Rather than merely stating "you used many filler words," the system explains *why* this matters: "High filler word usage combined with fast pacing suggests nervousness—consider practicing deep breathing techniques before presenting." Users can see the underlying metrics (raw data) alongside the AI's interpretation, enabling them to understand the reasoning process. The system shows what it measured (e.g., 15 filler words, 180 words/minute) and explains how these measurements relate to presentation effectiveness. This transparency allows users to verify the AI's reasoning and builds trust through explainability rather than blind acceptance.

### Guideline 12: Remember Recent Interactions

The system maintains memory of user interactions through session-level analysis that tracks progress across multiple practice attempts. When users practice the same presentation multiple times, the system remembers previous attempts and provides trend analysis. The session-level feedback identifies improvement patterns (e.g., "Your pacing has become more consistent across attempts") and persistent issues (e.g., "Filler word usage remains high—consider focusing on this in your next practice"). This memory enables the system to provide strategic guidance that builds on previous interactions, helping users understand their progress trajectory rather than treating each attempt in isolation. The system's ability to remember and analyze patterns across attempts transforms individual feedback points into a coherent learning narrative.

---

Together, these five guidelines ensure that our system provides transparent, contextually appropriate, and explainable feedback that supports users' presentation skill development while maintaining their agency and trust in the AI system.

