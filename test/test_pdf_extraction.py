"""
Test PDF extraction functionality
"""
from pathlib import Path
import sys
import json

# Add backend to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.api_server import extract_pdf_content

# Test with an existing PDF
pdf_path = project_root / 'sessions' / 'tomer_7' / 'attempt_7' / 'Progress report.pdf'

if pdf_path.exists():
    print(f"Testing PDF extraction on: {pdf_path}")
    content = extract_pdf_content(pdf_path)
    
    print(f"\n📄 Extracted {len(content)} pages\n")
    
    # Show first 2 pages as example
    for page in content[:2]:
        print(f"Page {page['page_number']}:")
        print(f"  Content preview: {page['content'][:200]}...")
        print()
    
    # Save to test file
    output_path = project_root / 'test' / 'sample_pdf_content.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Full content saved to: {output_path}")
else:
    print(f"❌ PDF not found: {pdf_path}")
    print("Please provide a valid PDF path")
