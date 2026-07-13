"""
Efficient deployment: clone the HF Space git repo, copy files, push.
Much faster than upload_folder for large repos on OneDrive.

Usage:
    python deploy/hf_deploy_frontend.py
"""
import os
import shutil
import subprocess
import tempfile

REPO_ID = "fashionistar/military-pass-frontend"
TOKEN = os.environ.get("HF_TOKEN", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", ".vercel", ".github", ".vscode",
    ".idea", ".claude", ".agents", "tests", "docs", "coverage",
    "__pycache__", ".pytest_cache", "deploy",
}
EXCLUDE_FILES = {
    ".DS_Store", ".env", ".env.local", "modal_login.png",
    "posthog-setup-report.md", "nixpacks.toml", "apphosting.yaml",
    "railway.json", "render.yaml", "test_db.js", "test_tables.js",
}
EXCLUDE_SUFFIXES = (".tsbuildinfo", ".log")


def should_exclude(name, is_dir=False):
    if is_dir and name in EXCLUDE_DIRS:
        return True
    if not is_dir:
        if name in EXCLUDE_FILES:
            return True
        if name.startswith(".env"):
            return True
        if name.endswith(EXCLUDE_SUFFIXES):
            return True
    return False


def copy_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for item in os.listdir(src):
        src_path = os.path.join(src, item)
        is_dir = os.path.isdir(src_path)
        if should_exclude(item, is_dir):
            continue
        dst_path = os.path.join(dst, item)
        if is_dir:
            copy_tree(src_path, dst_path)
        else:
            shutil.copy2(src_path, dst_path)


tmpdir = tempfile.mkdtemp(prefix="hf_deploy_")
repo_url = f"https://oauth2:{TOKEN}@huggingface.co/spaces/{REPO_ID}"
repo_local = os.path.join(tmpdir, "frontend")

print(f"1/5 Cloning {REPO_ID} ...")
subprocess.run(["git", "clone", repo_url, repo_local], check=True, capture_output=True)

print("2/5 Clearing existing files ...")
for item in os.listdir(repo_local):
    if item in (".git", ".gitattributes"):
        continue
    path = os.path.join(repo_local, item)
    if os.path.isdir(path):
        shutil.rmtree(path)
    else:
        os.remove(path)

print("3/5 Copying project files ...")
copy_tree(ROOT, repo_local)

hf_readme = os.path.join(ROOT, "deploy", "huggingface-frontend", "README.md")
if os.path.exists(hf_readme):
    shutil.copy2(hf_readme, os.path.join(repo_local, "README.md"))

print("4/5 Setting up Git LFS and committing ...")
# HF Spaces requires binary files to be tracked via Git LFS
subprocess.run(["git", "lfs", "install"], cwd=repo_local, check=True, capture_output=True)
for pattern in ["*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg", "*.ico", "*.webp"]:
    subprocess.run(["git", "lfs", "track", pattern], cwd=repo_local, check=True, capture_output=True)
# .gitattributes must be committed before adding LFS-tracked files
subprocess.run(["git", "add", ".gitattributes"], cwd=repo_local, check=True, capture_output=True)
subprocess.run(["git", "commit", "-m", "Add Git LFS tracking"], cwd=repo_local, check=True, capture_output=True)

subprocess.run(["git", "add", "-A"], cwd=repo_local, check=True, capture_output=True)
subprocess.run(
    ["git", "commit", "-m", "Deploy: Next.js frontend with WebSocket+HTTP transport and HF AI backend chain"],
    cwd=repo_local, check=True, capture_output=True,
)

print("5/5 Pushing to HF Space ...")
result = subprocess.run(["git", "push"], cwd=repo_local, capture_output=True, text=True)
print("  stdout:", result.stdout[-500:] if result.stdout else "(empty)")
print("  stderr:", result.stderr[-500:] if result.stderr else "(empty)")

shutil.rmtree(tmpdir)
print(f"\nDONE. Space building at: https://huggingface.co/spaces/{REPO_ID}")
