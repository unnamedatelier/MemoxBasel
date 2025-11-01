"""
Example script to demonstrate how server.js can retrieve updated topics
This shows the pattern that server.js should follow
"""
import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def check_for_updates():
    """Poll the server for updated topics"""
    try:
        response = requests.get(f"{BASE_URL}/get-updates")
        
        if response.status_code == 200:
            data = response.json()
            updates = data.get("updates", [])
            count = data.get("count", 0)
            
            if count > 0:
                print(f"\n{'='*60}")
                print(f"Received {count} update(s)")
                print(f"{'='*60}")
                
                for update in updates:
                    print(f"\nSession: {update['session_uid']}")
                    print(f"Topic: {update['topic_uid']}")
                    print(f"Timestamp: {update['timestamp']}")
                    print(f"Finished: {update.get('finished', False)}")
                    
                    # Access the formatted data
                    if 'formatted' in update['data']:
                        print(f"Categories found:")
                        for category, texts in update['data']['formatted'].items():
                            print(f"  - {category}: {len(texts)} item(s)")
                    
                    print()
            else:
                print("No updates available")
        else:
            print(f"Error: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")

def get_specific_topic(session_uid, topic_uid):
    """Retrieve a specific topic's data"""
    try:
        response = requests.get(
            f"{BASE_URL}/get-topic-data",
            params={"session_uid": session_uid, "topic_uid": topic_uid}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nRetrieved topic data:")
            print(f"Session: {data['session_uid']}")
            print(f"Topic: {data['topic_uid']}")
            print(f"Data: {data['data']}")
        else:
            print(f"Error: {response.status_code} - {response.json()}")
            
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    print("Example: Checking for updates from server")
    print("This demonstrates how server.js should poll for updates\n")
    
    # Poll for updates every 5 seconds
    try:
        while True:
            check_for_updates()
            print("\nWaiting 5 seconds before next check...")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n\nStopped polling. Goodbye!")
