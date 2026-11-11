import sys
sys.path.insert(0, r"backend\.venv\Lib\site-packages")
sys.path.insert(0, r"backend")

from app.config.database import SessionLocal
from app.models import Inquiry, Workspace, Reply, Prompt
from app.main import (
    list_workspaces, create_workspace, rename_workspace, move_workspace_up, move_workspace_down,
    get_active_workspace, set_active_workspace,
    list_inquiries, create_inquiry, get_inquiry, save_inquiry, rename, duplicate,
    publish, unpublish, public_inquiry, submit_reply,
    list_replies, export_csv, generate_test_response, remove
)
from app.schemas import (
    WorkspaceIn, ActiveWorkspaceIn, InquiryIn, PromptIn, TitleIn, ReplyIn
)
from fastapi import HTTPException

db = SessionLocal()
print("Starting Comprehensive Verification Suite...")

# 1. Test Active Workspace and Workspaces
active = get_active_workspace(db)
print("1. Active workspace:", active)
assert active.get("active_workspace_id") is not None, "Active workspace ID should exist"

workspaces = list_workspaces(db)
print("2. Workspaces count:", len(workspaces))
assert len(workspaces) >= 2, "Should have at least 2 workspaces"

# 2. Test Form Creation
new_form_payload = InquiryIn(
    title="Comprehensive E2E Test Form",
    workspace_id=workspaces[0]["id"],
    prompts=[
        PromptIn(id=-1, kind="short_text", label="Full Name", mandatory=True),
        PromptIn(id=-2, kind="email", label="Email Address", mandatory=True),
        PromptIn(id=-3, kind="number", label="Years of Experience", mandatory=False),
        PromptIn(id=-4, kind="choice", label="Role", mandatory=True, choices=["Engineer", "Designer", "PM"]),
        PromptIn(id=-5, kind="dropdown", label="Department", mandatory=False, choices=["R&D", "Marketing", "Sales"]),
        PromptIn(id=-6, kind="rating", label="Satisfaction", mandatory=True),
        PromptIn(id=-7, kind="yes_no", label="Would you recommend?", mandatory=False),
        PromptIn(id=-8, kind="long_text", label="Feedback Notes", mandatory=False)
    ]
)
created = create_inquiry(new_form_payload, db)
form_id = created["id"]
slug = created["slug"]
print(f"3. Created form ID {form_id} with slug '{slug}' and {len(created['prompts'])} questions.")
assert len(created["prompts"]) == 8, "All 8 core question types should be created"

# 3. Test Unpublish blocks public access initially (it's draft)
try:
    public_inquiry(slug, db)
    assert False, "Draft form should not be publicly accessible!"
except HTTPException as e:
    assert e.status_code == 404, f"Expected 404, got {e.status_code}"
    print("4. Verified draft form is blocked from public access (404).")

# 4. Test Publish
pub_res = publish(form_id, db)
assert pub_res["status"] == "published", "Form should be published"
pub_form = public_inquiry(slug, db)
assert pub_form["title"] == "Comprehensive E2E Test Form", "Public inquiry matches"
print("5. Form published successfully and accessible publicly.")

# 5. Test Respondent Validation (missing required email and full name)
try:
    submit_reply(slug, ReplyIn(answers={}), db)
    assert False, "Empty reply should fail validation for mandatory prompts"
except HTTPException as e:
    assert e.status_code == 422, f"Expected 422 validation failure, got {e.status_code}"
    print("6. Client/Server validation rejected empty required fields (422).")

# 6. Test Valid Submission
p_name = next(p for p in pub_form["prompts"] if p["label"] == "Full Name")
p_email = next(p for p in pub_form["prompts"] if p["label"] == "Email Address")
p_num = next(p for p in pub_form["prompts"] if p["label"] == "Years of Experience")
p_role = next(p for p in pub_form["prompts"] if p["label"] == "Role")
p_sat = next(p for p in pub_form["prompts"] if p["label"] == "Satisfaction")

valid_answers = {
    str(p_name["id"]): "Alex Tester",
    str(p_email["id"]): "alex.tester@example.com",
    str(p_num["id"]): "5",
    str(p_role["id"]): "Engineer",
    str(p_sat["id"]): "5"
}
sub_res = submit_reply(slug, ReplyIn(answers=valid_answers), db)
assert sub_res["ok"] is True, "Submission should succeed"
print("7. Valid respondent reply recorded successfully.")

# 7. Test Results & Summary
results = list_replies(form_id, db)
assert len(results["replies"]) == 1, "Should have 1 recorded reply"
print("8. Results API returned 1 reply and summary stats.")

# 8. Test CSV Export
csv_res = export_csv(form_id, db)
csv_content = csv_res.body.decode("utf-8")
assert "Alex Tester" in csv_content, "CSV export should contain submitted name"
assert "alex.tester@example.com" in csv_content, "CSV export should contain submitted email"
print("9. CSV export generated valid data containing submission.")

# 9. Test Generate Test Response
test_rep_res = generate_test_response(form_id, db)
assert test_rep_res["ok"] is True
results_updated = list_replies(form_id, db)
assert len(results_updated["replies"]) == 2, "Should have 2 replies now"
print("10. Generated test response verified (now 2 replies).")

# 10. Test Unpublish
unpub_res = unpublish(form_id, db)
assert unpub_res["status"] == "draft", "Form should be draft after unpublish"
try:
    public_inquiry(slug, db)
    assert False, "Unpublished form should not be publicly accessible!"
except HTTPException as e:
    assert e.status_code == 404, "Unpublished form returned 404"
    print("11. Unpublish flow verified (reverted to draft, public access returns 404).")

# 11. Cleanup test form
remove(form_id, db)
print("12. Cleaned up E2E test form.")

db.close()
print("ALL 12 VERIFICATION SUITE TESTS PASSED PERFECTLY!")
