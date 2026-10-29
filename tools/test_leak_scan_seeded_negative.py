"""Prove the public leak scanner rejects a synthetic private-range address."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> None:
    scanner_value = os.environ.get("CONDUCTED_LEAK_SCANNER", "")
    scanner = Path(scanner_value)
    if not scanner.is_file():
        raise SystemExit("CONDUCTED_LEAK_SCANNER must name the fetched scanner file")

    address = ".".join(("10", "23", "45", "67"))
    with tempfile.TemporaryDirectory(prefix="conducted-leak-negative-") as directory:
        candidate = Path(directory) / "candidate.txt"
        candidate.write_text(f"candidate address: {address}\n", encoding="utf-8")
        result = subprocess.run(
            [
                sys.executable,
                str(scanner),
                "--text-file",
                str(candidate),
                "--allow-repo-ref",
                "conducted",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )

    if result.returncode != 1:
        raise SystemExit(
            f"Expected the seeded finding to exit 1; scanner exited {result.returncode}."
        )
    print("Seeded negative rejected with finding exit code 1.")


if __name__ == "__main__":
    main()
