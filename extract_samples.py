#!/usr/bin/env python3
"""Extrae texto de los PDFs en Samples/ y guarda .txt para análisis."""
from pathlib import Path
from pypdf import PdfReader

SAMPLES_DIR = Path(__file__).parent / "Samples"
OUT_DIR = SAMPLES_DIR / "extracted"
OUT_DIR.mkdir(exist_ok=True)

for pdf_path in sorted(SAMPLES_DIR.glob("*.pdf")):
    name = pdf_path.stem
    out_path = OUT_DIR / f"{name}.txt"
    try:
        reader = PdfReader(str(pdf_path))
        lines = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                lines.append(f"--- Página {i + 1} ---\n{text}")
        out_path.write_text("\n\n".join(lines), encoding="utf-8")
        print(f"OK: {pdf_path.name} -> {out_path.name}")
    except Exception as e:
        print(f"Error {pdf_path.name}: {e}")
