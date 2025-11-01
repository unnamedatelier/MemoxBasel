import requests
import time



BASE_URL = "http://127.0.0.1:8000"

def test_server():
    # Test with a string UID
    test_uid = "test-session-123"
    
    print(f'Creating session with UID: {test_uid}')
    r1 = requests.get(f'{BASE_URL}/init', params={'uid': test_uid})
    print('Response:', r1.json())
    print('Status code:', r1.status_code)
    print()

    time.sleep(0.5)

    print('Adding first input...')
    r2 = requests.post(f'{BASE_URL}/input', json={"uid": test_uid, "text": "first input - hello world!"})
    print('Response:', r2.json())
    print('Status code:', r2.status_code)
    print()

    time.sleep(0.5)

    print('Adding second input...')
    r3 = requests.post(f'{BASE_URL}/input', json={"uid": test_uid, "text": "second input - testing the server"})
    print('Response:', r3.json())
    print('Status code:', r3.status_code)
    print()

    time.sleep(0.5)

    print('Adding third input...')
    r4 = requests.post(f'{BASE_URL}/input', json={"uid": test_uid, "text": "third input - everything works!"})
    print('Response:', r4.json())
    print('Status code:', r4.status_code)
    print()

    print(f'✓ Test completed! Check sessions_folder/{test_uid}.json to see the results.')

if __name__ == "__main__":
    test_server()