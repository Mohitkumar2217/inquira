from fastapi import APIRouter

from ..controllers import workspace_controller

router = APIRouter(tags=["Workspaces & Preferences"])

router.add_api_route("/api/workspaces", workspace_controller.list_workspaces, methods=["GET"])
router.add_api_route("/api/workspaces", workspace_controller.create_workspace, methods=["POST"], status_code=201)
router.add_api_route("/api/workspaces/active", workspace_controller.get_active_workspace, methods=["GET"])
router.add_api_route("/api/workspaces/active", workspace_controller.set_active_workspace, methods=["PUT", "POST"])
router.add_api_route("/api/workspaces/{workspace_id}/move-up", workspace_controller.move_workspace_up, methods=["POST"])
router.add_api_route("/api/workspaces/{workspace_id}/move-down", workspace_controller.move_workspace_down, methods=["POST"])
router.add_api_route("/api/workspaces/{workspace_id}", workspace_controller.rename_workspace, methods=["PATCH"])
router.add_api_route("/api/workspaces/{workspace_id}/leave", workspace_controller.leave_workspace, methods=["POST"])
router.add_api_route("/api/workspaces/{workspace_id}", workspace_controller.delete_workspace, methods=["DELETE"])

router.add_api_route("/api/user/preferences", workspace_controller.get_user_preferences, methods=["GET"])
router.add_api_route("/api/user/preferences", workspace_controller.update_user_preferences, methods=["PATCH"])
