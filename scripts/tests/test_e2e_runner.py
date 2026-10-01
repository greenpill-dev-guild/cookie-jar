"""Exercise the shell entry point without launching a browser or sending a transaction."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

RUNNER = Path(__file__).resolve().parents[1] / "test-e2e.sh"


class E2ERunnerTest(unittest.TestCase):
    def run_runner(self, exit_code=0, chain="0x7a69", http_exit=0):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "package.json").write_text("{}")
            (root / "e2e").mkdir()
            for name, content in {
                "curl": f'#!/bin/sh\necho \'{{"result":"{chain}"}}\'\nexit {http_exit}\n',
                "npx": f"#!/bin/sh\nexit {exit_code}\n",
                "bunx": f"#!/bin/sh\nexit {exit_code}\n",
            }.items():
                executable = root / name
                executable.write_text(content)
                executable.chmod(0o755)
            return subprocess.run(
                ["bash", str(RUNNER), "--skip-setup", "--ci"],
                cwd=root,
                env={**os.environ, "PATH": f"{root}:{os.environ['PATH']}"},
                capture_output=True,
                text=True,
            )

    def test_returns_playwright_failure(self):
        result = self.run_runner(exit_code=7)
        self.assertEqual(result.returncode, 7, result.stdout + result.stderr)
        self.assertNotIn("READY FOR PRODUCTION", result.stdout)

    def test_returns_success_only_after_successful_tests(self):
        result = self.run_runner()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_refuses_a_non_local_chain(self):
        self.assertNotEqual(self.run_runner(chain="0xa4b1").returncode, 0)

    def test_refuses_an_unavailable_app(self):
        self.assertNotEqual(self.run_runner(http_exit=22).returncode, 0)


if __name__ == "__main__":
    unittest.main()
