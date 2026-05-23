import json
import os
import re
import shutil
import subprocess
from typing import Dict, List, Optional, Tuple

REPO = r"c:\Users\arnau\OneDrive\Escriptori\repos_personal\MarketPulse"
TRANSCRIPT = r"C:\Users\arnau\.cursor\projects\c-Users-arnau-OneDrive-Escriptori-repos-personal-MarketPulse\agent-transcripts\b4ab681a-9f5a-4742-ade4-4e03dea031e2\b4ab681a-9f5a-4742-ade4-4e03dea031e2.jsonl"
BASE_COMMIT = "e090362"
VALID = re.compile(r"^(src/.+\.(tsx|ts|css)|vite\.config\.ts|tsconfig\.json|\.env\.example|index\.html)$")


def norm_path(path: str) -> str:
    path = path.replace("\\", "/")
    if "MarketPulse/" in path:
        path = path.split("MarketPulse/", 1)[1]
    return path


def git_show(rel: str) -> Optional[str]:
    result = subprocess.run(
        ["git", "show", f"{BASE_COMMIT}:{rel}"],
        cwd=REPO,
        capture_output=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.decode("utf-8", errors="replace")


def main() -> None:
    ops: List[Tuple[str, str, dict]] = []
    with open(TRANSCRIPT, "r", encoding="utf-8") as handle:
        for line in handle:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("role") != "assistant":
                continue
            content = obj.get("message", {}).get("content")
            if not isinstance(content, list):
                continue
            for part in content:
                if not isinstance(part, dict) or part.get("type") != "tool_use":
                    continue
                inp = part.get("input") or {}
                path = inp.get("path", "")
                if "MarketPulse" not in path:
                    continue
                rel = norm_path(path)
                if not VALID.match(rel):
                    continue
                ops.append((rel, part.get("name", ""), inp))

    files: Dict[str, Optional[str]] = {}
    warns = 0
    for rel, name, inp in ops:
        if rel not in files:
            files[rel] = git_show(rel)
        content = files[rel]
        if name == "Write":
            files[rel] = inp.get("contents", "")
            continue
        if name != "StrReplace" or content is None:
            continue
        old = inp.get("old_string")
        new = inp.get("new_string")
        if old is None or new is None:
            continue
        if inp.get("replace_all"):
            if old not in content:
                warns += 1
                continue
            content = content.replace(old, new)
        else:
            if old not in content:
                warns += 1
                continue
            content = content.replace(old, new, 1)
        files[rel] = content

    restored: List[str] = []
    for rel, content in files.items():
        if not content:
            continue
        dest = os.path.join(REPO, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
        restored.append(rel)

    print(f"RESTORED {len(restored)} files, {warns} patch warnings")
    for rel in sorted(restored):
        print(f"  {rel}")


if __name__ == "__main__":
    main()
