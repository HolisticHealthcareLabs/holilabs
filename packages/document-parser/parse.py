#!/usr/bin/env python3
"""
CDSS V3 - Sandboxed Document Parser

This script runs inside an isolated Docker container with NO network access.
It parses PDF documents and extracts structured content.

Security constraints:
- No network access (--network none)
- Read-only filesystem (except /tmp and job directory)
- Memory and CPU limits enforced by Docker
- Container destroyed after each job

Usage:
    python parse.py /job/input.pdf /job/output.json

Output format:
{
    "success": true,
    "pageCount": 5,
    "text": "extracted text...",
    "tables": [...],
    "metadata": {...},
    "sections": [...],
    "warnings": []
}
"""

import sys
import json
import hashlib
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

# PyMuPDF for PDF parsing
import fitz  # PyMuPDF


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content for deduplication."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def extract_tables(page: fitz.Page) -> list[list[list[str]]]:
    """Extract tables from a PDF page."""
    tables = []
    try:
        # PyMuPDF 1.24+ has find_tables()
        table_finder = page.find_tables()
        for table in table_finder:
            extracted = table.extract()
            if extracted:
                tables.append(extracted)
    except Exception:
        # Older PyMuPDF or no tables found
        pass
    return tables


def detect_sections(text: str) -> list[dict[str, Any]]:
    """
    Detect common clinical document sections.
    Returns list of {name, startIndex, endIndex} objects.
    """
    sections = []

    # Common clinical section headers
    section_patterns = [
        "CHIEF COMPLAINT",
        "HISTORY OF PRESENT ILLNESS",
        "HPI",
        "PAST MEDICAL HISTORY",
        "PMH",
        "MEDICATIONS",
        "ALLERGIES",
        "SOCIAL HISTORY",
        "FAMILY HISTORY",
        "REVIEW OF SYSTEMS",
        "ROS",
        "PHYSICAL EXAMINATION",
        "PHYSICAL EXAM",
        "VITAL SIGNS",
        "VITALS",
        "ASSESSMENT",
        "PLAN",
        "ASSESSMENT AND PLAN",
        "A/P",
        "LABS",
        "LABORATORY",
        "IMAGING",
        "RADIOLOGY",
        "DIAGNOSIS",
        "DIAGNOSES",
        "IMPRESSION",
        "RECOMMENDATIONS",
        "FOLLOW UP",
        "FOLLOW-UP",
        "DISCHARGE SUMMARY",
        "OPERATIVE REPORT",
        "PROCEDURE NOTE",
    ]

    text_upper = text.upper()

    for pattern in section_patterns:
        # Look for pattern at start of line or after newline
        search_patterns = [f"\n{pattern}:", f"\n{pattern}\n", f"\n{pattern} "]

        for search in search_patterns:
            idx = text_upper.find(search)
            if idx != -1:
                sections.append({
                    "name": pattern,
                    "startIndex": idx + 1,  # Skip the newline
                    "detected": True,
                })
                break

    # Sort by position
    sections.sort(key=lambda x: x["startIndex"])

    # Add endIndex based on next section
    for i, section in enumerate(sections):
        if i + 1 < len(sections):
            section["endIndex"] = sections[i + 1]["startIndex"]
        else:
            section["endIndex"] = len(text)

    return sections


