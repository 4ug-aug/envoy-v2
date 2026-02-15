/**
 * Command line execution (sandboxed). Use with care; consider allowlists or disabling in production.
 */

import { spawn } from "node:child_process";

const ALLOW_SHELL = process.env.TOOLS_SHELL_ENABLED === "true";

export type ShellResult = {
  stdout: string;
  stderr: string;
  code: number | null;
};

export async function runCommand(command: string, args: string[] = []): Promise<ShellResult> {
  if (!ALLOW_SHELL) {
    return {
      stdout: "",
      stderr: "Shell tools are disabled. Set TOOLS_SHELL_ENABLED=true to enable.",
      code: 1,
    };
  }

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: true,
      cwd: process.env.TOOLS_FS_ROOT ?? process.cwd(),
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}
