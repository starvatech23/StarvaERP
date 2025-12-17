"""
APScheduler Configuration for BuildTrack
Handles scheduled jobs like weekly material review notifications
"""
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import pytz

logger = logging.getLogger(__name__)

# IST timezone
IST = pytz.timezone('Asia/Kolkata')

# Global scheduler instance
scheduler = AsyncIOScheduler(timezone=IST)

async def weekly_material_review_job(db):
    """
    Weekly material review notification job
    Runs every Saturday at 4:00 PM IST
    """
    from notification_service import run_weekly_material_review_notification
    logger.info("Running weekly material review notification job...")
    try:
        await run_weekly_material_review_notification(db)
        logger.info("Weekly material review notification completed successfully")
    except Exception as e:
        logger.error(f"Weekly material review notification failed: {str(e)}")


async def daily_task_due_reminder_job(db):
    """
    Daily task due date reminder job
    Runs every day at 9:00 AM IST
    """
    from notification_service import run_task_due_notifications
    logger.info("Running daily task due reminder job...")
    try:
        await run_task_due_notifications(db)
        logger.info("Daily task due reminder completed successfully")
    except Exception as e:
        logger.error(f"Daily task due reminder failed: {str(e)}")


async def cleanup_old_notifications_job(db):
    """
    Cleanup old notifications job
    Runs every Sunday at 2:00 AM IST
    """
    from notification_service import NotificationService
    logger.info("Running notification cleanup job...")
    try:
        notification_service = NotificationService(db)
        deleted_count = await notification_service.delete_old_notifications(days=30)
        logger.info(f"Notification cleanup completed: {deleted_count} notifications deleted")
    except Exception as e:
        logger.error(f"Notification cleanup failed: {str(e)}")


def setup_scheduler(db):
    """
    Set up all scheduled jobs
    """
    # Weekly Material Review - Saturday at 4:00 PM IST
    scheduler.add_job(
        weekly_material_review_job,
        CronTrigger(day_of_week='sat', hour=16, minute=0, timezone=IST),
        args=[db],
        id='weekly_material_review',
        name='Weekly Material Review Notification',
        replace_existing=True
    )
    logger.info("Scheduled: Weekly Material Review - Saturday 4:00 PM IST")
    
    # Daily Task Due Reminder - Every day at 9:00 AM IST
    scheduler.add_job(
        daily_task_due_reminder_job,
        CronTrigger(hour=9, minute=0, timezone=IST),
        args=[db],
        id='daily_task_due_reminder',
        name='Daily Task Due Reminder',
        replace_existing=True
    )
    logger.info("Scheduled: Daily Task Due Reminder - 9:00 AM IST")
    
    # Notification Cleanup - Sunday at 2:00 AM IST
    scheduler.add_job(
        cleanup_old_notifications_job,
        CronTrigger(day_of_week='sun', hour=2, minute=0, timezone=IST),
        args=[db],
        id='notification_cleanup',
        name='Old Notification Cleanup',
        replace_existing=True
    )
    logger.info("Scheduled: Notification Cleanup - Sunday 2:00 AM IST")
    
    # Start the scheduler
    scheduler.start()
    logger.info("APScheduler started successfully")


def get_scheduled_jobs():
    """
    Get list of all scheduled jobs with their next run times
    """
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger)
        })
    return jobs


def shutdown_scheduler():
    """
    Gracefully shutdown the scheduler
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shutdown completed")
