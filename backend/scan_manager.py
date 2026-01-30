
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
        self.scans: Dict[str, dict] = {}
        self._ensure_storage_dir()
        
    def _ensure_storage_dir(self):
        """Ensure storage directory exists."""
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)
            
    def load_scans(self):
        """Load all scans from disk into memory."""
        try:
            loaded_count = 0
            for filename in os.listdir(self.storage_dir):
                if filename.endswith(".json"):
                    try:
                        filepath = os.path.join(self.storage_dir, filename)
                        with open(filepath, 'r') as f:
                            data = json.load(f)
                            scan_id = data.get("scan_id")
                            if scan_id:
                                # Convert scan_timestamp string back to datetime if possible for sorting logic elsewhere,
                                # but keep as string in dict to match Pydantic serialization behavior
                                self.scans[scan_id] = data
                                loaded_count += 1
                    except Exception as e:
                        logger.error(f"Failed to load scan file {filename}: {e}")
            logger.info(f"Loaded {loaded_count} scans from {self.storage_dir}")
        except Exception as e:
            logger.error(f"Error initializing scan loader: {e}")

    def save_scan(self, scan_id: str, data: dict):
        """Save a scan to disk and memory."""
        try:
            # Update memory
            self.scans[scan_id] = data
            
            # Save to disk if completed
            # We save failed/pending states too so we don't lose track of long running jobs if restarted?
            # Ideally only save "completed" or "failed" final states to keep disk clean, 
            # but for resume capability (not yet implemented), saving everything is safer.
            # Only save full topology if it exists to avoid overwriting good data with bad?
            # Actually, `data` is the full state object.
            
            # Make sure scan_id is in data
            if "scan_id" not in data:
                data["scan_id"] = scan_id
                
            filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
            
            # Serialize
            # If data contains Pydantic models, they should be dumped before passing here, 
            # OR we handle dumping. The current main.py does `model_dump()` before storing in `scan_store`.
            # So `data` should be dict/json-serializable.
            # DateTimes might be strings or objects. JSON default serializer needed?
            # main.py uses default Pydantic serialization which handles datetime -> string (isoformat).
            
            # Serialize to ensure consistent types (datetime -> string)
            def json_serial(obj):
                """JSON serializer for objects not serializable by default json code"""
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError (f"Type {type(obj)} not serializable")

            # Update memory with serialized data to match file content behavior
            # This ensures subsequent reads get strings for dates, matching load_scans behavior
            serialized_str = json.dumps(data, indent=2, default=json_serial)
            data_normalized = json.loads(serialized_str)
            
            self.scans[scan_id] = data_normalized
            
            filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
            with open(filepath, 'w') as f:
                f.write(serialized_str)
                
            logger.debug(f"Saved scan {scan_id} to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to save scan {scan_id}: {e}")

    def get_scan(self, scan_id: str) -> Optional[dict]:
        return self.scans.get(scan_id)
        
    def get_all_scans(self) -> Dict[str, dict]:
        return self.scans

    def delete_scan(self, scan_id: str):
        if scan_id in self.scans:
            del self.scans[scan_id]
            filepath = os.path.join(self.storage_dir, f"{scan_id}.json")
            if os.path.exists(filepath):
                os.remove(filepath)

# Global instance
scan_manager = ScanManager()
