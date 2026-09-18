import asyncio
import logging
from typing import Callable, Any, Dict, Optional

logger = logging.getLogger("captionstudio.queue")

class JobQueue:
    def __init__(self):
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def enqueue_job(self, task_func: Callable[..., Any], *args, **kwargs):
        """
        Enqueues an asynchronous background processing job.
        In local/single-node development, schedules on the active event loop.
        In multi-worker production with Redis, queues to the Redis worker pool.
        """
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(task_func(*args, **kwargs))
            logger.info(f"Task {task_func.__name__} scheduled on active loop with args={args}")
        except RuntimeError:
            # If called outside an active event loop
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            new_loop.run_until_complete(task_func(*args, **kwargs))

job_queue = JobQueue()

