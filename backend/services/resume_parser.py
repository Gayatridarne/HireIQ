import pdfplumber
import docx
import pytesseract
from PIL import Image
import os

def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".pdf":
            return _extract_from_pdf(file_path)
        elif ext == ".docx":
            return _extract_from_docx(file_path)
        elif ext in [".jpg", ".jpeg", ".png"]:
            return _extract_from_image(file_path)
        else:
            return ""
    except Exception as e:
        print(f"Extraction error for {file_path}: {e}")
        return ""

def _extract_from_pdf(path: str) -> str:
    texts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
    result = " ".join(texts).strip()
    if not result:
        result = _extract_from_pdf_as_image(path)
    return result

def _extract_from_pdf_as_image(path: str) -> str:
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(path)
        return " ".join(pytesseract.image_to_string(img) for img in images)
    except Exception:
        return ""

def _extract_from_docx(path: str) -> str:
    doc = docx.Document(path)
    return " ".join(para.text for para in doc.paragraphs if para.text.strip())

def _extract_from_image(path: str) -> str:
    img = Image.open(path)
    return pytesseract.image_to_string(img)

def extract_candidate_name(text: str) -> str:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    return lines[0] if lines else "Unknown"
