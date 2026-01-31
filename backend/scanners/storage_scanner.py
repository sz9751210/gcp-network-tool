import logging
from typing import List, Dict, Any, Optional
from google.cloud import storage
from scanners.base import BaseScanner
from models import GCSBucket

logger = logging.getLogger(__name__)

class StorageScanner(BaseScanner):
    """Scanner for Cloud Storage Buckets."""
    
    def scan_buckets(self, project_id: str) -> List[GCSBucket]:
        """Scans for all GCS buckets in a project."""
        logger.info(f"Scanning GCS buckets in project {project_id}")
        buckets = []
        
        try:
            # Note: storage.Client uses credentials from environment or provided
            # We use the same credentials as other scanners
            client = storage.Client(project=project_id, credentials=self.credentials)
            
            for bucket in client.list_buckets():
                # Check for public access
                # This is a simplified check for demo purposes
                is_public = False
                try:
                    policy = bucket.get_iam_policy(requested_policy_version=3)
                    for binding in policy.bindings:
                        if "allUsers" in binding["members"] or "allAuthenticatedUsers" in binding["members"]:
                            is_public = True
                            break
                except Exception as e:
                    logger.warning(f"Could not fetch IAM policy for bucket {bucket.name}: {e}")

                buckets.append(GCSBucket(
                    name=bucket.name,
                    project_id=project_id,
                    location=bucket.location,
                    storage_class=bucket.storage_class,
                    creation_time=bucket.time_created,
                    labels=dict(bucket.labels) if bucket.labels else {},
                    is_public=is_public,
                    versioning_enabled=bucket.versioning_enabled
                ))
                    
            return buckets
            
        except Exception as e:
            logger.error(f"Error scanning GCS buckets in {project_id}: {e}")
            return []
