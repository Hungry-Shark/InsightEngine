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
        # Common Windows paths for local python installations
        possible_paths = [
            "kaggle", # If in PATH
            os.path.expanduser(r"~\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python312\\Scripts\\kaggle.exe"),
            os.path.expanduser(r"~\\AppData\\Roaming\\Python\\Python312\\Scripts\\kaggle.exe"),
            os.path.expanduser(r"~\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\kaggle.exe"),
        ]
        for p in possible_paths:
            try:
                # Test if command exists
                subprocess.run([p, "--version"], capture_output=True, check=True)
                return p
            except:
                continue
        return "kaggle" # fallback

    def start_notebook(self):
        """Triggers the Kaggle notebook run via CLI."""
        if not self.is_configured() or not self.notebook_slug:
            print("Kaggle credentials or notebook slug not found.")
            return False
        
        # Ensure kaggle.json is set up for the CLI if not already
        kaggle_config_dir = os.path.expanduser("~/.kaggle")
        os.makedirs(kaggle_config_dir, exist_ok=True)
        with open(os.path.join(kaggle_config_dir, "kaggle.json"), "w") as f:
            json.dump({"username": str(self.username), "key": str(self.key)}, f)
        
        # Command to run the notebook
        try:
            print(f"Triggering Kaggle notebook: {self.notebook_slug}...")
            cmd = self._get_kaggle_cmd()
            slug = str(self.notebook_slug)
            # Try to run directly
            subprocess.run([cmd, "notebooks", "run", slug], check=True)
            return True
        except Exception as e:
            print(f"Failed to start Kaggle notebook: {e}")
            # Try one more time with pull if metadata is missing
            try:
                subprocess.run([cmd, "notebooks", "pull", "-p", "./tmp/kaggle_nb", slug], capture_output=True)
                subprocess.run([cmd, "notebooks", "run", slug], check=True)
                return True
            except:
                return False

    def get_status(self):
        """Checks the status of the notebook."""
        if not self.notebook_slug:
            return "Kaggle not configured"
        try:
            cmd = self._get_kaggle_cmd()
            slug = str(self.notebook_slug)
            result = subprocess.run(
                [cmd, "notebooks", "status", slug],
                capture_output=True, text=True, check=False
            )
            if result.returncode != 0:
                return f"Error: {result.stderr or 'Notebook not found or unauthorized'}"
            return result.stdout.strip() or "No status returned"
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
