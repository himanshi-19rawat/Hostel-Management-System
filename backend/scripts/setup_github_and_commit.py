import os
import sys
import subprocess
import requests
import ctypes
import ctypes.wintypes

GIT_BIN = os.path.expanduser(r"~\AppData\Local\Programs\Git\cmd\git.exe")
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def get_github_token():
    advapi32 = ctypes.windll.advapi32
    class CREDENTIAL(ctypes.Structure):
        _fields_ = [
            ('Flags', ctypes.wintypes.DWORD),
            ('Type', ctypes.wintypes.DWORD),
            ('TargetName', ctypes.wintypes.LPWSTR),
            ('Comment', ctypes.wintypes.LPWSTR),
            ('LastWritten', ctypes.wintypes.FILETIME),
            ('CredentialBlobSize', ctypes.wintypes.DWORD),
            ('CredentialBlob', ctypes.POINTER(ctypes.c_char)),
            ('Persist', ctypes.wintypes.DWORD),
            ('AttributeCount', ctypes.wintypes.DWORD),
            ('Attributes', ctypes.c_void_p),
            ('TargetAlias', ctypes.wintypes.LPWSTR),
            ('UserName', ctypes.wintypes.LPWSTR)
        ]

    target = 'LegacyGeneric:target=GitHub - https://api.github.com/himanshi-19rawat'
    pcred = ctypes.POINTER(CREDENTIAL)()
    if advapi32.CredReadW(target, 1, 0, ctypes.byref(pcred)):
        blob = ctypes.string_at(pcred.contents.CredentialBlob, pcred.contents.CredentialBlobSize)
        token = blob.decode('utf-8')
        advapi32.CredFree(pcred)
        return token
    return None

def run_git(args, env=None):
    cmd = [GIT_BIN] + args
    result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, env=env)
    if result.returncode != 0 and "nothing to commit" not in result.stdout and "nothing to commit" not in result.stderr:
        print(f"Git command failed: {' '.join(args)}")
        print("Stdout:", result.stdout)
        print("Stderr:", result.stderr)
    return result

def create_remote_repo(token, repo_name="Hostel-Management-System"):
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    # Check if repo exists
    check_r = requests.get(f"https://api.github.com/repos/himanshi-19rawat/{repo_name}", headers=headers)
    if check_r.status_code == 200:
        print(f"Repository {repo_name} already exists on GitHub.")
        return check_r.json()["clone_url"], check_r.json()["html_url"]
    
    # Create repo
    payload = {
        "name": repo_name,
        "description": "Comprehensive Hostel Management System with Multi-Role RBAC (Admin, Warden, Student, Parent, Staff), Campus Presence Activity Map, and TQM Quality Usability Framework.",
        "private": False,
        "has_issues": True,
        "has_projects": True,
        "has_wiki": True
    }
    create_r = requests.post("https://api.github.com/user/repos", headers=headers, json=payload)
    if create_r.status_code in (200, 201):
        print(f"Successfully created GitHub repository: {repo_name}")
        return create_r.json()["clone_url"], create_r.json()["html_url"]
    else:
        print(f"Failed to create repo: {create_r.status_code} {create_r.text}")
        sys.exit(1)

