import sys
sys.path.insert(0, r"backend\.venv\Lib\site-packages")
sys.path.insert(0, r"backend")

from app.database import SessionLocal
from app.main import create_inquiry, get_inquiry, save_inquiry, remove
from app.schemas import InquiryIn, PromptIn, PageIn

db = SessionLocal()

def test_builder_welcome_and_reorder():
    # 1. Create a form with welcome_screen and 2 pages of questions
    payload = InquiryIn(
        title="Test Sidebar & Drag-Drop",
        settings={
            "welcome_screen": {
                "enabled": True,
                "title": "Say hi! Recall information with @",
                "hint": "Description (optional)",
                "buttonText": "Start",
                "timeToComplete": "Takes X minutes",
                "showTimeToComplete": True
            }
        },
        closing_heading="Thanks for completing this form",
        closing_text="Your answers have been recorded.",
        prompts=[
            # Page 1: 2 questions
            PromptIn(id=-1, kind="short_text", label="First name", mandatory=False, page=PageIn(key="p1", title="Page 1", hint="")),
            PromptIn(id=-2, kind="number", label="Age", mandatory=False, page=PageIn(key="p1", title="Page 1", hint="")),
            # Page 2: 3 questions
            PromptIn(id=-3, kind="phone", label="Phone number", mandatory=False, page=PageIn(key="p2", title="Page 2", hint="")),
            PromptIn(id=-4, kind="phone", label="Work phone", mandatory=False, page=PageIn(key="p2", title="Page 2", hint="")),
            PromptIn(id=-5, kind="short_text", label="Company", mandatory=False, page=PageIn(key="p2", title="Page 2", hint="")),
        ]
    )

    created = create_inquiry(payload, db)
    inq_id = created["id"]
    assert len(created["prompts"]) == 5
    assert created["settings"]["welcome_screen"]["title"] == "Say hi! Recall information with @"
    print("1. Form created with Welcome Screen and 5 prompts across 2 pages.")

    # 2. Simulate drag and drop reordering: move company (Page 2) into Page 1
    reordered_prompts = [
        PromptIn(id=p["id"], kind=p["kind"], label=p["label"], mandatory=p["mandatory"],
                 page=PageIn(key="p1", title="Page 1", hint="") if p["id"] == created["prompts"][4]["id"] else PageIn(**p["page"]) if p.get("page") else None,
                 choices=p.get("choices", []))
        for p in created["prompts"]
    ]
    # Move the 5th prompt into index 1
    company = reordered_prompts.pop(4)
    reordered_prompts.insert(1, company)

    update_payload = InquiryIn(
        title="Test Sidebar & Drag-Drop",
        settings=created["settings"],
        closing_heading=created["closing_heading"],
        closing_text=created["closing_text"],
        prompts=reordered_prompts
    )
    saved = save_inquiry(inq_id, update_payload, db)
    assert len(saved["prompts"]) == 5

    # Verify Page 1 now has 3 questions and Page 2 has 2 questions
    p1_prompts = [p for p in saved["prompts"] if p.get("page", {}).get("key") == "p1"]
    p2_prompts = [p for p in saved["prompts"] if p.get("page", {}).get("key") == "p2"]
    assert len(p1_prompts) == 3, f"Expected 3 prompts on page 1, got {len(p1_prompts)}"
    assert len(p2_prompts) == 2, f"Expected 2 prompts on page 2, got {len(p2_prompts)}"
    print("2. Drag and drop reordering verified: 3 prompts on Page 1, 2 on Page 2.")

    # 3. Clean up
    remove(inq_id, db)
    print("3. Cleaned up test form successfully.")

if __name__ == "__main__":
    test_builder_welcome_and_reorder()
    print("ALL BUILDER & DRAG-DROP TESTS PASSED!")
