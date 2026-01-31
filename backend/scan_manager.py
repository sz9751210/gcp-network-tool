
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
import shutil

from models import NetworkTopology

logger = logging.getLogger(__name__)

class ScanManager:
    """Manages persistence of scan results to disk."""
    
    def __init__(self, storage_dir: str = "data/scans"):
        self.storage_dir = storage_dir
        self.scans_metadata: Dict[str, dict] = {}
        self.scans_cache: Dict[str, dict] = {}  # Cache for full scan data
        self.latest_completed_scan_id: Optional[str] = None
        self._ensure_storage_dir()
        
    def _ensure_storage_dir(self):
        """Ensure storage directory exists."""
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)
            
    def load_scans(self):
        """Load scan metadata from disk into memory."""
        try:
            loaded_count = 0
            for filename in os.listdir(self.storage_dir):
                if filename.endswith(".json"):
                    try:
                        filepath = os.path.join(self.storage_dir, filename)
                        # We only read a small portion or just the basics if we want truly lazy,
                        # but for now, reading the whole file to get metadata is okay as long as we don't keep it all in memory.
                        with open(filepath, 'r') as f:
                            data = json.load(f)
                            scan_id = data.get("scan_id")
                            if scan_id:
                                # Extract metadata
                                metadata = {
                                    "scan_id": scan_id,
                                    "status": data.get("status"),
                                    "timestamp": data.get("topology", {}).get("scan_timestamp") if "topology" in data else data.get("timestamp"),
                                    "source_type": data.get("topology", {}).get("source_type") if "topology" in data else "unknown",
                                    "source_id": data.get("topology", {}).get("source_id") if "topology" in data else "unknown",
                                    "total_projects": data.get("topology", {}).get("total_projects", 0) if "topology" in data else data.get("total_projects", 0),
                                }
                                self.scans_metadata[scan_id] = metadata
                                
                                # Check if it's the latest completed
                                if metadata["status"] == "completed" and metadata["timestamp"]:
                                    if not self.latest_completed_scan_id:
                                        self.latest_completed_scan_id = scan_id
                                    else:
                                        prev_latest = self.scans_metadata[self.latest_completed_scan_id]
                                        if metadata["timestamp"] > prev_latest["timestamp"]:
                                            self.latest_completed_scan_id = scan_id
                                            
                                loaded_count += 1
                    except Exception as e:
                        logger.error(f"Failed to load scan file {filename}: {e}")
            logger.info(f"Loaded {loaded_count} scan metadata items. Latest: {self.latest_completed_scan_id}")
        except Exception as e:
            logger.error(f"Error initializing scan loader: {e}")

    def save_scan(self, scan_id: str, data: dict):
        """Save a scan to disk and update metadata."""
        try:
            # Update memory cache
            self.scans_cache[scan_id] = data
            
            # Update metadata
            metadata = {
                "scan_id": scan_id,
                "status": data.get("status"),
                "timestamp": data.get("topology", {}).get("scan_timestamp") if "topology" in data else data.get("timestamp"),
                "source_type": data.get("topology", {}).get("source_type") if "topology" in data else "unknown",
                "source_id": data.get("topology", {}).get("source_id") if "topology" in data else "unknown",
                "total_projects": data.get("topology", {}).get("total_projects", 0) if "topology" in data else data.get("total_projects", 0),
            }
            self.scans_metadata[scan_id] = metadata
            
            # Check latest
            if metadata["status"] == "completed":
                if not self.latest_completed_scan_id:
                    self.latest_completed_scan_id = scan_id
                else:
                    prev_latest = self.scans_metadata.get(self.latest_completed_scan_id)
                    if not prev_latest or (metadata["timestamp"] and metadata["timestamp"] >= prev_latest.get("timestamp", "")):
                        self.latest_completed_scan_id = scan_id

            if "scan_id" not in data:
                data["scan_id"] = scan_id
                
            def json_serial(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError (f"Type {type(obj)} not serializable")

            serialized_str = json.dumps(data, indent=2, default=json_serial)
            filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
            with open(filepath, 'w') as f:
                f.write(serialized_str)
            
            # Also update cache with serializable version to avoid issues
            self.scans_cache[scan_id] = json.loads(serialized_str)
                
            logger.debug(f"Saved scan {scan_id} to disk.")
        except Exception as e:
            logger.error(f"Failed to save scan {scan_id}: {e}")

    def get_scan(self, scan_id: str) -> Optional[dict]:
        """Get full scan data, loading from disk if not in cache."""
        if scan_id in self.scans_cache:
            return self.scans_cache[scan_id]
        
        # Try loading from disk
        filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    self.scans_cache[scan_id] = data
                    return data
            except Exception as e:
                logger.error(f"Failed to load full scan {scan_id} from disk: {e}")
        return None

    def get_all_scans_metadata(self) -> Dict[str, dict]:
        return self.scans_metadata

    def get_latest_completed_scan(self) -> Optional[dict]:
        if self.latest_completed_scan_id:
            return self.get_scan(self.latest_completed_scan_id)
        return None

    def delete_scan(self, scan_id: str):
        if scan_id in self.scans_metadata:
            del self.scans_metadata[scan_id]
        if scan_id in self.scans_cache:
            del self.scans_cache[scan_id]
            
        if scan_id == self.latest_completed_scan_id:
            self.latest_completed_scan_id = None
            # Re-find latest
            for sid, meta in self.scans_metadata.items():
                if meta["status"] == "completed":
                    if not self.latest_completed_scan_id or meta["timestamp"] > self.scans_metadata[self.latest_completed_scan_id]["timestamp"]:
                        self.latest_completed_scan_id = sid
        
        filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
        if os.path.exists(filepath):
            os.remove(filepath)

# Global instance
scan_manager = ScanManager()
