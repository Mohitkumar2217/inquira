import random
from datetime import datetime, timedelta
from .models import Inquiry, Prompt, Reply, ReplyItem, Form, Question, FormResponse, Answer


def _make(db, slug, title, accent, prompts):
    inq = Inquiry(slug=slug, title=title, status="published", accent=accent)
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
    if db.query(Inquiry).count():
        return
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
    ])
    b = _make(db, "rsvp2024", "Event RSVP", "#B5179E", [
        ("short_text", "Who's coming?", "", True, []),
        ("email", "Where can we send your ticket?", "", True, []),
        ("choice", "Pick a session", "", True, ["Morning workshop", "Afternoon talk", "Evening mixer"]),
        ("yes_no", "Any dietary needs?", "", False, []),
    ])
    draft = Inquiry(slug="draft0001", title="New form", status="draft")
    page = {"key": "contact", "title": "Contact Info", "hint": ""}
    for i, (kind, label) in enumerate([("short_text", "First name"), ("short_text", "Last name"),
                                       ("phone", "Phone number"), ("email", "Email")]):
        draft.prompts.append(Prompt(position=i, kind=kind, label=label, hint="", mandatory=False, choices=[], page=dict(page)))
    db.add(draft)
    _fake_replies(db, a, 14, rng)
    _fake_replies(db, b, 6, rng)

    if not db.query(Form).count():
        f1 = Form(title="Product Feedback Form", is_published=True)
        q1 = Question(title="What is your full name?", question_type="short_text", is_required=True, order=0)
        q2 = Question(title="What is your email address?", question_type="email", is_required=True, order=1)
        q3 = Question(title="How satisfied are you with our product?", question_type="rating", is_required=False, order=2)
        q4 = Question(title="Would you recommend us to a colleague?", question_type="yes_no", is_required=False, order=3)
        f1.questions.extend([q1, q2, q3, q4])
        db.add(f1)
        db.flush()

        # Seed responses
        r1 = FormResponse(form_id=f1.id)
        r1.answers.append(Answer(question_id=q1.id, value="Alex Morgan"))
        r1.answers.append(Answer(question_id=q2.id, value="alex@example.com"))
        r1.answers.append(Answer(question_id=q3.id, value="5"))
        r1.answers.append(Answer(question_id=q4.id, value="yes"))
        db.add(r1)

    db.commit()
