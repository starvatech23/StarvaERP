"""
Notification Service for BuildTrack
Handles creating, sending, and managing notifications
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db):
        self.db = db
    
    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "general",
        priority: str = "normal",
        link: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a single notification for a user"""
        notification = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "priority": priority,
            "link": link,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "metadata": metadata or {},
            "is_read": False,
            "read_at": None,
            "created_at": datetime.utcnow()
        }
        
        result = await self.db.notifications.insert_one(notification)
        logger.info(f"Created notification {result.inserted_id} for user {user_id}")
        return str(result.inserted_id)
    
    async def create_bulk_notifications(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        notification_type: str = "general",
        priority: str = "normal",
        link: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Create notifications for multiple users"""
        notifications = []
        for user_id in user_ids:
            notifications.append({
                "user_id": user_id,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "priority": priority,
                "link": link,
                "related_entity_type": related_entity_type,
                "related_entity_id": related_entity_id,
                "metadata": metadata or {},
                "is_read": False,
                "read_at": None,
                "created_at": datetime.utcnow()
            })
        
        if notifications:
            result = await self.db.notifications.insert_many(notifications)
            logger.info(f"Created {len(result.inserted_ids)} notifications")
            return [str(id) for id in result.inserted_ids]
        return []
    
    async def get_user_notifications(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        
        cursor = self.db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
        notifications = []
        async for notif in cursor:
            notif["id"] = str(notif.pop("_id"))
            notifications.append(notif)
        return notifications
    
    async def get_notification_stats(self, user_id: str) -> Dict:
        """Get notification statistics for a user"""
        total = await self.db.notifications.count_documents({"user_id": user_id})
        unread = await self.db.notifications.count_documents({"user_id": user_id, "is_read": False})
        
        # Count by type
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$notification_type", "count": {"$sum": 1}}}
        ]
        by_type = {}
        async for result in self.db.notifications.aggregate(pipeline):
            by_type[result["_id"]] = result["count"]
        
        return {
            "total": total,
            "unread": unread,
            "by_type": by_type
        }
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        result = await self.db.notifications.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await self.db.notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        result = await self.db.notifications.delete_one(
            {"_id": ObjectId(notification_id), "user_id": user_id}
        )
        return result.deleted_count > 0
    
    async def delete_old_notifications(self, days: int = 30) -> int:
        """Delete notifications older than specified days"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await self.db.notifications.delete_many({"created_at": {"$lt": cutoff}})
        logger.info(f"Deleted {result.deleted_count} old notifications")
        return result.deleted_count

    # ============= Activity-based Notification Helpers =============
    
    async def notify_task_assigned(
        self,
        assignee_id: str,
        task_title: str,
        task_id: str,
        project_name: str,
        assigner_name: str
    ):
        """Notify user when a task is assigned to them"""
        await self.create_notification(
            user_id=assignee_id,
            title="New Task Assigned",
            message=f"'{task_title}' has been assigned to you by {assigner_name} in project {project_name}",
            notification_type="task_assigned",
            priority="normal",
            link=f"/tasks/{task_id}",
            related_entity_type="task",
            related_entity_id=task_id
        )
    
    async def notify_task_due(self, assignee_id: str, task_title: str, task_id: str, due_date: datetime):
        """Notify user about upcoming task due date"""
        await self.create_notification(
            user_id=assignee_id,
            title="Task Due Soon",
            message=f"Task '{task_title}' is due on {due_date.strftime('%b %d, %Y')}",
            notification_type="task_due",
            priority="high",
            link=f"/tasks/{task_id}",
            related_entity_type="task",
            related_entity_id=task_id
        )
    
    async def notify_material_added(
        self,
        manager_ids: List[str],
        material_type: str,
        quantity: float,
        project_name: str,
        added_by_name: str,
        material_id: str
    ):
        """Notify managers when material is added to site"""
        await self.create_bulk_notifications(
            user_ids=manager_ids,
            title="New Site Material Added",
            message=f"{added_by_name} added {quantity} {material_type} at {project_name}. Review required.",
            notification_type="material_added",
            priority="normal",
            link=f"/materials/site/{material_id}",
            related_entity_type="site_material",
            related_entity_id=material_id
        )
    
    async def notify_material_reviewed(
        self,
        engineer_id: str,
        material_type: str,
        status: str,
        reviewer_name: str,
        material_id: str
    ):
        """Notify engineer when their material entry is reviewed"""
        is_approved = status == "approved"
        await self.create_notification(
            user_id=engineer_id,
            title=f"Material Entry {'Approved' if is_approved else 'Rejected'}",
            message=f"Your {material_type} entry has been {'approved' if is_approved else 'rejected'} by {reviewer_name}",
            notification_type="material_approved" if is_approved else "material_rejected",
            priority="normal",
            link=f"/materials/site/{material_id}",
            related_entity_type="site_material",
            related_entity_id=material_id
        )
    
    async def notify_weekly_material_review(self, user_ids: List[str], pending_count: int):
        """Send weekly material review reminder"""
        await self.create_bulk_notifications(
            user_ids=user_ids,
            title="Weekly Material Review Reminder",
            message=f"There are {pending_count} site materials pending review. Please review them before the week ends.",
            notification_type="weekly_material_review",
            priority="high",
            link="/materials/site?status=pending_review"
        )
    
    async def notify_expense_status(
        self,
        user_id: str,
        expense_description: str,
        amount: float,
        status: str,
        reviewer_name: str,
        expense_id: str
    ):
        """Notify user about expense approval/rejection"""
        is_approved = status == "approved"
        await self.create_notification(
            user_id=user_id,
            title=f"Expense {'Approved' if is_approved else 'Rejected'}",
            message=f"Your expense '{expense_description}' for ₹{amount:,.2f} has been {'approved' if is_approved else 'rejected'} by {reviewer_name}",
            notification_type="expense_approved" if is_approved else "expense_rejected",
            priority="normal",
            link=f"/finance/expenses/{expense_id}",
            related_entity_type="expense",
            related_entity_id=expense_id
        )
    
    async def notify_project_update(
        self,
        team_member_ids: List[str],
        project_name: str,
        update_message: str,
        project_id: str
    ):
        """Notify team members about project updates"""
        await self.create_bulk_notifications(
            user_ids=team_member_ids,
            title=f"Project Update: {project_name}",
            message=update_message,
            notification_type="project_update",
            priority="normal",
            link=f"/projects/{project_id}",
            related_entity_type="project",
            related_entity_id=project_id
        )


# Scheduled job functions
async def run_weekly_material_review_notification(db):
    """
    Run every Saturday at 4 PM IST
    Send notifications to project engineers and operations team
    """
    notification_service = NotificationService(db)
    
    # Get pending materials count
    pending_count = await db.site_materials.count_documents({"status": "pending_review"})
    
    if pending_count == 0:
        logger.info("No pending materials for weekly review")
        return
    
    # Get all project engineers and operations team members (admin, project_manager)
    users_cursor = db.users.find({
        "is_active": True,
        "$or": [
            {"role": {"$in": ["engineer", "admin", "project_manager"]}},
            {"role_id": {"$exists": True}}  # Include users with dynamic roles
        ]
    })
    
    user_ids = []
    async for user in users_cursor:
        # Check if user should receive this notification
        role = user.get("role", "")
        if role in ["engineer", "admin", "project_manager"]:
            user_ids.append(str(user["_id"]))
    
    if user_ids:
        await notification_service.notify_weekly_material_review(user_ids, pending_count)
        logger.info(f"Sent weekly material review notification to {len(user_ids)} users")
    
    # Update scheduled job last run time
    await db.scheduled_jobs.update_one(
        {"job_name": "weekly_material_review"},
        {
            "$set": {
                "last_run": datetime.utcnow(),
                "next_run": datetime.utcnow() + timedelta(days=7)
            }
        },
        upsert=True
    )


async def run_task_due_notifications(db):
    """
    Run daily to send task due date reminders
    Notify users about tasks due in the next 24 hours
    """
    notification_service = NotificationService(db)
    
    tomorrow = datetime.utcnow() + timedelta(days=1)
    today = datetime.utcnow()
    
    # Find tasks due within 24 hours that haven't been notified
    tasks_cursor = db.tasks.find({
        "status": {"$in": ["pending", "in_progress"]},
        "due_date": {"$gte": today, "$lte": tomorrow},
        "due_notification_sent": {"$ne": True}
    })
    
    async for task in tasks_cursor:
        if task.get("assigned_to"):
            for assignee_id in task["assigned_to"]:
                await notification_service.notify_task_due(
                    assignee_id=assignee_id,
                    task_title=task.get("title", "Untitled Task"),
                    task_id=str(task["_id"]),
                    due_date=task["due_date"]
                )
        
        # Mark as notified
        await db.tasks.update_one(
            {"_id": task["_id"]},
            {"$set": {"due_notification_sent": True}}
        )
    
    logger.info("Completed task due notifications check")
