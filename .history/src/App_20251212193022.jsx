import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1.0)
  const [showLanding, setShowLanding] = useState(true)
  const [currentView, setCurrentView] = useState('landing') // 'landing', 'viewer', 'recordings'

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageNumber(1)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error) => {
    setError(`Error loading PDF: ${error.message}`)
    setLoading(false)
  }

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.pdf')) {
      setError('Please upload a .pdf file')
      return
    }

    setLoading(true)
    setError(null)
    setFile(uploadedFile)
    setPageNumber(1)
    setShowLanding(false)
    setCurrentView('viewer')
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  const handleGetStarted = () => {
    document.getElementById('file-upload').click()
  }

  if (currentView === 'recordings') {
    return (
      <div className="App">
        <div className="recordings-page">
          <div className="recordings-header">
            <h2>My Recordings</h2>
            <button className="back-button" onClick={() => setCurrentView('landing')}>
              ← Back to Home
            </button>
          </div>
          <div className="no-recordings">
            <p>No recordings yet. Start practicing to create your first recording!</p>
          </div>
        </div>
      </div>
    )
  }

  if (showLanding || currentView === 'landing') {
    return (
      <div className="App">
        <div className="landing-page">
          <h1 className="app-title">Presentation Rehearsal Coach</h1>
          
          <div className="landing-content">
            <p className="problem-text">
              Strong presentations depend on clarity, pacing, and alignment between spoken content and slides. 
              Most people practice alone due to shyness, lack of listening audience, and receive little objective feedback. 
              While existing tools effectively analyze speech or slide mechanics individually, the market remains fragmented. 
              There is a lack of accessible, unified systems that evaluate delivery, slide usage, and content coherence in a single interface. 
              The goal is to create an AI-based coach that provides concrete, personalized insights to help users significantly improve their communication skills.
            </p>
            
            <div className="cta-section">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <button className="cta-button" onClick={handleGetStarted}>
                Get Started
              </button>
              <button 
                className="view-recordings-button-landing" 
                onClick={() => setCurrentView('recordings')}
              >
                View My Recordings
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="presentation-viewer">
        <div className="controls-top">
          <div className="navigation-controls">
            <button onClick={goToPrevPage} disabled={pageNumber <= 1}>
              ← Previous
            </button>
            <span className="page-counter">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <button onClick={goToNextPage} disabled={pageNumber >= numPages}>
              Next →
            </button>
          </div>
          <div className="zoom-controls">
            <button onClick={zoomOut} disabled={scale <= 0.5}>−</button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={scale >= 3.0}>+</button>
            <button onClick={resetZoom} className="reset-zoom">Reset</button>
          </div>
        </div>
        
        <div className="pdf-container">
          <div className="pdf-wrapper">
            {error && <p className="error">{error}</p>}
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="loading">
                  <p>Loading PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>

        {numPages && numPages > 1 && (
          <div className="page-thumbnails">
            {Array.from({ length: numPages }, (_, idx) => (
              <div
                key={idx + 1}
                className={`thumbnail ${idx + 1 === pageNumber ? 'active' : ''}`}
                onClick={() => setPageNumber(idx + 1)}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        )}

        <button 
          className="reset-button"
          onClick={() => {
            setFile(null)
            setNumPages(null)
            setPageNumber(1)
            setError(null)
            setScale(1.0)
            setShowLanding(true)
            setCurrentView('landing')
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default App
