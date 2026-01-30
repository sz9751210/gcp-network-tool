import logging
from concurrent.futures import ThreadPoolExecutor
from google.cloud import resourcemanager_v3, compute_v1

from credentials_manager import credentials_manager

logger = logging.getLogger(__name__)

class BaseScanner:
    """Base class for all GCP resource scanners."""
    
    def __init__(self, max_workers: int = 10, credentials=None):
        self.max_workers = max_workers
        self.credentials = credentials
        
        # Determine credentials if not provided
        if not self.credentials:
            cred_path = credentials_manager.get_active_credential_path()
            if cred_path:
                import os
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cred_path
        
        # Common managers/clients can be initialized lazily or here
        # For now we'll init ProjectsClient as it's commonly used for auth check
        self.projects_client = resourcemanager_v3.ProjectsClient(credentials=self.credentials)
