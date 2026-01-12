"""
Test the new feedback format with PDF content
"""
from pathlib import Path
import sys

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.analysis.gemini_feedback import generate_presentation_feedback

# Test with an existing attempt that has PDF content
analysis_path = project_root / 'sessions' / 'tomer_7' / 'attempt_7' / 'analysis.json'
nav_path = project_root / 'sessions' / 'tomer_7' / 'attempt_7' / 'navigation.json'
pdf_content_path = project_root / 'sessions' / 'tomer_7' / 'attempt_7' / 'pdf_content.json'

if not pdf_content_path.exists():
    print(f"⚠️  PDF content not found. Creating it first...")
    # You need to have a recording with PDF first
    print(f"Please make a new recording with a PDF to test the new feedback format.")
else:
    print(f"✅ Found all required files")
    print(f"   - Analysis: {analysis_path}")
    print(f"   - Navigation: {nav_path}")
    print(f"   - PDF Content: {pdf_content_path}")
    print()
    
    print("🤖 Generating feedback with new format...")
    print("=" * 80)
    
    feedback = generate_presentation_feedback(
        str(analysis_path),
        str(nav_path),
        str(pdf_content_path)
    )
    
    print(feedback)
    print("=" * 80)