def parse_pdf(input_path: str) -> dict[str, Any]:
    """
    Parse a PDF file and extract structured content.

    Returns a dictionary with:
    - success: bool
    - pageCount: int
    - text: str (full extracted text)
    - tables: list of tables (each table is list of rows)
    - metadata: dict (PDF metadata)
    - sections: list of detected sections
    - contentHash: str (SHA-256 of text content)
    - warnings: list of warning messages
    """
    result = {
        "success": False,
        "pageCount": 0,
        "text": "",
        "tables": [],
        "metadata": {},
        "sections": [],
        "contentHash": "",
        "warnings": [],
        "parsedAt": datetime.utcnow().isoformat() + "Z",
    }

    try:
        # Open PDF
        doc = fitz.open(input_path)
        result["pageCount"] = len(doc)

        # Extract metadata
        metadata = doc.metadata
        if metadata:
            result["metadata"] = {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "subject": metadata.get("subject", ""),
                "creator": metadata.get("creator", ""),
                "producer": metadata.get("producer", ""),
                "creationDate": metadata.get("creationDate", ""),
                "modDate": metadata.get("modDate", ""),
            }

        # Extract text and tables from each page
        all_text = []
        all_tables = []

        for page_num, page in enumerate(doc):
            # Extract text
            page_text = page.get_text()
            if page_text:
                all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")

            # Extract tables
            page_tables = extract_tables(page)
            if page_tables:
                for table in page_tables:
                    all_tables.append({
                        "page": page_num + 1,
                        "data": table,
                    })

        # Combine text
        full_text = "\n\n".join(all_text)
        result["text"] = full_text
        result["tables"] = all_tables

        # Compute content hash
        result["contentHash"] = compute_hash(full_text)

        # Detect sections
        result["sections"] = detect_sections(full_text)

        # Check for potential issues
        if len(full_text.strip()) < 100:
            result["warnings"].append("Document appears to have very little text content")

        if result["pageCount"] > 100:
            result["warnings"].append(f"Large document with {result['pageCount']} pages")

        doc.close()
        result["success"] = True

    except fitz.FileDataError as e:
        result["warnings"].append(f"PDF parsing error: {str(e)}")
        result["success"] = False
    except Exception as e:
        result["warnings"].append(f"Unexpected error: {str(e)}")
        result["success"] = False

    return result


def parse_image(input_path: str) -> dict[str, Any]:
    """
    Parse an image file.
    For now, just returns metadata. OCR can be added later.
    """
    result = {
        "success": False,
        "pageCount": 1,
        "text": "",
        "tables": [],
        "metadata": {},
        "sections": [],
        "contentHash": "",
        "warnings": ["Image OCR not implemented - returning metadata only"],
        "parsedAt": datetime.utcnow().isoformat() + "Z",
    }

    try:
        # Read file for hash
        with open(input_path, 'rb') as f:
            content = f.read()
            result["contentHash"] = hashlib.sha256(content).hexdigest()

        # Get basic metadata
        path = Path(input_path)
        result["metadata"] = {
            "filename": path.name,
            "extension": path.suffix.lower(),
            "sizeBytes": path.stat().st_size,
        }

        result["success"] = True

    except Exception as e:
        result["warnings"].append(f"Image parsing error: {str(e)}")
        result["success"] = False

    return result


def main():
    """Main entry point."""
    if len(sys.argv) != 3:
        print("Usage: python parse.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Check input file exists
    if not Path(input_path).exists():
        error_result = {
            "success": False,
            "error": f"Input file not found: {input_path}",
            "parsedAt": datetime.utcnow().isoformat() + "Z",
        }
        with open(output_path, 'w') as f:
            json.dump(error_result, f, indent=2)
        sys.exit(1)

    # Determine file type and parse
    input_lower = input_path.lower()

    try:
        if input_lower.endswith('.pdf'):
            result = parse_pdf(input_path)
        elif input_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif')):
            result = parse_image(input_path)
        else:
            # Try as PDF by default
            result = parse_pdf(input_path)
            if not result["success"]:
                result["warnings"].append("Unknown file type, attempted PDF parsing")

        # Write output
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        # Exit with appropriate code
        sys.exit(0 if result["success"] else 1)

    except Exception as e:
        # Catch-all for any unexpected errors
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "parsedAt": datetime.utcnow().isoformat() + "Z",
        }
        with open(output_path, 'w') as f:
            json.dump(error_result, f, indent=2)
        sys.exit(1)


if __name__ == "__main__":
    main()
