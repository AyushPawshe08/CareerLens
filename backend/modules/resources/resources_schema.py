"""
Pydantic schemas for the resources module.

ResourceItem            — one skill's full learning resource set
ResourcesResponse       — full DB result (list of ResourceItem per career_input)
ResourcesTriggerResponse — returned immediately after POST
ResourcesStatusResponse  — returned by GET /status/{task_id}
"""

from pydantic import BaseModel
from typing import List, Optional


class ResourceItem(BaseModel):
    """Learning resources for a single missing skill."""
    skill: str
    videos: List[str]           # 2 YouTube video titles
    documentation: List[str]    # 2 official doc URLs
    practice: List[str]         # 2 hands-on practice platforms
    roadmap: Optional[str] = None  # 1 roadmap URL if available


class ResourcesResponse(BaseModel):
    """Full result returned when status == 'completed'."""
    id: str
    career_input_id: str
    user_id: int
    resources: List[ResourceItem]

    class Config:
        from_attributes = True


class ResourcesTriggerResponse(BaseModel):
    """
    Returned immediately after POST /resources/{career_input_id}.
    Client polls GET /resources/status/{task_id}.
    """
    task_id: Optional[str] = None
    status: str                        # "queued" | "completed"
    resource_record_id: Optional[str] = None  # set when already cached
    message: str = ""


class ResourcesStatusResponse(BaseModel):
    """Returned by GET /resources/status/{task_id}."""
    task_id: str
    status: str  # "queued" | "processing" | "completed" | "failed"
    result: Optional[ResourcesResponse] = None
    error: Optional[str] = None
