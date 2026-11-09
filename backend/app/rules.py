import math
import re
import json
from datetime import date
from urllib.parse import urlparse
from .schemas import KINDS

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE = re.compile(r"^[+()\d.\-\s]{7,25}$")


def _json_value(value):
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return None


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
            number = float(v)
        except ValueError:
            return "Please enter a number"
        if not math.isfinite(number):
            return "Please enter a number"
    if k == "phone" and not PHONE.fullmatch(v):
        return "Enter a valid phone number"
    if k == "url":
        try:
            parsed_url = urlparse(v)
            valid_url = parsed_url.scheme.lower() in {"http", "https"} and bool(parsed_url.hostname)
        except ValueError:
            valid_url = False
        if not valid_url or len(v) > 2048:
            return "Enter a valid website URL beginning with http:// or https://"
    if k == "date":
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            return "Enter a valid date"
        try:
            date.fromisoformat(v)
        except ValueError:
            return "Enter a valid date"
    if k == "rating" and v not in {"1", "2", "3", "4", "5"}:
        return "Pick a rating from 1 to 5"
    if k == "nps" and (not v.isdigit() or not 0 <= int(v) <= 10):
        return "Pick a score from 0 to 10"
    if k == "opinion_scale" and (not v.isdigit() or not 1 <= int(v) <= 10):
        return "Pick a score from 1 to 10"
    if k in ("choice", "dropdown") and v not in (prompt.choices or []):
        return "Pick one of the listed options"
    if k in ("checkbox", "ranking"):
        values = _json_value(v)
        if not isinstance(values, list) or not all(isinstance(item, str) for item in values):
            return "Choose valid options"
        options = prompt.choices or []
        if len(values) != len(set(values)) or any(item not in options for item in values):
            return "Choose valid options"
        if k == "checkbox" and prompt.mandatory and not values:
            return "Choose at least one option"
        if k == "ranking" and prompt.mandatory and set(values) != set(options):
            return "Rank every option"
    if k == "matrix":
        values = _json_value(v)
        if not isinstance(values, dict) or any(row not in (prompt.choices or []) for row in values):
            return "Enter a valid response for each row"
        if any(value not in {"1", "2", "3", "4", "5"} for value in values.values()):
            return "Pick a rating from 1 to 5 for each row"
        if prompt.mandatory and set(values) != set(prompt.choices or []):
            return "Answer every row"
    if k == "legal" and v != "yes":
        return "Consent is required"
    if k == "contact_info":
        values = _json_value(v)
        if not isinstance(values, dict):
            return "Enter valid contact information"
        fields = ("name", "email", "phone")
        if any(not isinstance(values.get(field, ""), str) for field in fields):
            return "Enter valid contact information"
        email, phone = values.get("email", "").strip(), values.get("phone", "").strip()
        if email and not EMAIL.fullmatch(email):
            return "That email address doesn't look right"
        if phone and not PHONE.fullmatch(phone):
            return "Enter a valid phone number"
        if prompt.mandatory and not all(values.get(field, "").strip() for field in ("name", "email", "phone")):
            return "Complete all contact fields"
    if k == "yes_no" and v not in ("yes", "no"):
        return "Answer yes or no"
    if k in ("short_text", "phone", "url", "date") and len(v) > 2048:
        return "Your answer is too long"
    if k in ("short_text", "phone", "url") and len(v) > 255:
        return "Keep it under 255 characters"
    if k in ("long_text", "address") and len(v) > 5000:
        return "Keep it under 5000 characters"
    return None


def valid_kind(k):
    return k in KINDS
