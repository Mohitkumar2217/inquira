from fastapi import APIRouter

from ..controllers import response_controller

router = APIRouter(prefix="/api/public", tags=["Public Respondent"])

router.add_api_route("/{slug}", response_controller.public_inquiry, methods=["GET"])
router.add_api_route("/{slug}/replies", response_controller.submit_reply, methods=["POST"], status_code=201)
