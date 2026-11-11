import json
import uuid


def new_slug() -> str:
    """Generate a compact 8-character unique slug for forms and page keys."""
    return uuid.uuid4().hex[:8]


def prompt_out(p) -> dict:
    """Serialize a Prompt ORM object into API response shape."""
    return {
        "id": p.id,
        "position": p.position,
        "kind": p.kind,
        "label": p.label,
        "hint": p.hint or "",
        "mandatory": bool(p.mandatory),
        "choices": p.choices or [],
        "page": p.page or None,
        "properties": getattr(p, "properties", None) or {},
        "logic_rules": getattr(p, "logic_rules", None) or {},
    }


def inquiry_out(i, full: bool = True) -> dict:
    """Serialize an Inquiry ORM object into API response shape."""
    out = {
        "id": i.id,
        "slug": i.slug,
        "title": i.title,
        "status": i.status,
        "accent": i.accent,
        "theme": getattr(i, "theme", "Pearl white") or "Pearl white",
        "settings": getattr(i, "settings", None) or {},
        "workspace_id": i.workspace_id,
        "closing_heading": i.closing_heading,
        "closing_text": i.closing_text,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }
    if full:
        out["prompts"] = [prompt_out(p) for p in i.prompts]
    return out


def workspace_out(workspace, counts: dict) -> dict:
    """Serialize a Workspace ORM object with form counts."""
    return {
        "id": workspace.id,
        "name": workspace.name,
        "is_private": workspace.is_private,
        "order_index": getattr(workspace, "order_index", 0) or 0,
        "last_visited_at": workspace.last_visited_at.isoformat()
        if getattr(workspace, "last_visited_at", None)
        else None,
        "form_count": counts.get(workspace.id, 0),
    }


def format_reply_value(prompt, value: str) -> str:
    """Format JSON-encoded complex answers into human-readable strings."""
    if prompt.kind not in ("checkbox", "ranking", "matrix", "contact_info"):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value
    if prompt.kind in ("checkbox", "ranking") and isinstance(parsed, list):
        return ", ".join(str(item) for item in parsed)
    if prompt.kind == "matrix" and isinstance(parsed, dict):
        return "; ".join(f"{row}: {score}" for row, score in parsed.items())
    if prompt.kind == "contact_info" and isinstance(parsed, dict):
        return "; ".join(
            f"{label}: {parsed[field]}"
            for field, label in (("name", "Name"), ("email", "Email"), ("phone", "Phone"))
            if isinstance(parsed.get(field), str) and parsed[field].strip()
        )
    return value


def reply_rows(inq) -> list:
    """Return formatted reply rows sorted newest first."""
    prompts = {p.id: p for p in inq.prompts}
    return [
        {
            "id": r.id,
            "submitted_at": r.submitted_at.isoformat(),
            "answers": {
                str(it.prompt_id): format_reply_value(prompts[it.prompt_id], it.value)
                if it.prompt_id in prompts
                else it.value
                for it in r.items
            },
        }
        for r in sorted(inq.replies, key=lambda r: r.submitted_at, reverse=True)
    ]


def summarize(inq) -> list:
    """Compute per-question response counts and numeric averages."""
    out = []
    for p in inq.prompts:
        vals = [it.value for r in inq.replies for it in r.items if it.prompt_id == p.id and (it.value or "").strip()]
        s = {"prompt_id": p.id, "label": p.label, "kind": p.kind, "answered": len(vals)}
        if p.kind in ("choice", "dropdown"):
            s["counts"] = {c: vals.count(c) for c in p.choices}
        elif p.kind == "checkbox":
            selections = []
            for value in vals:
                try:
                    parsed = json.loads(value)
                except (TypeError, json.JSONDecodeError):
                    continue
                if isinstance(parsed, list):
                    selections.extend(option for option in parsed if isinstance(option, str))
            s["counts"] = {c: selections.count(c) for c in p.choices}
        elif p.kind == "yes_no":
            s["counts"] = {"yes": vals.count("yes"), "no": vals.count("no")}
        elif p.kind in ("rating", "nps", "opinion_scale"):
            low, high = (0, 10) if p.kind == "nps" else (1, 10) if p.kind == "opinion_scale" else (1, 5)
            numbers = [int(value) for value in vals if value.isdigit() and low <= int(value) <= high]
            s["counts"] = {str(n): numbers.count(n) for n in range(low, high + 1)}
            s["average"] = round(sum(numbers) / len(numbers), 2) if numbers else None
        elif p.kind == "number":
            nums = [float(v) for v in vals]
            s["average"] = round(sum(nums) / len(nums), 2) if nums else None
        out.append(s)
    return out
