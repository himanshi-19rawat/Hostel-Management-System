import os
import sys

# Ensure backend directory is in sys.path for reliable module resolution
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import (
    auth, users, students, rooms, fees, notices, calendar, issues,
    settings as app_settings, reports, tqm, attendance, leave_outpass, inventory, activity
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Hostel Management System - TQM Quality Goal: Q03 (Improve Usability)",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Primary API Routers (registered with /api prefix)
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(fees.router, prefix="/api")
app.include_router(notices.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(app_settings.router, prefix="/api")
app.include_router(tqm.router, prefix="/api")

# Student Attendance routes: /api/attendance, /api/attendance/mark, /api/attendance/summary, /api/attendance/{record_id}
app.include_router(attendance.router, prefix="/api")

# Leave & Outpass routes: /api/leave-outpass, /api/leave-outpass/stats, /api/leave-outpass/{request_id}, /api/leave-outpass/{request_id}/status
app.include_router(leave_outpass.router, prefix="/api")

# Mess Inventory routes: /api/mess/inventory, /api/mess/inventory/{item_id}
app.include_router(inventory.router, prefix="/api")

# Student Activity & Map routes: /api/activity/status, /api/activity/logs, /api/activity/log, /api/activity/parent-links
app.include_router(activity.router, prefix="/api")

# Direct /api/inventory routes (visible in OpenAPI/Swagger docs for convenience)
inventory_direct_router = APIRouter(prefix="/inventory", tags=["Mess Inventory"])
inventory_direct_router.add_api_route("", inventory.list_inventory, methods=["GET"], response_model=list[inventory.MessInventoryOut], summary="List Mess Inventory (Direct alias)", operation_id="list_inventory_direct")
inventory_direct_router.add_api_route("/", inventory.list_inventory, methods=["GET"], response_model=list[inventory.MessInventoryOut], include_in_schema=False)
inventory_direct_router.add_api_route("", inventory.create_inventory_item, methods=["POST"], response_model=inventory.MessInventoryOut, status_code=201, summary="Create Mess Inventory Item (Direct alias)", operation_id="create_inventory_item_direct")
inventory_direct_router.add_api_route("/", inventory.create_inventory_item, methods=["POST"], response_model=inventory.MessInventoryOut, status_code=201, include_in_schema=False)
inventory_direct_router.add_api_route("/{item_id}", inventory.update_inventory_item, methods=["PUT"], response_model=inventory.MessInventoryOut, summary="Update Mess Inventory Item (Direct alias)", operation_id="update_inventory_item_direct")
inventory_direct_router.add_api_route("/{item_id}/", inventory.update_inventory_item, methods=["PUT"], response_model=inventory.MessInventoryOut, include_in_schema=False)
inventory_direct_router.add_api_route("/{item_id}", inventory.delete_inventory_item, methods=["DELETE"], summary="Delete Mess Inventory Item (Direct alias)", operation_id="delete_inventory_item_direct")
inventory_direct_router.add_api_route("/{item_id}/", inventory.delete_inventory_item, methods=["DELETE"], include_in_schema=False)
app.include_router(inventory_direct_router, prefix="/api")

# Underscore /api/leave_outpass routes (visible in OpenAPI/Swagger docs for convenience)
leave_underscore_router = APIRouter(prefix="/leave_outpass", tags=["Leave & Outpass Requests"])
leave_underscore_router.add_api_route("", leave_outpass.list_requests, methods=["GET"], response_model=list[leave_outpass.StudentRequestOut], summary="List Requests (Underscore alias)", operation_id="list_requests_underscore")
leave_underscore_router.add_api_route("/", leave_outpass.list_requests, methods=["GET"], response_model=list[leave_outpass.StudentRequestOut], include_in_schema=False)
leave_underscore_router.add_api_route("/stats", leave_outpass.get_request_stats, methods=["GET"], summary="Get Request Stats (Underscore alias)", operation_id="get_request_stats_underscore")
leave_underscore_router.add_api_route("/stats/", leave_outpass.get_request_stats, methods=["GET"], include_in_schema=False)
leave_underscore_router.add_api_route("", leave_outpass.create_request, methods=["POST"], response_model=leave_outpass.StudentRequestOut, status_code=201, summary="Create Request (Underscore alias)", operation_id="create_request_underscore")
leave_underscore_router.add_api_route("/", leave_outpass.create_request, methods=["POST"], response_model=leave_outpass.StudentRequestOut, status_code=201, include_in_schema=False)
leave_underscore_router.add_api_route("/{request_id}/status", leave_outpass.update_request_status, methods=["PUT"], response_model=leave_outpass.StudentRequestOut, summary="Update Request Status (Underscore alias)", operation_id="update_request_status_underscore")
leave_underscore_router.add_api_route("/{request_id}/status/", leave_outpass.update_request_status, methods=["PUT"], response_model=leave_outpass.StudentRequestOut, include_in_schema=False)
leave_underscore_router.add_api_route("/{request_id}", leave_outpass.cancel_or_delete_request, methods=["DELETE"], summary="Cancel Request (Underscore alias)", operation_id="cancel_request_underscore")
leave_underscore_router.add_api_route("/{request_id}/", leave_outpass.cancel_or_delete_request, methods=["DELETE"], include_in_schema=False)
app.include_router(leave_underscore_router, prefix="/api")

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tqm_goal": settings.TQM_GOAL,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "FastAPI Hostel Backend"}
