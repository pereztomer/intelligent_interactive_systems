# LLM-as-User Evaluation: Strategies

## Strategy: Simulated Transcript Evaluation

Given that our system analyzes speech and audio patterns—which LLMs cannot directly perceive—we developed a **simulated transcript evaluation strategy** that enables LLMs to assess our design approach by working with the same data representations our system processes internally.

### Approach

We provided the LLM (Claude Sonnet 4.5) with a comprehensive evaluation package containing: (1) a realistic presentation transcript with intentional presentation issues embedded (e.g., excessive filler words, rapid pacing, awkward pauses), (2) the corresponding PDF slide content to establish context, (3) simulated metrics that our signal processing algorithms would extract (words per minute, pause durations, filler word counts, pitch variations), and (4) the actual feedback our system generated based on these metrics. This approach bypasses the audio perception limitation by working directly with the textual and numerical data that our system uses for analysis.

### Evaluation Focus

Rather than asking the LLM to evaluate low-level interface elements, we directed its attention to **design-level questions** about our system's approach. Specifically, we asked the LLM to assess: (a) whether the feedback appropriately addresses the issues present in the simulated transcript, (b) whether the metrics selected for analysis are relevant and sufficient for presentation coaching, (c) whether the hybrid architecture (signal processing + LLM interpretation) effectively transforms raw metrics into actionable insights, and (d) whether the feedback prioritization and contextual interpretation demonstrate sound design principles.

### Rationale

This strategy allows the LLM to function as a design expert reviewer who can evaluate the system's intelligence and feedback quality without needing direct access to audio. By providing the LLM with the same structured data our system processes—transcripts, metrics, and generated feedback—we enable it to assess whether our design decisions (metric selection, interpretation logic, feedback generation) produce coherent and useful results. This approach is particularly valuable for evaluating the contextual understanding capabilities of our hybrid architecture, as the LLM can determine whether relationships between metrics (e.g., fast pace + high filler words = nervousness) are appropriately identified and explained.

