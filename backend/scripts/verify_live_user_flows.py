import requests

BASE_URL = 'http://127.0.0.1:8000'

# 1. Login Warden
r = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'warden@gmail.com', 'password': '12345678'})
assert r.status_code == 200, f'Warden login failed: {r.text}'
warden_token = r.json()['access_token']
warden_h = {'Authorization': f'Bearer {warden_token}'}

# 2. Login Student (Anjali)
r = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'anjali@gmail.com', 'password': '12345678'})
assert r.status_code == 200, f'Student login failed: {r.text}'
student_token = r.json()['access_token']
student_h = {'Authorization': f'Bearer {student_token}'}

# 3. Login Admin
r = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'admin@gmail.com', 'password': '12345678'})
assert r.status_code == 200, f'Admin login failed: {r.text}'
admin_token = r.json()['access_token']
admin_h = {'Authorization': f'Bearer {admin_token}'}

# 4. Login Staff
r = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'staff@gmail.com', 'password': '12345678'})
assert r.status_code == 200, f'Staff login failed: {r.text}'
staff_token = r.json()['access_token']
staff_h = {'Authorization': f'Bearer {staff_token}'}

print('[CHECK 1] Logins successful.')

# Test Leave/Outpass loads
r = requests.get(f'{BASE_URL}/api/leave-outpass', headers=student_h)
assert r.status_code == 200, f'Student get requests failed: {r.status_code} {r.text}'
print(f'[CHECK 2] Leave/Outpass loads for Student: {len(r.json())} existing requests.')

r = requests.get(f'{BASE_URL}/api/leave-outpass/stats', headers=student_h)
assert r.status_code == 200, f'Student get stats failed: {r.status_code} {r.text}'
print(f'[CHECK 3] Leave/Outpass stats loads: {r.json()}')

# Test Mess Inventory loads
r = requests.get(f'{BASE_URL}/api/mess/inventory', headers=warden_h)
assert r.status_code == 200, f'Warden get inventory failed: {r.status_code} {r.text}'
print(f'[CHECK 4] Mess Inventory loads for Warden: {len(r.json())} existing items.')

# Test Student submits a request
leave_payload = {
    'request_type': 'leave',
    'start_date': '2026-11-05',
    'end_date': '2026-11-08',
    'reason': 'Visiting family for festival'
}
r = requests.post(f'{BASE_URL}/api/leave-outpass', json=leave_payload, headers=student_h)
assert r.status_code == 201, f'Student submit leave failed: {r.status_code} {r.text}'
created_leave = r.json()
print(f'[CHECK 5] Student submitted leave request successfully: ID {created_leave["id"]}, Status: {created_leave["status"]}')

# Test Warden adds an inventory item
inv_payload = {
    'item_name': 'Basmati Rice',
    'category': 'Grains & Cereals',
    'quantity': 150.0,
    'unit': 'kg',
    'min_threshold': 30.0,
    'unit_price': 85.0,
    'notes': 'Grade A long grain'
}
r = requests.post(f'{BASE_URL}/api/mess/inventory', json=inv_payload, headers=warden_h)
assert r.status_code == 201, f'Warden add inventory failed: {r.status_code} {r.text}'
created_inv = r.json()
print(f'[CHECK 6] Warden added inventory item successfully: ID {created_inv["id"]}, Item: {created_inv["item_name"]}')

# Test records remain after reload/refresh
r_leave = requests.get(f'{BASE_URL}/api/leave-outpass', headers=student_h)
assert any(req['id'] == created_leave['id'] for req in r_leave.json()), 'Created leave request not found on reload!'
print(f'[CHECK 7] Leave request persists on refresh: found {len(r_leave.json())} requests.')

r_inv = requests.get(f'{BASE_URL}/api/mess/inventory', headers=warden_h)
assert any(item['id'] == created_inv['id'] for item in r_inv.json()), 'Created inventory item not found on reload!'
print(f'[CHECK 8] Inventory item persists on refresh: found {len(r_inv.json())} items.')

# Test Role Permissions
# Admin: GET inventory is 200, POST inventory is 403
r_admin_get = requests.get(f'{BASE_URL}/api/mess/inventory', headers=admin_h)
assert r_admin_get.status_code == 200, f'Admin should be able to view inventory: {r_admin_get.status_code}'
r_admin_post = requests.post(f'{BASE_URL}/api/mess/inventory', json=inv_payload, headers=admin_h)
assert r_admin_post.status_code == 403, f'Admin must NOT be able to add inventory: {r_admin_post.status_code}'
print('[CHECK 9] Admin role permission: read-only oversight (GET 200, POST 403) verified.')

# Student: GET inventory is 403
r_student_inv = requests.get(f'{BASE_URL}/api/mess/inventory', headers=student_h)
assert r_student_inv.status_code == 403, f'Student must be forbidden from inventory: {r_student_inv.status_code}'
print('[CHECK 10] Student role permission: forbidden from inventory (GET 403) verified.')

# Staff: GET inventory is 403
r_staff_inv = requests.get(f'{BASE_URL}/api/mess/inventory', headers=staff_h)
assert r_staff_inv.status_code == 403, f'Staff must be forbidden from inventory: {r_staff_inv.status_code}'
print('[CHECK 11] Accounts Staff role permission: forbidden from inventory (GET 403) verified.')

# Warden approves student request
r_approve = requests.put(f'{BASE_URL}/api/leave-outpass/{created_leave["id"]}/status', json={'status': 'approved', 'decision_remarks': 'Approved by Warden'}, headers=warden_h)
assert r_approve.status_code == 200, f'Warden approval failed: {r_approve.status_code} {r_approve.text}'
assert r_approve.json()['status'] == 'approved'
print('[CHECK 12] Warden approved leave request successfully.')

# Student cannot approve request
r_student_approve = requests.put(f'{BASE_URL}/api/leave-outpass/{created_leave["id"]}/status', json={'status': 'approved'}, headers=student_h)
assert r_student_approve.status_code == 403, f'Student must NOT be able to approve requests: {r_student_approve.status_code}'
print('[CHECK 13] Student forbidden from approving requests (PUT status 403) verified.')

print('ALL 13 CHECKS COMPLETED AND PASSED!')
