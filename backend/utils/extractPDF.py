"""
Utility to extract text content from PDF files using the pypdf package.
"""

import io
from pypdf import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract all text from a PDF given its raw bytes.

    Args:
        file_bytes: Raw byte content of the PDF file.

    Returns:
        A single string containing the concatenated text of all pages.

    Raises:
        ValueError: If the file is not a valid PDF or contains no extractable text.
    """
    if not file_bytes:
        raise ValueError("PDF file is empty.")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Failed to read PDF: {exc}") from exc

    pages_text: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages_text.append(text.strip())

    full_text = "\n\n".join(pages_text).strip()

    if not full_text:
        raise ValueError(
            "No extractable text found in the PDF. "
            "The file may be image-only or password-protected."
        )

    return full_text


def extract_text_from_pdf_path(file_path: str) -> str:
    """
    Convenience wrapper — reads a PDF from disk and extracts its text.

    Args:
        file_path: Absolute or relative path to the PDF file.

    Returns:
        Extracted text string.

    Raises:
        FileNotFoundError: If the path does not exist.
        ValueError: If the PDF cannot be read or has no text.
    """
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"PDF file not found at path: {file_path}")

    return extract_text_from_pdf(file_bytes)
