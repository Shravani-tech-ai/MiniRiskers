"""Render the sample BRD as a downloadable PDF template for the intake panel.

Source:  brds/sample-brd-digital-remittance.txt
Output:  frontend/public/sample-brd-template.pdf

The "Label: value" lines are kept on single lines in the PDF so a filled-in
copy uploads and extracts the same way as the text version.

Run:  python scripts/generate_sample_brd_pdf.py
"""

import re
from html import escape
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "brds" / "sample-brd-digital-remittance.txt"
OUTPUT = ROOT / "frontend" / "public" / "sample-brd-template.pdf"

SECTION_RE = re.compile(r"^\d+\.\s+\S")
FIELD_RE = re.compile(r"^([A-Z][A-Za-z0-9 /()\-]+):\s*(.*)$")


def parse_sections(text):
    """[(heading, [(label | None, value)])] — continuation lines join the previous entry."""
    sections = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("BUSINESS REQUIREMENTS DOCUMENT"):
            continue
        if SECTION_RE.match(line):
            sections.append((line, []))
            continue
        if not sections:
            continue
        entries = sections[-1][1]
        match = FIELD_RE.match(line)
        if match:
            entries.append((match.group(1), match.group(2)))
        elif entries:
            label, value = entries[-1]
            entries[-1] = (label, f"{value} {line}".strip())
        else:
            entries.append((None, line))
    return sections


def build_html(sections):
    parts = [
        "<h1>Business Requirements Document (BRD)</h1>",
        "<p class='guide'><b>Sample format.</b> Replace the example values "
        "below with your change's details and keep each "
        "<i>Label: value</i> pair on one line. Answer Yes/No flags with "
        "Yes or No, and enter amounts and volumes as plain numbers. Upload the "
        "completed file (PDF, DOCX or TXT) and use <i>Extract fields</i> to "
        "pre-fill the intake form.</p>",
    ]
    for heading, entries in sections:
        parts.append(f"<h2>{escape(heading)}</h2>")
        for label, value in entries:
            if label is None:
                parts.append(f"<p>{escape(value)}</p>")
            else:
                parts.append(
                    f"<p class='field'><b>{escape(label)}:</b> {escape(value)}</p>"
                )
    return "".join(parts)


CSS = """
    body { font-family: sans-serif; font-size: 10pt; color: #1e293b; }
    h1 { font-size: 17pt; color: #312e81; margin-bottom: 6pt; }
    h2 { font-size: 12pt; color: #312e81; margin-top: 14pt; margin-bottom: 4pt;
         border-bottom: 1px solid #c7d2fe; padding-bottom: 2pt; }
    p { line-height: 1.45; margin-top: 2pt; margin-bottom: 2pt; }
    .guide { background-color: #eef2ff; border: 1px solid #c7d2fe;
             padding: 6pt; font-size: 9pt; color: #334155; }
"""


def render_pdf(html, output):
    story = pymupdf.Story(html=html, user_css=CSS)
    writer = pymupdf.DocumentWriter(str(output))
    page_rect = pymupdf.paper_rect("a4")
    content_rect = page_rect + (54, 54, -54, -54)

    more = True
    while more:
        device = writer.begin_page(page_rect)
        more, _ = story.place(content_rect)
        story.draw(device)
        writer.end_page()
    writer.close()


def main():
    sections = parse_sections(SOURCE.read_text(encoding="utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    render_pdf(build_html(sections), OUTPUT)

    with pymupdf.open(OUTPUT) as document:
        document.set_metadata({
            "title": "MiniRiskers - Sample BRD format",
            "subject": "Business Requirements Document template for FCRM intake",
        })
        document.saveIncr()
        print(f"Wrote {OUTPUT} ({document.page_count} pages)")


if __name__ == "__main__":
    main()
