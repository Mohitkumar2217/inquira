from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    is_published: bool
