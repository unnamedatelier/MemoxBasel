import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_server():
    # Test session and topic UIDs
    session_uid = "test-session-456"
    topic1_uid = "math-notes"
    topic2_uid = "science-notes"
    
    print(f'=== Step 1: Creating session: {session_uid} ===')
    r1 = requests.get(f'{BASE_URL}/init', params={'session_uid': session_uid})
    print('Response:', r1.json())
    print('Status code:', r1.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 2: Creating topic: {topic1_uid} ===')
    r2 = requests.post(f'{BASE_URL}/topic', json={"session_uid": session_uid, "topic_uid": topic1_uid})
    print('Response:', r2.json())
    print('Status code:', r2.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 3: Creating topic: {topic2_uid} ===')
    r3 = requests.post(f'{BASE_URL}/topic', json={"session_uid": session_uid, "topic_uid": topic2_uid})
    print('Response:', r3.json())
    print('Status code:', r3.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 4: Adding input to {topic1_uid} ===')
    r4 = requests.post(f'{BASE_URL}/input', json={
        "session_uid": session_uid, 
        "topic_uid": topic1_uid, 
        "text": "Pythagorean theorem: a² + b² = c²"
    })
    print('Response:', r4.json())
    print('Status code:', r4.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 5: Adding another input to {topic1_uid} ===')
    r5 = requests.post(f'{BASE_URL}/input', json={
        "session_uid": session_uid, 
        "topic_uid": topic1_uid, 
        "text": "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a"
    })
    print('Response:', r5.json())
    print('Status code:', r5.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 6: Adding input to {topic2_uid} ===')
    r6 = requests.post(f'{BASE_URL}/input', json={
        "session_uid": session_uid, 
        "topic_uid": topic2_uid, 
        "text": "Newton's First Law: An object at rest stays at rest"
    })
    print('Response:', r6.json())
    print('Status code:', r6.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 7: Adding another input to {topic2_uid} ===')
    r7 = requests.post(f'{BASE_URL}/input', json={
        "session_uid": session_uid, 
        "topic_uid": topic2_uid, 
        "text": "E = mc²"
    })
    print('Response:', r7.json())
    print('Status code:', r7.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 8: Ending topic {topic1_uid} ===')
    r8 = requests.post(f'{BASE_URL}/end-topic', json={
        "session_uid": session_uid, 
        "topic_uid": topic1_uid
    })
    print('Response:', r8.json())
    print('Status code:', r8.status_code)
    print()

    time.sleep(0.5)

    print(f'=== Step 9: Ending topic {topic2_uid} ===')
    r9 = requests.post(f'{BASE_URL}/end-topic', json={
        "session_uid": session_uid, 
        "topic_uid": topic2_uid
    })
    print('Response:', r9.json())
    print('Status code:', r9.status_code)
    print()

    print(f'✓ Test completed!')
    print(f'  Check sessions_folder/{session_uid}/{topic1_uid}_finished.json')
    print(f'  Check sessions_folder/{session_uid}/{topic2_uid}_finished.json')

if __name__ == "__main__":
    test_server()