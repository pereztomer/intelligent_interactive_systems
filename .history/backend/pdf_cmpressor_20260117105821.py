import os
from PyPDF2 import PdfReader, PdfWriter
from PIL import Image
import io

def compress_pdf(input_path, output_path, image_quality=50, max_image_size=(1024, 1024)):
    """
    Compress a PDF by reducing image quality and size.
    
    Parameters:
    - input_path: Path to input PDF
    - output_path: Path to save compressed PDF
    - image_quality: JPEG quality (0-100, lower = smaller file)
    - max_image_size: Maximum dimensions for images (width, height)
    """
    
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    for page_num, page in enumerate(reader.pages):
        print(f"Processing page {page_num + 1}/{len(reader.pages)}")
        
        # Get images from the page
        if '/XObject' in page['/Resources']:
            x_objects = page['/Resources']['/XObject'].get_object()
            
            for obj_name in x_objects:
                obj = x_objects[obj_name]
                
                if obj['/Subtype'] == '/Image':
                    try:
                        # Extract image data
                        if '/Filter' in obj:
                            if obj['/Filter'] == '/DCTDecode':  # JPEG
                                data = obj.get_data()
                                img = Image.open(io.BytesIO(data))
                            elif obj['/Filter'] == '/FlateDecode':  # PNG
                                # Handle PNG/raw images
                                width = obj['/Width']
                                height = obj['/Height']
                                data = obj.get_data()
                                
                                if obj.get('/ColorSpace') == '/DeviceRGB':
                                    img = Image.frombytes('RGB', (width, height), data)
                                else:
                                    continue
                            else:
                                continue
                        else:
                            continue
                        
                        # Resize if too large
                        if img.size[0] > max_image_size[0] or img.size[1] > max_image_size[1]:
                            img.thumbnail(max_image_size, Image.Resampling.LANCZOS)
                        
                        # Compress and replace
                        img_buffer = io.BytesIO()
                        if img.mode == 'RGBA':
                            img = img.convert('RGB')
                        img.save(img_buffer, format='JPEG', quality=image_quality, optimize=True)
                        
                        # Update the image in the PDF
                        obj._data = img_buffer.getvalue()
                        obj['/Filter'] = '/DCTDecode'
                        
                    except Exception as e:
                        print(f"Could not process image on page {page_num + 1}: {e}")
        
        writer.add_page(page)
    
    # Write compressed PDF
    with open(output_path, 'wb') as output_file:
        writer.write(output_file)
    
    # Print compression results
    original_size = os.path.getsize(input_path) / (1024 * 1024)  # MB
    compressed_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
    compression_ratio = (1 - compressed_size / original_size) * 100
    
    print(f"\nCompression complete!")
    print(f"Original size: {original_size:.2f} MB")
    print(f"Compressed size: {compressed_size:.2f} MB")
    print(f"Reduced by: {compression_ratio:.1f}%")


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
    input_file = r"C:\Users\perez\Desktop\Inteligent interactive systems\lectures\02-CreativityIdeadHound_2025.pdf"
    output_file = "C:\Users\perez\Desktop\Inteligent interactive systems\lectures\compressed_output.pdf"
    
    compress_pdf(
        input_file, 
        output_file, 
        image_quality=60,  # 0-100, lower = more compression
        max_image_size=(1200, 1200)  # Maximum dimensions
    )
    
    # Method 2: Using Ghostscript (better results, requires gs installed)
    # Uncomment if you have Ghostscript installed:
    # compress_pdf_ghostscript(input_file, "gs_compressed.pdf", quality='ebook')