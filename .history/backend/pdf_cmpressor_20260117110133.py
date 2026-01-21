import os
from PyPDF2 import PdfReader, PdfWriter
from PIL import Image
import io

def compress_pdf(input_path, output_path):
    """
    Remove all images from a PDF to reduce file size.
    
    Parameters:
    - input_path: Path to input PDF
    - output_path: Path to save PDF without images
    """
    
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    total_images_removed = 0
    
    for page_num, page in enumerate(reader.pages):
        print(f"Processing page {page_num + 1}/{len(reader.pages)}")
        images_on_page = 0
        
        # Get images from the page
        if '/XObject' in page['/Resources']:
            x_objects = page['/Resources']['/XObject'].get_object()
            
            # Collect image object names to remove
            images_to_remove = []
            
            for obj_name in x_objects:
                obj = x_objects[obj_name]
                
                if obj['/Subtype'] == '/Image':
                    images_to_remove.append(obj_name)
                    images_on_page += 1
            
            # Remove images from XObject dictionary
            for obj_name in images_to_remove:
                try:
                    del x_objects[obj_name]
                    total_images_removed += 1
                except Exception as e:
                    print(f"Could not remove image on page {page_num + 1}: {e}")
            
            if images_on_page > 0:
                print(f"  Removed {images_on_page} image(s) from page {page_num + 1}")
        
        writer.add_page(page)
    
    # Write PDF without images
    with open(output_path, 'wb') as output_file:
        writer.write(output_file)
    
    # Print results
    original_size = os.path.getsize(input_path) / (1024 * 1024)  # MB
    new_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
    size_reduction = (1 - new_size / original_size) * 100
    
    print(f"\nImage removal complete!")
    print(f"Total images removed: {total_images_removed}")
    print(f"Original size: {original_size:.2f} MB")
    print(f"New size: {new_size:.2f} MB")
    print(f"Reduced by: {size_reduction:.1f}%")


# Alternative using Ghostscript (better quality/compression)
def compress_pdf_ghostscript(input_path, output_path, quality='ebook'):
    """
    Compress PDF using Ghostscript (requires gs installation)
    
    quality options:
    - 'screen': lowest quality, smallest size (72 dpi)
    - 'ebook': medium quality (150 dpi) - recommended
    - 'printer': high quality (300 dpi)
    - 'prepress': highest quality (300 dpi, color preservation)
    """
    import subprocess
    
    quality_settings = {
        'screen': '/screen',
        'ebook': '/ebook',
        'printer': '/printer',
        'prepress': '/prepress'
    }
    
    cmd = [
        'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        f'-dPDFSETTINGS={quality_settings[quality]}',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        f'-sOutputFile={output_path}',
        input_path
    ]
    
    subprocess.run(cmd, check=True)
    
    # Print results
    original_size = os.path.getsize(input_path) / (1024 * 1024)
    compressed_size = os.path.getsize(output_path) / (1024 * 1024)
    compression_ratio = (1 - compressed_size / original_size) * 100
    
    print(f"\nCompression complete!")
    print(f"Original size: {original_size:.2f} MB")
    print(f"Compressed size: {compressed_size:.2f} MB")
    print(f"Reduced by: {compression_ratio:.1f}%")


if __name__ == "__main__":
    # Method 1: Using PyPDF2 (no external dependencies)
    input_file = r"C:\Users\perez\Desktop\Inteligent interactive systems\lectures\CreativityIdeadHound_2025.pdf"
    output_file = r"C:\Users\perez\Desktop\Inteligent interactive systems\lectures\compressed_output.pdf"
    
    compress_pdf(
        input_file, 
        output_file
    )
    
    # Method 2: Using Ghostscript (better results, requires gs installed)
    # Uncomment if you have Ghostscript installed:
    # compress_pdf_ghostscript(input_file, "gs_compressed.pdf", quality='ebook')