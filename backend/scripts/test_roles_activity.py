import requests

BASE = 'http://127.0.0.1:8000'

for role, email in [
    ('admin', 'admin@gmail.com'),
    ('warden', 'warden@gmail.com'),
    ('student', 'anjali@gmail.com'),
    ('staff', 'staff@gmail.com'),
    ('parent', 'parent@gmail.com')
]:
    r_login = requests.post(f'{BASE}/api/auth/login', json={'email': email, 'password': '12345678'})
    assert r_login.status_code == 200, f'Login failed for {email}: {r_login.text}'
    token = r_login.json()['access_token']
    h = {'Authorization': f'Bearer {token}'}

    r_status = requests.get(f'{BASE}/api/activity/status', headers=h)
    assert r_status.status_code == 200, f'Activity status failed for {role}: {r_status.status_code}'
    statuses = r_status.json()

    r_logs = requests.get(f'{BASE}/api/activity/logs', headers=h)
    assert r_logs.status_code == 200, f'Activity logs failed for {role}: {r_logs.status_code}'
    logs = r_logs.json()

    print(f'[{role.upper()}] Status items visible: {len(statuses)}, Logs visible: {len(logs)}')
    for s in statuses:
        print(f"   -> Student {s['student_name']}: {s['current_status']} ({s['status_label']})")
