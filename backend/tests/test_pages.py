import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.database import Base
from app.lib.formatters import inquiry_out
from app.models import Inquiry, Prompt
from app.schemas import InquiryIn, PromptIn
from app.services.inquiry_service import apply_payload, clone_prompts


def contact_page(key="a"):
    return {"key": key, "title": "Contact Info", "hint": ""}


class PageTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def make(self):
        data = InquiryIn(title="t", prompts=[
            PromptIn(id=-1, kind="short_text", label="First name", page=contact_page()),
            PromptIn(id=-2, kind="phone", label="Phone number", page=contact_page()),
            PromptIn(id=-3, kind="short_text", label="Solo"),
        ])
        inq = Inquiry(slug="s1")
        apply_payload(inq, data)
        self.db.add(inq)
        self.db.commit()
        return inq

    def test_page_is_stored_and_returned(self):
        out = inquiry_out(self.make())["prompts"]
        self.assertEqual([p["page"] and p["page"]["key"] for p in out], ["a", "a", None])
        self.assertEqual(out[0]["page"]["title"], "Contact Info")

    def test_page_can_be_removed_on_resave(self):
        inq = self.make()
        data = InquiryIn(title="t", prompts=[
            PromptIn(id=p.id, kind=p.kind, label=p.label) for p in inq.prompts])
        apply_payload(inq, data)
        self.db.commit()
        self.assertTrue(all(p.page is None for p in inq.prompts))

    def test_clone_gives_each_page_a_fresh_shared_key(self):
        src = self.make()
        copy = Inquiry(slug="s2")
        clone_prompts(src, copy)
        self.db.add(copy)
        self.db.commit()
        keys = [p.page["key"] if p.page else None for p in copy.prompts]
        self.assertIsNone(keys[2])
        self.assertEqual(keys[0], keys[1])
        self.assertNotEqual(keys[0], "a")
        self.assertEqual([p.kind for p in copy.prompts], ["short_text", "phone", "short_text"])

    def test_page_key_is_required_and_bounded(self):
        with self.assertRaises(ValueError):
            PromptIn(kind="short_text", page={"key": ""})
        with self.assertRaises(ValueError):
            PromptIn(kind="short_text", page={"key": "x" * 41})


if __name__ == "__main__":
    unittest.main()
