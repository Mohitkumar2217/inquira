import re
from .schemas import KINDS

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def check_value(prompt, raw):
    """Return an error message, or None when the value is acceptable."""
    v = "" if raw is None else str(raw).strip()
    if v == "":
        return "This question is required" if prompt.mandatory else None
    k = prompt.kind
    if k == "email" and not EMAIL.match(v):
        return "That email address doesn't look right"
    if k == "number":
        try:
            float(v)
        except ValueError:
            return "Please enter a number"
    if k == "rating" and v not in {"1", "2", "3", "4", "5"}:
        return "Pick a rating from 1 to 5"
    if k in ("choice", "dropdown") and v not in (prompt.choices or []):
        return "Pick one of the listed options"
    if k == "yes_no" and v not in ("yes", "no"):
        return "Answer yes or no"
    if k == "short_text" and len(v) > 255:
        return "Keep it under 255 characters"
    if k == "long_text" and len(v) > 5000:
        return "Keep it under 5000 characters"
    return None


def valid_kind(k):
    return k in KINDS
