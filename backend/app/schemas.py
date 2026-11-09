from typing import List, Optional
from pydantic import BaseModel, Field

KINDS = ["short_text", "long_text", "choice", "dropdown", "email", "number", "yes_no", "rating"]


class PromptIn(BaseModel):
    id: Optional[int] = None  # <=0 or None means "new"
    kind: str
    label: str = ""
    hint: str = ""
    mandatory: bool = False
    choices: List[str] = Field(default_factory=list)


class InquiryIn(BaseModel):
    title: str = "Untitled form"
    accent: str = "#0445AF"
    closing_heading: str = "Thanks for completing this"
    closing_text: str = "Your answers have been recorded."
    prompts: List[PromptIn] = Field(default_factory=list)


class TitleIn(BaseModel):
    title: str


class ReplyIn(BaseModel):
    answers: dict
