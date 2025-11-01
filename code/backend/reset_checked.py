"""
Helper script to reset checked status for all topic files
This allows them to be reprocessed by main.py
"""
import os
import json

SESSIONS_FOLDER = "sessions_folder"

def reset_checked_status():
    """Reset checked=False for all topic files"""
    count = 0
    
    if not os.path.exists(SESSIONS_FOLDER):
        print(f"Sessions folder not found: {SESSIONS_FOLDER}")
        return
    
    for folder in os.listdir(SESSIONS_FOLDER):
        folder_path = os.path.join(SESSIONS_FOLDER, folder)
        
        if not os.path.isdir(folder_path):
            continue
        
        for file in os.listdir(folder_path):
            if file.endswith(".json") and not file.endswith("_finished.json"):
                file_path = os.path.join(folder_path, file)
                
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    # Reset checked to False
                    if data.get('checked', False):
                        data['checked'] = False
                        
                        with open(file_path, 'w') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        
                        print(f"✓ Reset: {file_path}")
                        count += 1
                    else:
                        print(f"- Already unchecked: {file_path}")
                        
                except Exception as e:
                    print(f"✗ Error processing {file_path}: {e}")
    
    print(f"\nTotal files reset: {count}")

if __name__ == "__main__":
    print("Resetting checked status for all topic files...\n")
    reset_checked_status()
    print("\nDone! main.py will now reprocess these files.")
