"""
SiteOps Dynamic Schedule Engine
Automatically recalculates project schedule based on:
- Labour count changes
- Material delivery delays
- Task dependencies
- Work rate calculations
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

# Standard work hours per day
WORK_HOURS_PER_DAY = 8

# Default productivity rates (units per labour per day)
DEFAULT_PRODUCTIVITY_RATES = {
    "excavation": {"unit": "cum", "rate_per_labour": 2.5},  # 2.5 cubic meters per worker per day
    "concrete": {"unit": "cum", "rate_per_labour": 1.5},
    "masonry": {"unit": "sqm", "rate_per_labour": 3.0},
    "plastering": {"unit": "sqm", "rate_per_labour": 8.0},
    "flooring": {"unit": "sqm", "rate_per_labour": 6.0},
    "painting": {"unit": "sqm", "rate_per_labour": 15.0},
    "electrical": {"unit": "points", "rate_per_labour": 4.0},
    "plumbing": {"unit": "points", "rate_per_labour": 3.0},
    "general": {"unit": "day", "rate_per_labour": 1.0},
}


class ScheduleCalculator:
    """
    Calculates and recalculates project schedules dynamically.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def calculate_task_duration(
        self,
        task: Dict,
        labour_count: int = None,
        work_quantity: float = None,
        work_type: str = None
    ) -> int:
        """
        Calculate task duration in days based on:
        - Labour count assigned
        - Work quantity (area, volume, etc.)
        - Work type (determines productivity rate)
        
        Returns: Duration in working days
        """
        # Use provided values or fall back to task values
        labour = labour_count or len(task.get("assigned_to", [])) or 1
        quantity = work_quantity or task.get("work_quantity") or task.get("work_area") or 0
        wtype = work_type or task.get("work_type") or "general"
        
        # Get productivity rate
        productivity = DEFAULT_PRODUCTIVITY_RATES.get(wtype, DEFAULT_PRODUCTIVITY_RATES["general"])
        rate_per_labour = productivity["rate_per_labour"]
        
        # If no quantity specified, use default duration from task
        if not quantity or quantity <= 0:
            # Check if task has existing duration
            start = task.get("planned_start_date")
            end = task.get("planned_end_date")
            if start and end:
                if isinstance(start, str):
                    start = datetime.fromisoformat(start.replace('Z', '+00:00'))
                if isinstance(end, str):
                    end = datetime.fromisoformat(end.replace('Z', '+00:00'))
                return max(1, (end - start).days)
            return 5  # Default 5 days if nothing specified
        
        # Calculate duration: quantity / (labour_count * rate_per_labour)
        total_daily_output = labour * rate_per_labour
        duration_days = quantity / total_daily_output if total_daily_output > 0 else 5
        
        # Minimum 1 day, round up
        return max(1, int(duration_days + 0.5))
    
    async def recalculate_task_dates(
        self,
        task_id: str,
        labour_count: int = None,
        material_delay_days: int = 0,
        new_start_date: datetime = None
    ) -> Dict:
        """
        Recalculate a task's dates based on labour changes or material delays.
        
        Args:
            task_id: Task to recalculate
            labour_count: New labour count (if changed)
            material_delay_days: Days of delay due to material issues
            new_start_date: Override start date (e.g., due to dependency)
        
        Returns: Updated task data with new dates
        """
        task = await self.db.tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            return {"error": "Task not found"}
        
        # Calculate new duration based on labour
        duration = await self.calculate_task_duration(
            task, 
            labour_count=labour_count
        )
        
        # Determine start date
        if new_start_date:
            start_date = new_start_date
        elif task.get("planned_start_date"):
            start_date = task["planned_start_date"]
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_date = datetime.utcnow()
        
        # Apply material delay
        if material_delay_days > 0:
            start_date = start_date + timedelta(days=material_delay_days)
        
        # Calculate end date
        end_date = start_date + timedelta(days=duration)
        
        # Update task
        update_data = {
            "planned_start_date": start_date,
            "planned_end_date": end_date,
            "due_date": end_date,
            "estimated_duration_days": duration,
            "updated_at": datetime.utcnow()
        }
        
        if labour_count:
            update_data["labour_count"] = labour_count
        
        await self.db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        
        # Return updated task info
        return {
            "task_id": task_id,
            "title": task.get("title"),
            "duration_days": duration,
            "planned_start_date": start_date.isoformat(),
            "planned_end_date": end_date.isoformat(),
            "labour_count": labour_count or len(task.get("assigned_to", [])),
            "material_delay_applied": material_delay_days
        }
    
    async def recalculate_milestone_dates(
        self,
        milestone_id: str,
        cascade: bool = True
    ) -> Dict:
        """
        Recalculate milestone dates based on its tasks.
        Milestone start = earliest task start
        Milestone end = latest task end
        
        Args:
            milestone_id: Milestone to recalculate
            cascade: If True, also update dependent milestones
        
        Returns: Updated milestone data
        """
        milestone = await self.db.milestones.find_one({"_id": ObjectId(milestone_id)})
        if not milestone:
            return {"error": "Milestone not found"}
        
        # Get all tasks in this milestone
        tasks = await self.db.tasks.find({
            "milestone_id": milestone_id
        }).to_list(100)
        
        if not tasks:
            return {"milestone_id": milestone_id, "message": "No tasks found"}
        
        # Find earliest start and latest end
        earliest_start = None
        latest_end = None
        
        for task in tasks:
            task_start = task.get("planned_start_date")
            task_end = task.get("planned_end_date") or task.get("due_date")
            
            if task_start:
                if isinstance(task_start, str):
                    task_start = datetime.fromisoformat(task_start.replace('Z', '+00:00'))
                if earliest_start is None or task_start < earliest_start:
                    earliest_start = task_start
            
            if task_end:
                if isinstance(task_end, str):
                    task_end = datetime.fromisoformat(task_end.replace('Z', '+00:00'))
                if latest_end is None or task_end > latest_end:
                    latest_end = task_end
        
        if not earliest_start:
            earliest_start = datetime.utcnow()
        if not latest_end:
            latest_end = earliest_start + timedelta(days=30)
        
        # Update milestone
        update_data = {
            "start_date": earliest_start,
            "target_date": latest_end,
            "updated_at": datetime.utcnow()
        }
        
        await self.db.milestones.update_one(
            {"_id": ObjectId(milestone_id)},
            {"$set": update_data}
        )
        
        result = {
            "milestone_id": milestone_id,
            "name": milestone.get("name"),
            "start_date": earliest_start.isoformat(),
            "target_date": latest_end.isoformat(),
            "task_count": len(tasks),
            "duration_days": (latest_end - earliest_start).days
        }
        
        # Cascade to dependent milestones if requested
        if cascade:
            project_id = milestone.get("project_id")
            if project_id:
                cascade_result = await self.cascade_milestone_dates(
                    project_id, 
                    milestone_id, 
                    latest_end
                )
                result["cascaded_milestones"] = cascade_result
        
        return result
    
    async def cascade_milestone_dates(
        self,
        project_id: str,
        updated_milestone_id: str,
        milestone_end_date: datetime
    ) -> List[Dict]:
        """
        Update subsequent milestones when a milestone's end date changes.
        Uses milestone order to determine sequence.
        """
        # Get the updated milestone's order
        updated_ms = await self.db.milestones.find_one({"_id": ObjectId(updated_milestone_id)})
        if not updated_ms:
            return []
        
        current_order = updated_ms.get("order", 0)
        
        # Find milestones that come after this one
        subsequent_milestones = await self.db.milestones.find({
            "project_id": project_id,
            "order": {"$gt": current_order}
        }).sort("order", 1).to_list(50)
        
        cascaded = []
        current_end = milestone_end_date
        
        for ms in subsequent_milestones:
            ms_id = str(ms["_id"])
            
            # Get tasks for this milestone to calculate duration
            tasks = await self.db.tasks.find({"milestone_id": ms_id}).to_list(100)
            
            # Calculate milestone duration from tasks
            total_duration = 0
            for task in tasks:
                task_start = task.get("planned_start_date")
                task_end = task.get("planned_end_date")
                if task_start and task_end:
                    if isinstance(task_start, str):
                        task_start = datetime.fromisoformat(task_start.replace('Z', '+00:00'))
                    if isinstance(task_end, str):
                        task_end = datetime.fromisoformat(task_end.replace('Z', '+00:00'))
                    task_duration = (task_end - task_start).days
                    total_duration = max(total_duration, task_duration)
            
            if total_duration == 0:
                total_duration = 30  # Default 30 days
            
            # New start is previous milestone's end + 1 day buffer
            new_start = current_end + timedelta(days=1)
            new_end = new_start + timedelta(days=total_duration)
            
            # Update milestone
            await self.db.milestones.update_one(
                {"_id": ObjectId(ms_id)},
                {"$set": {
                    "start_date": new_start,
                    "target_date": new_end,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Update tasks in this milestone
            await self.shift_milestone_tasks(ms_id, new_start)
            
            cascaded.append({
                "milestone_id": ms_id,
                "name": ms.get("name"),
                "new_start": new_start.isoformat(),
                "new_end": new_end.isoformat()
            })
            
            current_end = new_end
        
        return cascaded
    
    async def shift_milestone_tasks(
        self,
        milestone_id: str,
        new_milestone_start: datetime
    ):
        """
        Shift all tasks in a milestone to align with new milestone start date.
        Maintains relative task ordering.
        """
        tasks = await self.db.tasks.find({
            "milestone_id": milestone_id
        }).sort("planned_start_date", 1).to_list(100)
        
        if not tasks:
            return
        
        # Find original milestone start (earliest task start)
        original_start = None
        for task in tasks:
            task_start = task.get("planned_start_date")
            if task_start:
                if isinstance(task_start, str):
                    task_start = datetime.fromisoformat(task_start.replace('Z', '+00:00'))
                if original_start is None or task_start < original_start:
                    original_start = task_start
        
        if not original_start:
            original_start = datetime.utcnow()
        
        # Calculate shift
        shift_days = (new_milestone_start - original_start).days
        
        # Update each task
        for task in tasks:
            task_start = task.get("planned_start_date")
            task_end = task.get("planned_end_date")
            
            if task_start:
                if isinstance(task_start, str):
                    task_start = datetime.fromisoformat(task_start.replace('Z', '+00:00'))
                new_task_start = task_start + timedelta(days=shift_days)
            else:
                new_task_start = new_milestone_start
            
            if task_end:
                if isinstance(task_end, str):
                    task_end = datetime.fromisoformat(task_end.replace('Z', '+00:00'))
                new_task_end = task_end + timedelta(days=shift_days)
            else:
                new_task_end = new_task_start + timedelta(days=5)
            
            await self.db.tasks.update_one(
                {"_id": task["_id"]},
                {"$set": {
                    "planned_start_date": new_task_start,
                    "planned_end_date": new_task_end,
                    "due_date": new_task_end,
                    "updated_at": datetime.utcnow()
                }}
            )
    
    async def apply_material_delay(
        self,
        task_id: str,
        delay_days: int,
        reason: str = "Material delivery delay"
    ) -> Dict:
        """
        Apply a material delay to a task and cascade to dependent tasks/milestones.
        
        Args:
            task_id: Task affected by delay
            delay_days: Number of days to delay
            reason: Reason for delay (for logging)
        
        Returns: Summary of all affected items
        """
        task = await self.db.tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            return {"error": "Task not found"}
        
        # Recalculate this task with delay
        task_result = await self.recalculate_task_dates(
            task_id,
            material_delay_days=delay_days
        )
        
        # Log the delay
        delay_log = {
            "task_id": task_id,
            "task_title": task.get("title"),
            "project_id": task.get("project_id"),
            "milestone_id": task.get("milestone_id"),
            "delay_days": delay_days,
            "reason": reason,
            "applied_at": datetime.utcnow()
        }
        await self.db.schedule_delays.insert_one(delay_log)
        
        result = {
            "task_updated": task_result,
            "delay_logged": True,
            "cascaded_updates": []
        }
        
        # Recalculate milestone if task has one
        if task.get("milestone_id"):
            ms_result = await self.recalculate_milestone_dates(
                task["milestone_id"],
                cascade=True
            )
            result["milestone_updated"] = ms_result
            if ms_result.get("cascaded_milestones"):
                result["cascaded_updates"] = ms_result["cascaded_milestones"]
        
        return result
    
    async def recalculate_project_schedule(
        self,
        project_id: str
    ) -> Dict:
        """
        Full recalculation of entire project schedule.
        Useful after bulk changes or initial setup.
        """
        # Get project
        project = await self.db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            return {"error": "Project not found"}
        
        project_start = project.get("start_date")
        if isinstance(project_start, str):
            project_start = datetime.fromisoformat(project_start.replace('Z', '+00:00'))
        if not project_start:
            project_start = datetime.utcnow()
        
        # Get all milestones in order
        milestones = await self.db.milestones.find({
            "project_id": project_id
        }).sort("order", 1).to_list(50)
        
        results = {
            "project_id": project_id,
            "project_name": project.get("name"),
            "milestones_updated": [],
            "tasks_updated": 0,
            "new_project_end": None
        }
        
        current_start = project_start
        
        for ms in milestones:
            ms_id = str(ms["_id"])
            
            # Get tasks for this milestone
            tasks = await self.db.tasks.find({
                "milestone_id": ms_id
            }).sort("order", 1).to_list(100)
            
            # Assign sequential dates to tasks
            task_start = current_start
            latest_task_end = current_start
            
            for task in tasks:
                # Calculate duration
                duration = await self.calculate_task_duration(task)
                task_end = task_start + timedelta(days=duration)
                
                # Update task
                await self.db.tasks.update_one(
                    {"_id": task["_id"]},
                    {"$set": {
                        "planned_start_date": task_start,
                        "planned_end_date": task_end,
                        "due_date": task_end,
                        "estimated_duration_days": duration,
                        "updated_at": datetime.utcnow()
                    }}
                )
                results["tasks_updated"] += 1
                
                # Track latest end for milestone
                if task_end > latest_task_end:
                    latest_task_end = task_end
                
                # Next task starts after this one (simple sequential)
                task_start = task_end + timedelta(days=1)
            
            # Update milestone dates
            ms_end = latest_task_end
            await self.db.milestones.update_one(
                {"_id": ObjectId(ms_id)},
                {"$set": {
                    "start_date": current_start,
                    "target_date": ms_end,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            results["milestones_updated"].append({
                "milestone_id": ms_id,
                "name": ms.get("name"),
                "start_date": current_start.isoformat(),
                "target_date": ms_end.isoformat(),
                "task_count": len(tasks)
            })
            
            # Next milestone starts after this one
            current_start = ms_end + timedelta(days=1)
        
        # Update project end date
        if results["milestones_updated"]:
            project_end = datetime.fromisoformat(results["milestones_updated"][-1]["target_date"])
            await self.db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {
                    "end_date": project_end,
                    "updated_at": datetime.utcnow()
                }}
            )
            results["new_project_end"] = project_end.isoformat()
        
        return results


async def on_labour_change(db, task_id: str, new_labour_count: int):
    """
    Hook to call when labour count changes on a task.
    Recalculates dates and cascades updates.
    """
    calculator = ScheduleCalculator(db)
    return await calculator.recalculate_task_dates(
        task_id,
        labour_count=new_labour_count
    )


async def on_material_delay(db, task_id: str, delay_days: int, reason: str = ""):
    """
    Hook to call when material delivery is delayed.
    Applies delay and cascades to dependent items.
    """
    calculator = ScheduleCalculator(db)
    return await calculator.apply_material_delay(
        task_id,
        delay_days,
        reason
    )
