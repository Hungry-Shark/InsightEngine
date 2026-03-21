import os
import time
import subprocess
import json
from typing import Optional

class KaggleManager:
    def __init__(self):
        self.username = os.environ.get("KAGGLE_USERNAME")
        self.key = os.environ.get("KAGGLE_KEY")
        self.notebook_slug = f"{self.username}/internvl-server" if self.username else None

    def is_configured(self) -> bool:
        return bool(self.username and self.key)

    def _get_kaggle_cmd(self):
        """Find the kaggle executable path."""
        possible_paths = [
            "kaggle", # If in PATH
            os.path.expanduser(r"~\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\Scripts\kaggle.exe"),
            os.path.expanduser(r"~\AppData\Roaming\Python\Python312\Scripts\kaggle.exe"),
            os.path.expanduser(r"~\AppData\Local\Programs\Python\Python312\Scripts\kaggle.exe"),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                return p
        return "kaggle" # fallback

    def start_notebook(self):
        """Triggers the Kaggle notebook run via CLI."""
        if not self.is_configured() or not self.notebook_slug:
            print("Kaggle credentials or notebook slug not found.")
            return False
        
        # Build environment for the command
        env = os.environ.copy()
        env["KAGGLE_USERNAME"] = str(self.username)
        env["KAGGLE_KEY"] = str(self.key)
        env["PYTHONUTF8"] = "1"
        
        cmd = self._get_kaggle_cmd()
        slug = str(self.notebook_slug)
        
        # Trigger via push by creating a temporary deployment folder
        try:
            print(f"Triggering Kaggle notebook: {slug}...")
            # We try to push to trigger. If we don't have local code, 
            # we pull it first to ensure we have the latest metadata.
            tmp_dir = os.path.join(os.getcwd(), "tmp", "kaggle_trigger")
            os.makedirs(tmp_dir, exist_ok=True)
            
            # Pull with metadata to get the latest slug and configuration
            subprocess.run([cmd, "kernels", "pull", "-p", tmp_dir, slug, "-m"], capture_output=True, env=env)
            
            # Now push it back to trigger a run
            result = subprocess.run([cmd, "kernels", "push", "-p", tmp_dir], capture_output=True, text=True, env=env)
            
            if result.returncode == 0:
                return True
            else:
                print(f"Kaggle push failed: {result.stderr}")
                # Fallback: maybe the old notebooks run still exists or is needed?
                # For CLI 2.0.0, push is the standard.
                return False
        except Exception as e:
            print(f"Failed to start Kaggle notebook: {e}")
            return False

    def get_status(self):
        """Checks the status of the notebook."""
        if not self.notebook_slug:
            return "Kaggle not configured"
        try:
            cmd = self._get_kaggle_cmd()
            slug = str(self.notebook_slug)
            env = os.environ.copy()
            env["KAGGLE_USERNAME"] = str(self.username)
            env["KAGGLE_KEY"] = str(self.key)
            result = subprocess.run(
                [cmd, "kernels", "status", slug],
                capture_output=True, text=True, check=False, env=env
            )
            if result.returncode != 0:
                # 404 on status might mean no runs yet.
                if "404" in result.stderr:
                    return "No history (Try 'Wake Up')"
                return f"Error: {result.stderr.split(':')[-1].strip() or 'Unauthorized/Not Found'}"
            return result.stdout.strip() or "Idle"
        except Exception as e:
            return f"Exception: {str(e)}"

if __name__ == "__main__":
    # Test
    manager = KaggleManager()
    if manager.is_configured():
        print("Kaggle is configured.")
        # manager.start_notebook()
    else:
        print("Kaggle is not configured.")