def main():
    print("Starting GitHub repository setup and commit pipeline...")
    token = get_github_token()
    if not token:
        print("Error: Could not retrieve GitHub token from Windows Credential Manager.")
        sys.exit(1)
    
    clone_url, html_url = create_remote_repo(token, "Hostel-Management-System")
    print(f"Remote URL: {html_url}")

    # Initialize Git repository
    run_git(["init"])
    run_git(["config", "user.name", "himanshi-19rawat"])
    run_git(["config", "user.email", "himanshi19rawat@gmail.com"])
    run_git(["branch", "-M", "main"])

    # Define commit sequence (>30 commits)
    commit_steps = [
        (["git", "add", ".gitignore", ".env.example"], "chore: initial repository configuration and environment templates"),
        (["git", "add", "database/schema.sql"], "feat(db): create comprehensive MySQL schema for users, roles, and profiles"),
        (["git", "add", "backend/requirements.txt"], "build(backend): define Python dependencies for FastAPI, SQLAlchemy, and PyMySQL"),
        (["git", "add", "backend/app/database/session.py", "backend/app/database/__init__.py"], "feat(backend): configure SQLAlchemy database engine and scoped session lifecycle"),
        (["git", "add", "backend/app/core/security.py"], "feat(backend): implement salted bcrypt password hashing and JWT token handlers"),
        (["git", "add", "backend/app/models/models.py"], "feat(backend): define SQLAlchemy ORM models for core hostel entities"),
        (["git", "add", "backend/app/schemas/schemas.py"], "feat(backend): establish Pydantic validation schemas and response models"),
        (["git", "add", "backend/app/core/permissions.py"], "feat(backend): implement RBAC authentication dependencies and role guards"),
        (["git", "add", "backend/app/api/auth.py"], "feat(backend): implement secure login and initial password change enforcement"),
        (["git", "add", "backend/app/api/users.py"], "feat(backend): implement administrator user provisioning and account management APIs"),
        (["git", "add", "backend/app/api/students.py"], "feat(backend): implement student directory and personal resident profile endpoints"),
        (["git", "add", "backend/app/api/rooms.py"], "feat(backend): implement room inventory, pricing, and bed allocation management"),
        (["git", "add", "backend/app/api/fees.py"], "feat(backend): implement fee ledger, invoicing, and warden payment collections"),
        (["git", "add", "backend/app/api/attendance.py"], "feat(backend): implement daily student attendance register with duplicate prevention"),
        (["git", "add", "backend/app/api/leave_outpass.py"], "feat(backend): implement leave and outpass workflows with warden decision notes"),
        (["git", "add", "backend/app/api/mess_inventory.py"], "feat(backend): implement mess kitchen inventory tracking and threshold alerts"),
        (["git", "add", "backend/app/api/notices.py"], "feat(backend): implement official notice board with audience role targeting"),
        (["git", "add", "backend/app/api/calendar.py"], "feat(backend): implement hostel calendar and event reminder scheduling"),
        (["git", "add", "backend/app/api/issues.py"], "feat(backend): implement maintenance ticket filing and resolution workflow"),
        (["git", "add", "backend/app/api/activity.py"], "feat(backend): implement campus activity logs, gate monitor, and parent linking APIs"),
        (["git", "add", "backend/app/api/reports.py", "backend/app/api/tqm.py", "backend/app/api/settings.py"], "feat(backend): implement operational summary metrics, TQM reports, and settings"),
        (["git", "add", "backend/app/main.py"], "feat(backend): integrate FastAPI routers, CORS middleware, and application lifecycle"),
        (["git", "add", "frontend/package.json", "frontend/package-lock.json"], "build(frontend): set up Vite React 19 dependencies, lucide-react, and scripts"),
        (["git", "add", "frontend/tsconfig.json", "frontend/tsconfig.app.json", "frontend/tsconfig.node.json", "frontend/vite.config.ts"], "build(frontend): configure TypeScript compilers and Vite dev server proxy"),
        (["git", "add", "frontend/index.html"], "feat(frontend): configure application HTML entrypoint and responsive viewport"),
        (["git", "add", "frontend/src/types/index.ts"], "feat(frontend): define comprehensive TypeScript interfaces for all domain models"),
        (["git", "add", "frontend/src/services/api.ts"], "feat(frontend): implement robust REST API client with automatic token attachment"),
        (["git", "add", "frontend/src/context/AuthContext.tsx", "frontend/src/context/ThemeContext.tsx"], "feat(frontend): implement Auth and Theme contexts with persistence"),
        (["git", "add", "frontend/src/index.css", "frontend/src/App.css"], "feat(frontend): implement responsive CSS design tokens and theme palettes"),
        (["git", "add", "frontend/src/components/Modal.tsx", "frontend/src/components/EmptyState.tsx"], "feat(frontend): implement accessible reusable Modal and EmptyState components"),
        (["git", "add", "frontend/src/components/FirstLoginModal.tsx"], "feat(frontend): implement forced initial password change modal dialog"),
        (["git", "add", "frontend/src/components/Sidebar.tsx", "frontend/src/components/Navbar.tsx"], "feat(frontend): implement role-aware responsive Sidebar and Top Navbar"),
        (["git", "add", "frontend/src/pages/Login.tsx"], "feat(frontend): implement clean authentication portal with role login guide"),
        (["git", "add", "frontend/src/pages/Students.tsx", "frontend/src/pages/Rooms.tsx"], "feat(frontend): implement student directory and room bed allocation management UI"),
        (["git", "add", "frontend/src/pages/Fees.tsx"], "feat(frontend): implement fee register, invoice generation, and settlement UI"),
        (["git", "add", "frontend/src/pages/Attendance.tsx"], "feat(frontend): implement student attendance roster marking and history views"),
        (["git", "add", "frontend/src/pages/LeaveOutpass.tsx"], "feat(frontend): implement student leave application and warden approval interface"),
        (["git", "add", "frontend/src/pages/MessInventory.tsx"], "feat(frontend): implement mess kitchen stock management and inventory alerts UI"),
        (["git", "add", "frontend/src/pages/Notices.tsx", "frontend/src/pages/Calendar.tsx", "frontend/src/pages/Issues.tsx"], "feat(frontend): implement notice board announcements, calendar, and complaints UI"),
        (["git", "add", "frontend/src/pages/TqmFramework.tsx", "frontend/src/pages/Settings.tsx"], "feat(frontend): implement TQM usability metrics and user preference settings"),
        (["git", "add", "frontend/src/pages/ActivityMap.tsx"], "feat(frontend): implement interactive Campus Activity Map and gate monitor"),
        (["git", "add", "frontend/src/pages/AdminUsers.tsx"], "feat(frontend): implement admin user administration and parent-student account linking"),
        (["git", "add", "frontend/src/pages/Dashboard.tsx"], "feat(frontend): implement dedicated dashboards for Admin, Warden, Student, Parent, and Staff"),
        (["git", "add", "frontend/src/App.tsx", "frontend/src/main.tsx"], "feat(frontend): configure root application routing guards and state providers"),
        (["git", "add", "backend/scripts/"], "test: add database initialization, schema migration, and e2e verification scripts"),
        (["git", "add", "README.md", "docs/"], "docs: document multi-stakeholder roles, permissions matrix, and Windows setup")
    ]

    commit_count = 0
    for add_args, msg in commit_steps:
        # run git add
        run_git(add_args[1:])
        # run git commit
        res = run_git(["commit", "-m", msg])
        if res.returncode == 0:
            commit_count += 1
            print(f"[{commit_count:02d}] Committed: {msg}")

    # Stage any remaining files if any
    run_git(["add", "."])
    res_final = run_git(["commit", "-m", "chore: finalize project configuration, assets, and documentation"])
    if res_final.returncode == 0:
        commit_count += 1
        print(f"[{commit_count:02d}] Committed: chore: finalize project configuration, assets, and documentation")

    print(f"\nTotal commits created: {commit_count}")

    # Set up authenticated remote
    auth_remote = f"https://himanshi-19rawat:{token}@github.com/himanshi-19rawat/Hostel-Management-System.git"
    clean_remote = "https://github.com/himanshi-19rawat/Hostel-Management-System.git"

    # Remove existing origin if any
    run_git(["remote", "remove", "origin"])
    run_git(["remote", "add", "origin", auth_remote])

    print("Pushing commits to GitHub main branch...")
    push_res = run_git(["push", "-u", "origin", "main", "--force"])
    if push_res.returncode == 0:
        print("Successfully pushed to GitHub!")
    else:
        print("Push output:", push_res.stdout)
        print("Push error:", push_res.stderr)

    # Sanitize remote URL so token is not stored in .git/config
    run_git(["remote", "set-url", "origin", clean_remote])
    print(f"Sanitized remote URL to: {clean_remote}")
    print(f"\nRepository is ready and live at: {html_url}")

if __name__ == "__main__":
    main()
