from fastapi import APIRouter

from ..controllers import inquiry_controller, response_controller

router = APIRouter(prefix="/api/inquiries", tags=["Inquiries & Results"])

router.add_api_route("", inquiry_controller.list_inquiries, methods=["GET"])
router.add_api_route("", inquiry_controller.create_inquiry, methods=["POST"], status_code=201)
router.add_api_route("/{iid}", inquiry_controller.get_inquiry, methods=["GET"])
router.add_api_route("/{iid}", inquiry_controller.save_inquiry, methods=["PUT"])
router.add_api_route("/{iid}/title", inquiry_controller.rename, methods=["PATCH"])
router.add_api_route("/{iid}", inquiry_controller.remove, methods=["DELETE"], status_code=204)
router.add_api_route("/{iid}/duplicate", inquiry_controller.duplicate, methods=["POST"], status_code=201)
router.add_api_route("/{iid}/copy-to/{workspace_id}", inquiry_controller.copy_to_workspace, methods=["POST"], status_code=201)
router.add_api_route("/{iid}/workspace", inquiry_controller.move_to_workspace, methods=["PATCH"])
router.add_api_route("/{iid}/publish", inquiry_controller.publish, methods=["POST"])
router.add_api_route("/{iid}/unpublish", inquiry_controller.unpublish, methods=["POST"])

router.add_api_route("/{iid}/replies", response_controller.list_replies, methods=["GET"])
router.add_api_route("/{iid}/export.csv", response_controller.export_csv, methods=["GET"])
router.add_api_route("/{iid}/generate-test-response", response_controller.generate_test_response, methods=["POST"], status_code=201)
