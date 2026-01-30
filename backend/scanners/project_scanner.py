
import logging
from typing import List, Optional
from google.cloud import resourcemanager_v3, compute_v1
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.api_core import exceptions as gcp_exceptions

from models import Project, VPCNetwork
from .base import BaseScanner

logger = logging.getLogger(__name__)

class ProjectScanner(BaseScanner):
    """Scanner for discovering projects and their basic metadata."""
    
    def __init__(self, max_workers: int = 10, credentials=None):
        super().__init__(max_workers, credentials)
        self.folders_client = resourcemanager_v3.FoldersClient(credentials=self.credentials)
        
    def list_projects_in_folder(self, folder_id: str) -> List[str]:
        """Recursively list all active project IDs in a folder."""
        project_ids = []
        try:
            # 1. List projects in this folder
            req = resourcemanager_v3.ListProjectsRequest(parent=f"folders/{folder_id}")
            for project in self.projects_client.list_projects(request=req):
                if project.state == resourcemanager_v3.Project.State.ACTIVE:
                    # Parse project ID from name "projects/123..." or get project_id field
                    # The object has .project_id (string id) and .name (numeric id path)
                    project_ids.append(project.project_id)

            # 2. List sub-folders
            req_folders = resourcemanager_v3.ListFoldersRequest(parent=f"folders/{folder_id}")
            for folder in self.folders_client.list_folders(request=req_folders):
                # Recursively scan sub-folder
                folder_id_numeric = folder.name.split("/")[-1]
                project_ids.extend(self.list_projects_in_folder(folder_id_numeric))
                
        except Exception as e:
            logger.error(f"Error scanning folder {folder_id}: {e}")
            
        return project_ids

    def list_projects_in_organization(self, org_id: str) -> List[str]:
        """Recursively list all active project IDs in an organization."""
        project_ids = []
        try:
            # 1. List projects directly under Org
            req = resourcemanager_v3.ListProjectsRequest(parent=f"organizations/{org_id}")
            for project in self.projects_client.list_projects(request=req):
                if project.state == resourcemanager_v3.Project.State.ACTIVE:
                    project_ids.append(project.project_id)
            
            # 2. List folders under Org
            req_folders = resourcemanager_v3.ListFoldersRequest(parent=f"organizations/{org_id}")
            for folder in self.folders_client.list_folders(request=req_folders):
                folder_id = folder.name.split("/")[-1]
                project_ids.extend(self.list_projects_in_folder(folder_id))
                
        except Exception as e:
             logger.error(f"Error scanning organization {org_id}: {e}")
             
        return project_ids

    def list_all_accessible_projects(self) -> List[str]:
        """List all active projects accessible to the credential."""
        project_ids = []
        try:
            # Query for all active projects
            req = resourcemanager_v3.SearchProjectsRequest(query="state:ACTIVE")
            for project in self.projects_client.search_projects(request=req):
                project_ids.append(project.project_id)
        except Exception as e:
            logger.error(f"Error searching all projects: {e}")
            
        return project_ids

    def get_project_details(self, project_id: str) -> Optional[dict]:
        """Get project display name and number."""
        try:
            request = resourcemanager_v3.GetProjectRequest(name=f"projects/{project_id}")
            project = self.projects_client.get_project(request=request)
            return {
                "display_name": project.display_name,
                "project_number": project.name.split("/")[-1],
            }
        except Exception as e:
            logger.debug(f"Could not get project info for {project_id}: {e}")
            return None

    def get_shared_vpc_info(self, project_id: str) -> dict:
        """Get Shared VPC information for a project."""
        result = {"is_host": False, "host_project": None}
        try:
            xpn_client = compute_v1.ProjectsClient(credentials=self.credentials)
            
            # Check host
            try:
                xpn_resources = xpn_client.get_xpn_host(project=project_id)
                if xpn_resources:
                    result["is_host"] = True
            except gcp_exceptions.NotFound:
                pass
            except gcp_exceptions.BadRequest:
                pass
            
            # Check service project (logic simplified from original, 
            # usually requires iterating XpnHosts or inferring from subnets)
            # Original code had a try/catch block that didn't do much 
            # because get_xpn_host checks if *this* project is a host.
            # To find the host of a service project, we typically need to check individual subnets 
            # or `get_xpn_resources` on the *host* (which we don't know).
            # We'll keep the structure for now.
             
        except Exception as e:
            logger.debug(f"Could not get Shared VPC info for {project_id}: {e}")
            
        return result
