import random
from datetime import datetime, timedelta

from ..models import Inquiry, Prompt, Reply, ReplyItem, Workspace


def _make(db, slug, title, accent, prompts, workspace_id=None):
    inq = Inquiry(slug=slug, title=title, status="published", accent=accent, workspace_id=workspace_id)
    for i, (kind, label, hint, mand, choices) in enumerate(prompts):
        inq.prompts.append(Prompt(position=i, kind=kind, label=label, hint=hint, mandatory=mand, choices=choices))
    db.add(inq)
    db.flush()
    return inq


def _fake_replies(db, inq, n, rng):
    names = ["Aarav", "Meera", "Kabir", "Isha", "Rohan", "Sana", "Vihaan", "Tara"]
    for r in range(n):
        rep = Reply(inquiry_id=inq.id, submitted_at=datetime.utcnow() - timedelta(hours=r * 7 + 1))
        for p in inq.prompts:
            if p.kind == "short_text":
                v = rng.choice(names)
            elif p.kind == "long_text":
                v = rng.choice(["Loved the experience.", "Could be faster.", "Support was very helpful.", ""])
            elif p.kind in ("choice", "dropdown"):
                v = rng.choice(p.choices)
            elif p.kind == "email":
                v = f"{rng.choice(names).lower()}{r}@example.com"
            elif p.kind == "number":
                v = str(rng.randint(1, 10))
            elif p.kind == "yes_no":
                v = rng.choice(["yes", "no"])
            else:
                v = str(rng.randint(2, 5))
            rep.items.append(ReplyItem(prompt_id=p.id, value=v))
        db.add(rep)


def seed_if_empty(db):
    """Populate initial demo workspaces, forms, questions, and sample replies when empty."""
    if db.query(Inquiry).count():
        return

    pw = db.query(Workspace).filter_by(is_private=True).first()
    if not pw:
        pw = Workspace(name="My workspace", is_private=True, order_index=0)
        db.add(pw)
        db.flush()
    team_ws = db.query(Workspace).filter_by(name="Marketing Team").first()
    if not team_ws:
        team_ws = Workspace(name="Marketing Team", is_private=False, order_index=1)
        db.add(team_ws)
        db.flush()

    rng = random.Random(7)
    a = _make(db, "feedback1", "Customer Feedback Survey", "#0445AF", [
        ("short_text", "What's your name?", "First name is fine", True, []),
        ("email", "What's your email address?", "We'll only use it to follow up", True, []),
        ("choice", "How did you hear about us?", "", True, ["Friend", "Social media", "Search", "Other"]),
        ("rating", "How would you rate our service?", "1 is poor, 5 is excellent", True, []),
        ("yes_no", "Would you recommend us to a friend?", "", False, []),
        ("number", "How many times have you used us this year?", "", False, []),
        ("dropdown", "Which plan are you on?", "", False, ["Free", "Pro", "Team"]),
        ("long_text", "Anything else you'd like to tell us?", "Optional", False, []),
    ], workspace_id=pw.id)
    b = _make(db, "rsvp2024", "Event RSVP", "#B5179E", [
        ("short_text", "Who's coming?", "", True, []),
        ("email", "Where can we send your ticket?", "", True, []),
        ("choice", "Pick a session", "", True, ["Morning workshop", "Afternoon talk", "Evening mixer"]),
        ("yes_no", "Any dietary needs?", "", False, []),
    ], workspace_id=team_ws.id)
    draft = Inquiry(slug="draft0001", title="New form", status="draft", workspace_id=pw.id)
    page = {"key": "contact", "title": "Contact Info", "hint": ""}
    for i, (kind, label) in enumerate([
        ("short_text", "First name"),
        ("short_text", "Last name"),
        ("phone", "Phone number"),
        ("email", "Email"),
    ]):
        draft.prompts.append(Prompt(position=i, kind=kind, label=label, hint="", mandatory=False, choices=[], page=dict(page)))
    db.add(draft)
    _fake_replies(db, a, 14, rng)
    _fake_replies(db, b, 6, rng)

    db.commit()


def ensure_default_data(db, seed_demo: bool = True) -> None:
    """Ensure a primary private workspace exists and optionally seed demo forms."""
    private_workspace = db.query(Workspace).filter_by(is_private=True).first()
    if private_workspace is None:
        private_workspace = Workspace(name="My workspace", is_private=True)
        db.add(private_workspace)
        db.flush()

    db.query(Inquiry).filter(Inquiry.workspace_id.is_(None)).update(
        {Inquiry.workspace_id: private_workspace.id}, synchronize_session=False
    )
    if seed_demo:
        seed_if_empty(db)
        db.query(Inquiry).filter(Inquiry.workspace_id.is_(None)).update(
            {Inquiry.workspace_id: private_workspace.id}, synchronize_session=False
        )
    db.commit()
