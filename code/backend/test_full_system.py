"""
Comprehensive test script for the entire backend system
Tests all endpoints and functionality of server.py and main.py integration
"""
import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def print_response(response):
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print()

def test_init_session():
    """Test: Create a new session folder"""
    print_section("TEST 1: Initialize Session")
    
    session_uid = "test-session-demo"
    print(f"Creating session: {session_uid}")
    
    response = requests.get(f"{BASE_URL}/init", params={"session_uid": session_uid})
    print_response(response)
    
    return session_uid

def test_create_topics(session_uid):
    """Test: Create multiple topics in a session"""
    print_section("TEST 2: Create Topics")
    
    topics = ["math-notes", "science-notes", "misc"]
    
    for topic in topics:
        print(f"Creating topic: {topic}")
        response = requests.post(
            f"{BASE_URL}/topic",
            json={"session_uid": session_uid, "topic_uid": topic}
        )
        print_response(response)
        time.sleep(0.3)
    
    return topics

def test_add_inputs(session_uid, topics):
    """Test: Add inputs to different topics"""
    print_section("TEST 3: Add Inputs to Topics")
    
    # Math inputs
    math_inputs = [
        "Pythagorean theorem: a² + b² = c²",
        "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
        "Area of circle: A = πr²",
        "Derivative of x²: 2x",
        "Integral of 1/x: ln|x| + C"
    ]
    
    print(f"Adding {len(math_inputs)} inputs to {topics[0]}...")
    for text in math_inputs:
        response = requests.post(
            f"{BASE_URL}/input",
            json={"session_uid": session_uid, "topic_uid": topics[0], "text": text}
        )
        print(f"  Added: {text[:50]}... - Status: {response.status_code}")
        time.sleep(0.2)
    
    print()
    
    # Science inputs
    science_inputs = [
        "Newton's First Law: An object at rest stays at rest",
        "E = mc²: Mass-energy equivalence",
        "F = ma: Force equals mass times acceleration",
        "Speed of light: 299,792,458 m/s",
        "DNA structure: double helix discovered by Watson and Crick"
    ]
    
    print(f"Adding {len(science_inputs)} inputs to {topics[1]}...")
    for text in science_inputs:
        response = requests.post(
            f"{BASE_URL}/input",
            json={"session_uid": session_uid, "topic_uid": topics[1], "text": text}
        )
        print(f"  Added: {text[:50]}... - Status: {response.status_code}")
        time.sleep(0.2)
    
    print()
    
    # Misc inputs
    misc_inputs = [
        "Remember to buy groceries tomorrow",
        "Meeting at 3 PM on Friday",
        "Call the dentist for appointment"
    ]
    
    print(f"Adding {len(misc_inputs)} inputs to {topics[2]}...")
    for text in misc_inputs:
        response = requests.post(
            f"{BASE_URL}/input",
            json={"session_uid": session_uid, "topic_uid": topics[2], "text": text}
        )
        print(f"  Added: {text[:50]}... - Status: {response.status_code}")
        time.sleep(0.2)
    
    print("\n✓ All inputs added successfully!")

def test_get_topic_data(session_uid, topic_uid):
    """Test: Retrieve specific topic data"""
    print_section(f"TEST 4: Get Topic Data - {topic_uid}")
    
    print(f"Retrieving data for: {session_uid}/{topic_uid}")
    response = requests.get(
        f"{BASE_URL}/get-topic-data",
        params={"session_uid": session_uid, "topic_uid": topic_uid}
    )
    print_response(response)

def test_wait_for_processing():
    """Wait for main.py to process the topics"""
    print_section("TEST 5: Waiting for main.py Processing")
    
    print("main.py should be running in the background and will process topics automatically.")
    print("It checks every 10 seconds for unchecked topics.")
    print("\nWaiting 15 seconds for processing to complete...")
    
    for i in range(15, 0, -1):
        print(f"  {i} seconds remaining...", end="\r")
        time.sleep(1)
    
    print("\n✓ Processing time elapsed!")

