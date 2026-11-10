import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.main import create_form, get_public_form, submit_response, generate_test_response, move_workspace_up, move_workspace_down, create_workspace
from app.models import Form, Question, FormResponse, Answer, Inquiry, Prompt, Workspace
from app.schemas import FormCreate, SubmitResponse, AnswerSubmit, WorkspaceIn

class RelationalFormsApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

    def test_create_and_submit_relational_form(self):
        # 1. Create a form via endpoint function
        form_data = FormCreate(title="Team Survey", is_published=True)
        created = create_form(form_data, db=self.db)
        self.assertEqual(created.title, "Team Survey")
        self.assertTrue(created.is_published)
        form_id = created.id

        # Add questions
        q1 = Question(form_id=form_id, title="Your feedback", question_type="short_text", is_required=True, order=0)
        q2 = Question(form_id=form_id, title="Rating", question_type="rating", is_required=False, order=1)
        self.db.add_all([q1, q2])
        self.db.commit()

        # 2. Fetch public form via endpoint function
        pub_data = get_public_form(form_id, db=self.db)
        self.assertEqual(pub_data["form"]["id"], form_id)
        self.assertEqual(len(pub_data["questions"]), 2)
        self.assertEqual(pub_data["questions"][0]["title"], "Your feedback")
        self.assertEqual(pub_data["questions"][1]["question_type"], "rating")

        # 3. Submit response via endpoint function
        submission = SubmitResponse(answers=[
            AnswerSubmit(question_id=q1.id, value="Great experience!"),
            AnswerSubmit(question_id=q2.id, value="5"),
        ])
        result = submit_response(form_id, submission, db=self.db)
        self.assertEqual(result, {"message": "Response submitted successfully"})

        # Verify response in database
        saved_resp = self.db.query(FormResponse).filter_by(form_id=form_id).first()
        self.assertIsNotNone(saved_resp)
        self.assertEqual(len(saved_resp.answers), 2)
        self.assertEqual(saved_resp.answers[0].value, "Great experience!")
        self.assertEqual(saved_resp.answers[1].value, "5")

    def test_generate_test_response_for_inquiry(self):
        inq = Inquiry(slug="test1234", title="Demo Inquiry")
        p1 = Prompt(position=0, kind="email", label="Email")
        p2 = Prompt(position=1, kind="phone", label="Phone")
        p3 = Prompt(position=2, kind="rating", label="Rating")
        inq.prompts.extend([p1, p2, p3])
        self.db.add(inq)
        self.db.commit()

        res = generate_test_response(inq.id, db=self.db)
        self.assertTrue(res["ok"])
        self.assertEqual(res["total_replies"], 1)
        self.assertEqual(len(inq.replies), 1)
        self.assertEqual(len(inq.replies[0].items), 3)

    def test_workspace_move_up_and_down(self):
        ws1 = create_workspace(WorkspaceIn(name="Workspace A"), db=self.db)
        ws2 = create_workspace(WorkspaceIn(name="Workspace B"), db=self.db)
        self.db.commit()

        # Move ws2 up
        move_workspace_up(ws2["id"], db=self.db)
        w1 = self.db.get(Workspace, ws1["id"])
        w2 = self.db.get(Workspace, ws2["id"])
        self.assertLess(w2.order_index, w1.order_index)

        # Move ws2 down
        move_workspace_down(ws2["id"], db=self.db)
        w1 = self.db.get(Workspace, ws1["id"])
        w2 = self.db.get(Workspace, ws2["id"])
        self.assertGreater(w2.order_index, w1.order_index)

if __name__ == "__main__":
    unittest.main()
