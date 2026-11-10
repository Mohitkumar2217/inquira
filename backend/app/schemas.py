from typing import List, Optional
from pydantic import BaseModel, Field

KINDS = [
    "short_text", "long_text", "choice", "dropdown", "email", "number", "yes_no", "rating",
    "contact_info", "phone", "address", "url", "checkbox", "legal", "nps", "opinion_scale",
    "ranking", "matrix", "date",
]


class PageIn(BaseModel):
    key: str = Field(min_length=1, max_length=40)
    title: str = Field(default="", max_length=200)
    hint: str = Field(default="", max_length=2000)


class PromptIn(BaseModel):
    id: Optional[int] = None  # <=0 or None means "new"
    kind: str
    label: str = ""
    hint: str = ""
    mandatory: bool = False
    choices: List[str] = Field(default_factory=list)
    page: Optional[PageIn] = None
    properties: Optional[dict] = Field(default_factory=dict)
    logic_rules: Optional[dict] = Field(default_factory=dict)


class InquiryIn(BaseModel):
    title: str = "Untitled form"
    workspace_id: Optional[int] = None
    accent: str = "#0445AF"
    theme: Optional[str] = "Pearl white"
    closing_heading: str = "Thanks for completing this"
    closing_text: str = "Your answers have been recorded."
    settings: Optional[dict] = Field(default_factory=dict)
    prompts: List[PromptIn] = Field(default_factory=list)


class TitleIn(BaseModel):
    title: str


class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class WorkspaceMoveIn(BaseModel):
    workspace_id: int


class ActiveWorkspaceIn(BaseModel):
    workspace_id: int


class UserPreferencesIn(BaseModel):
    active_workspace_id: Optional[int] = None


class ReplyIn(BaseModel):
    answers: dict


class FormCreate(BaseModel):
    title: str = "Untitled form"
    is_published: bool = False
    theme: Optional[str] = "Pearl white"
    workspace_id: Optional[int] = None


class QuestionCreate(BaseModel):
    title: str = ""
    hint: str = ""
    question_type: str = "short_text"
    is_required: bool = False
    order: int = 0
    choices: List[str] = Field(default_factory=list)
    properties: Optional[dict] = Field(default_factory=dict)
    logic_rules: Optional[dict] = Field(default_factory=dict)


class AnswerSubmit(BaseModel):
    question_id: int
    value: str


class SubmitResponse(BaseModel):
    answers: List[AnswerSubmit]


class FormResponseOut(BaseModel):
    id: int
    title: str
    is_published: bool

    class Config:
        from_attributes = True

