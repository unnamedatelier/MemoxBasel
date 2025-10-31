import requests
import time



BASE_URL = "http://127.0.0.1:8000"

def test_server():
    print('creating json')
    r1 = requests.get(f'{BASE_URL}/init', params={'number': 1})
    print('response:', r1.json())

    time.sleep(1)


    print('first input')
    r2 = requests.post(f'{BASE_URL}/input', json={"uid": 1, "text": "first input world!"})

    print('response:', r2.json())

    print('second input')
    r3 = requests.post(f'{BASE_URL}/input', json={"uid": 1, "text": "second input "})

    print('response:', r3.json())



if __name__ == "__main__":
    test_server()