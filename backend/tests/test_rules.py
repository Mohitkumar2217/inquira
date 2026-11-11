import json
import unittest
from types import SimpleNamespace

from app.lib.validators import check_value, valid_kind
from app.schemas import KINDS


class PromptValidationTests(unittest.TestCase):
    def prompt(self, kind, mandatory=True, choices=None):
        return SimpleNamespace(kind=kind, mandatory=mandatory, choices=choices or [])

    def test_all_declared_kinds_are_accepted(self):
        self.assertEqual(len(KINDS), 19)
        for kind in KINDS:
            with self.subTest(kind=kind):
                self.assertTrue(valid_kind(kind))

    def test_core_text_and_choice_kinds(self):
        self.assertIsNone(check_value(self.prompt("short_text"), "Answer"))
        self.assertEqual(check_value(self.prompt("long_text"), ""), "This question is required")
        choice = self.prompt("choice", choices=["One", "Two"])
        dropdown = self.prompt("dropdown", choices=["One", "Two"])
        self.assertIsNone(check_value(choice, "One"))
        self.assertIsNone(check_value(dropdown, "Two"))
        self.assertEqual(check_value(choice, "Unknown"), "Pick one of the listed options")

    def test_email_and_finite_number(self):
        self.assertIsNone(check_value(self.prompt("email"), "person@example.com"))
        self.assertEqual(check_value(self.prompt("email"), "invalid"), "That email address doesn't look right")
        self.assertIsNone(check_value(self.prompt("number"), "1.25"))
        for value in ("invalid", "NaN", "Infinity"):
            with self.subTest(value=value):
                self.assertEqual(check_value(self.prompt("number"), value), "Please enter a number")

    def test_phone_url_and_date(self):
        self.assertIsNone(check_value(self.prompt("phone"), "+1 (555) 123-4567"))
        self.assertIsNone(check_value(self.prompt("url"), "https://example.com"))
        self.assertEqual(check_value(self.prompt("url"), "http://["), "Enter a valid website URL beginning with http:// or https://")
        self.assertIsNone(check_value(self.prompt("date"), "2026-11-09"))
        self.assertEqual(check_value(self.prompt("date"), "2026-02-31"), "Enter a valid date")

    def test_scales_and_yes_no(self):
        self.assertIsNone(check_value(self.prompt("yes_no"), "yes"))
        self.assertEqual(check_value(self.prompt("yes_no"), "maybe"), "Answer yes or no")
        self.assertIsNone(check_value(self.prompt("rating"), "5"))
        self.assertIsNone(check_value(self.prompt("nps"), "0"))
        self.assertIsNone(check_value(self.prompt("nps"), "10"))
        self.assertIsNone(check_value(self.prompt("opinion_scale"), "1"))
        self.assertEqual(check_value(self.prompt("opinion_scale"), "0"), "Pick a score from 1 to 10")

    def test_checkbox_validates_configured_options(self):
        prompt = self.prompt("checkbox", choices=["One", "Two"])
        self.assertIsNone(check_value(prompt, json.dumps(["One", "Two"])))
        self.assertEqual(check_value(prompt, json.dumps(["Unknown"])), "Choose valid options")
        self.assertEqual(check_value(prompt, "[]"), "Choose at least one option")

    def test_ranking_requires_a_complete_unique_order_when_required(self):
        prompt = self.prompt("ranking", choices=["One", "Two"])
        self.assertIsNone(check_value(prompt, json.dumps(["Two", "One"])))
        self.assertEqual(check_value(prompt, json.dumps(["One"])), "Rank every option")
        self.assertEqual(check_value(prompt, json.dumps(["One", "One"])), "Choose valid options")

    def test_matrix_requires_one_valid_score_per_row_when_required(self):
        prompt = self.prompt("matrix", choices=["Ease", "Speed"])
        self.assertIsNone(check_value(prompt, json.dumps({"Ease": "4", "Speed": "5"})))
        self.assertEqual(check_value(prompt, json.dumps({"Ease": "4"})), "Answer every row")
        self.assertEqual(check_value(prompt, json.dumps({"Ease": "6", "Speed": "5"})), "Pick a rating from 1 to 5 for each row")

    def test_contact_and_consent(self):
        contact = self.prompt("contact_info")
        self.assertIsNone(check_value(contact, json.dumps({
            "name": "Ada", "email": "ada@example.com", "phone": "555-123-4567",
        })))
        self.assertEqual(check_value(self.prompt("legal"), "no"), "Consent is required")
        self.assertIsNone(check_value(self.prompt("legal"), "yes"))

    def test_optional_blank_answers_remain_valid(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                self.assertIsNone(check_value(self.prompt(kind, mandatory=False), ""))


if __name__ == "__main__":
    unittest.main()
