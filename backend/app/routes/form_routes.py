from fastapi import APIRouter

from ..controllers import form_controller
from ..schemas import FormResponseOut

router = APIRouter(prefix="/forms", tags=["Relational Forms API"])

router.add_api_route("/", form_controller.create_form, methods=["POST"], response_model=FormResponseOut, status_code=201)
router.add_api_route("/", form_controller.list_forms, methods=["GET"])
router.add_api_route("/{form_id}/public", form_controller.get_public_form, methods=["GET"])
router.add_api_route("/{form_id}", form_controller.get_form_by_id, methods=["GET"])
router.add_api_route("/{form_id}/questions", form_controller.update_form_questions, methods=["PUT"])
router.add_api_route("/{form_id}/submit", form_controller.submit_response, methods=["POST"])
router.add_api_route("/{form_id}/responses", form_controller.submit_response, methods=["POST"])
