"""
Credentials Manager for GCP Network Planner
Manages multiple GCP service account credential files.
"""
import os
import json
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Credentials storage directory
CREDENTIALS_DIR = Path(__file__).parent / "credentials"
CREDENTIALS_META_FILE = CREDENTIALS_DIR / "credentials_meta.json"


class CredentialInfo(BaseModel):
    """Information about a stored credential."""
    id: str
    name: str
    filename: str
    project_id: Optional[str] = None
    client_email: Optional[str] = None
    upload_date: str
    is_active: bool = False


class CredentialsManager:
    """Manages multiple GCP credential files."""
    
    def __init__(self):
        self._ensure_dir_exists()
        self._load_meta()
    
    def _ensure_dir_exists(self):
        """Ensure credentials directory exists."""
        CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
        if not CREDENTIALS_META_FILE.exists():
            self._save_meta([])
    
    def _load_meta(self) -> List[CredentialInfo]:
        """Load credentials metadata."""
        try:
            with open(CREDENTIALS_META_FILE, 'r') as f:
                data = json.load(f)
                return [CredentialInfo(**item) for item in data]
        except Exception as e:
            logger.warning(f"Failed to load credentials meta: {e}")
            return []
    
    def _save_meta(self, credentials: List[CredentialInfo]):
        """Save credentials metadata."""
        with open(CREDENTIALS_META_FILE, 'w') as f:
            json.dump([c.model_dump() for c in credentials], f, indent=2)
    
    def list_credentials(self) -> List[CredentialInfo]:
        """List all stored credentials."""
        return self._load_meta()
    
    def get_active_credential(self) -> Optional[CredentialInfo]:
        """Get the currently active credential."""
        credentials = self._load_meta()
        for cred in credentials:
            if cred.is_active:
                return cred
        return None
    
    def get_active_credential_path(self) -> Optional[str]:
        """Get the file path of the active credential."""
        active = self.get_active_credential()
        if active:
            return str(CREDENTIALS_DIR / active.filename)
        
        # Fallback to legacy credentials.json in backend root
        legacy_path = Path(__file__).parent / "credentials.json"
        if legacy_path.exists():
            return str(legacy_path)
        
        return None
    
    def add_credential(self, content: bytes, name: str) -> CredentialInfo:
        """
        Add a new credential file.
        
        Args:
            content: Raw JSON content of the credential file
            name: Display name for the credential
            
        Returns:
            CredentialInfo for the new credential
        """
        # Parse and validate JSON
        try:
            cred_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")
        
        # Validate it looks like a GCP service account key
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing = [f for f in required_fields if f not in cred_data]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        if cred_data.get('type') != 'service_account':
            raise ValueError("Credential must be a service account key")
        
        # Generate unique ID and filename
        cred_id = str(uuid.uuid4())[:8]
        filename = f"credential_{cred_id}.json"
        filepath = CREDENTIALS_DIR / filename
        
        # Save the file
        with open(filepath, 'wb') as f:
            f.write(content)
        
        # Create metadata
        credentials = self._load_meta()
        
        # If this is the first credential, make it active
        is_first = len(credentials) == 0
        
        new_cred = CredentialInfo(
            id=cred_id,
            name=name,
            filename=filename,
            project_id=cred_data.get('project_id'),
            client_email=cred_data.get('client_email'),
            upload_date=datetime.now().isoformat(),
            is_active=is_first
        )
        
        credentials.append(new_cred)
        self._save_meta(credentials)
        
        logger.info(f"Added credential: {name} ({cred_id})")
        return new_cred
    
    def activate_credential(self, cred_id: str) -> CredentialInfo:
        """
        Set a credential as the active one.
        
        Args:
            cred_id: ID of the credential to activate
            
        Returns:
            Updated CredentialInfo
        """
        credentials = self._load_meta()
        target = None
        
        for cred in credentials:
            if cred.id == cred_id:
                cred.is_active = True
                target = cred
            else:
                cred.is_active = False
        
        if target is None:
            raise ValueError(f"Credential not found: {cred_id}")
        
        self._save_meta(credentials)
        logger.info(f"Activated credential: {target.name} ({cred_id})")
        return target
    
    def delete_credential(self, cred_id: str) -> bool:
        """
        Delete a credential.
        
        Args:
            cred_id: ID of the credential to delete
            
        Returns:
            True if deleted successfully
        """
        credentials = self._load_meta()
        target = None
        
        for cred in credentials:
            if cred.id == cred_id:
                target = cred
                break
        
        if target is None:
            raise ValueError(f"Credential not found: {cred_id}")
        
        if target.is_active:
            raise ValueError("Cannot delete the active credential. Activate another credential first.")
        
        # Delete the file
        filepath = CREDENTIALS_DIR / target.filename
        if filepath.exists():
            filepath.unlink()
        
        # Update metadata
        credentials = [c for c in credentials if c.id != cred_id]
        self._save_meta(credentials)
        
        logger.info(f"Deleted credential: {target.name} ({cred_id})")
        return True
    
    def update_credential_name(self, cred_id: str, new_name: str) -> CredentialInfo:
        """
        Update the display name of a credential.
        
        Args:
            cred_id: ID of the credential
            new_name: New display name
            
        Returns:
            Updated CredentialInfo
        """
        credentials = self._load_meta()
        target = None
        
        for cred in credentials:
            if cred.id == cred_id:
                cred.name = new_name
                target = cred
                break
        
        if target is None:
            raise ValueError(f"Credential not found: {cred_id}")
        
        self._save_meta(credentials)
        return target


# Global instance
credentials_manager = CredentialsManager()
