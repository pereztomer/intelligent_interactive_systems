# Intelligent Design

The intelligence of our Presentation Rehearsal Coach emerges from a **hybrid architecture** that combines algorithmic signal processing with Large Language Model (LLM) orchestration. This approach leverages the precision of computational methods for objective measurement while utilizing AI for contextual interpretation and human-readable feedback generation.

## Hybrid Architecture

The system operates in two complementary layers. The **signal processing layer** extracts objective, quantifiable metrics from audio recordings: speaking pace (words per minute), pause durations, filler word counts, pitch variations, and speech activity patterns. These algorithms provide precise measurements without interpretation. The **AI interpretation layer** (Google Gemini 2.0 Flash Experimental) then processes these metrics alongside navigation data (slide transitions, time spent per slide) and transcription text to generate contextual, actionable feedback. This hybrid approach ensures both transparency (users can verify raw metrics) and intelligence (AI provides expert-level interpretation).

## Two-Level Feedback System

The system provides intelligence at two temporal scales. **Attempt-level feedback** analyzes individual practice sessions, where the AI receives structured data including pacing metrics, transcription, audio features, pause analysis, and navigation timeline. The AI, prompted to act as an "expert presentation coach," identifies relationships between metrics (e.g., recognizing that high filler word count combined with fast pace indicates nervousness) and generates 2-3 prioritized, actionable feedback points. **Session-level analysis** aggregates feedback across multiple attempts within a practice session, enabling the AI to detect improvement trends, identify persistent issues, and provide strategic recommendations for continued practice.

## Prompt Engineering Strategy

The system's intelligence is orchestrated through carefully designed prompts that structure multi-modal data into coherent narratives. The prompt engineering strategy employs three key techniques: (1) **role-based prompting**—instructing the AI to act as an expert presentation coach shapes both tone and focus; (2) **structured data formatting**—transforming raw metrics into organized prompts enables the AI to understand full context and correlate different data types; and (3) **constrained output generation**—enforcing 2-3 main points maximum with one sentence per point ensures concise, focused feedback. This approach transforms technical measurements into educational coaching insights, demonstrating how algorithmic precision and AI contextual understanding combine to create intelligent system behavior.

