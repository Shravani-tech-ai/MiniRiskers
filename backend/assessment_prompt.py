import json
from pathlib import Path

PROMPT_PATH = (
    Path(__file__).resolve().parent.parent / "ai" / "prompts" / "assessment.md"
)


def build_assessment_prompt(context):
    template = PROMPT_PATH.read_text(encoding="utf-8")
    payload = json.dumps(context, indent=2, default=str)
    return template.replace("{{CONTEXT}}", payload)