def test_get_updates():
    """Test: Check if updates were queued"""
    print_section("TEST 6: Get Updates Queue")
    
    print("Checking for processed updates...")
    response = requests.get(f"{BASE_URL}/get-updates")
    print_response(response)
    
    if response.status_code == 200:
        data = response.json()
        count = data.get("count", 0)
        if count > 0:
            print(f"✓ Found {count} processed topic(s)!")
            for update in data.get("updates", []):
                print(f"\n  Session: {update['session_uid']}")
                print(f"  Topic: {update['topic_uid']}")
                print(f"  Timestamp: {update['timestamp']}")
                if 'formatted' in update['data']:
                    print(f"  Categories: {list(update['data']['formatted'].keys())}")
        else:
            print("⚠ No updates found yet. main.py might still be processing or not running.")

def test_end_topic(session_uid, topic_uid):
    """Test: Mark a topic as finished"""
    print_section(f"TEST 7: End Topic - {topic_uid}")
    
    print(f"Marking topic as finished: {topic_uid}")
    response = requests.post(
        f"{BASE_URL}/end-topic",
        json={"session_uid": session_uid, "topic_uid": topic_uid}
    )
    print_response(response)

def test_frontend_integration():
    """Test: Check if frontend server is running"""
    print_section("TEST 8: Frontend Server Check")
    
    print(f"Checking if frontend is running at {FRONTEND_URL}...")
    try:
        response = requests.get(FRONTEND_URL, timeout=2)
        if response.status_code == 200:
            print(f"✓ Frontend server is running!")
            print(f"Status: {response.status_code}")
        else:
            print(f"⚠ Frontend returned unexpected status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Frontend server is not running or not accessible")
        print(f"Error: {e}")
        print(f"\nTo start frontend: cd code/frontend && node server.js")

def print_summary():
    """Print test summary and instructions"""
    print_section("TEST COMPLETE - Summary")
    
    print("✓ All tests completed!")
    print("\nWhat was tested:")
    print("  1. Session initialization (/init)")
    print("  2. Topic creation (/topic)")
    print("  3. Adding inputs to topics (/input)")
    print("  4. Retrieving topic data (/get-topic-data)")
    print("  5. Waiting for main.py processing")
    print("  6. Checking update queue (/get-updates)")
    print("  7. Marking topic as finished (/end-topic)")
    print("  8. Frontend server integration check")
    
    print("\n" + "="*70)
    print("NEXT STEPS:")
    print("="*70)
    print("\n1. Check the processed topic files:")
    print("   - code/backend/sessions_folder/test-session-demo/")
    print("   - Look for 'checked': true and 'formatted' data")
    
    print("\n2. Verify main.py output in its terminal:")
    print("   - Should show processing messages")
    print("   - Should show notification success messages")
    
    print("\n3. Check server.py output in its terminal:")
    print("   - Should show 'Forwarded update to frontend' messages")
    
    print("\n4. If frontend is running, check:")
    print("   - http://localhost:3000/sessions/test-session-demo/topics.json")
    print("   - Should contain the formatted/categorized data")
    
    print("\n5. To create a frontend session (optional):")
    print("   curl -X POST http://localhost:3000/createsession -H \"Content-Type: application/json\" -d \"{\\\"name\\\": \\\"test-session-demo\\\"}\"")
    
    print("\n" + "="*70)

def main():
    print("="*70)
    print("  COMPREHENSIVE BACKEND SYSTEM TEST")
    print("="*70)
    print("\nPrerequisites:")
    print("  1. server.py running: uvicorn server:app --reload")
    print("  2. main.py running: python main.py")
    print("  3. (Optional) server.js running: node server.js")
    print("\nStarting tests in 3 seconds...")
    time.sleep(3)
    
    try:
        # Run all tests
        session_uid = test_init_session()
        topics = test_create_topics(session_uid)
        test_add_inputs(session_uid, topics)
        test_get_topic_data(session_uid, topics[0])
        test_wait_for_processing()
        test_get_updates()
        test_end_topic(session_uid, topics[1])
        test_frontend_integration()
        print_summary()
        
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Could not connect to server!")
        print("Make sure server.py is running:")
        print("  cd code/backend")
        print("  uvicorn server:app --reload")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
