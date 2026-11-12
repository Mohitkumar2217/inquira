import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.database import Base
from app.controllers.response_controller import generate_test_response
from app.controllers.workspace_controller import create_workspace, move_workspace_down, move_workspace_up
from app.models import Inquiry, Prompt, Workspace
from app.schemas import WorkspaceIn

class InquiryAndWorkspaceApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

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
