import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const workspaces: string[] = [];
const script = resolve(__dirname, "../../benchmark/report.mjs");
const createWorkspace = () => {
  const workspace = mkdtempSync(join(tmpdir(), "cache-benchmark-report-"));
  workspaces.push(workspace);
  return workspace;
};
const result = (median: number, p99?: number, rme?: number, name = "cache hit") => ({
  files: [
    {
      groups: [
        {
          fullName: "benchmark/cache.bench.ts > middleware",
          benchmarks: [{ name, median, p99, rme }],
        },
      ],
    },
  ],
});
const writeRun = (workspace: string, path: string, data: unknown) => {
  writeFileSync(join(workspace, path), JSON.stringify(data));
};
const runReport = (workspace: string, base: string, candidate: string, output = "report.md") =>
  spawnSync(process.execPath, [script, base, candidate, output], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, GITHUB_STEP_SUMMARY: "" },
  });

afterEach(() => {
  for (const workspace of workspaces.splice(0)) rmSync(workspace, { recursive: true, force: true });
});

describe("benchmark report", () => {
  it("aggregates repeated runs and reports tail latency, worst RME and run spread", () => {
    const workspace = createWorkspace();
    for (const revision of ["base", "candidate"]) mkdirSync(join(workspace, revision));
    writeRun(workspace, "base/round-1.json", result(1, 10, 5));
    writeRun(workspace, "base/round-2.json", result(3, 30, 9));
    writeRun(workspace, "candidate/round-1.json", result(1, 7, 2));
    writeRun(workspace, "candidate/round-2.json", result(1, 9, 4));
    const report = runReport(workspace, "base", "candidate");
    expect(report.status, report.stderr).toBe(0);
    const markdown = readFileSync(join(workspace, "report.md"), "utf8");
    expect(markdown).toContain("2 run(s) per revision");
    expect(markdown).toContain(
      "| middleware: cache hit | 2.00 ms | 1.00 ms | -50.0% | 20.00 ms | 8.00 ms | 9.00% / 4.00% | 100.00% / 0.00% | 🟢 faster |",
    );
  });

  it("accepts single-run files and missing p99/RME without inventing values", () => {
    const workspace = createWorkspace();
    writeRun(workspace, "base.json", result(0.001));
    writeRun(workspace, "candidate.json", result(0.001));
    const report = runReport(workspace, "base.json", "candidate.json");
    expect(report.status, report.stderr).toBe(0);
    expect(report.stdout).toContain("| — | — | — / — |");
    expect(report.stdout).toContain("1 run(s) per revision");
  });

  it("marks newly added or removed cases unavailable instead of stable", () => {
    const workspace = createWorkspace();
    writeRun(workspace, "base.json", result(1, 2, 1, "old case"));
    writeRun(workspace, "candidate.json", result(1, 2, 1, "new case"));
    const report = runReport(workspace, "base.json", "candidate.json");
    expect(report.status, report.stderr).toBe(0);
    expect(report.stdout).toContain("0 stable");
    expect(report.stdout).toContain("2 unavailable");
  });

  it("rejects missing cases within repeated runs", () => {
    const workspace = createWorkspace();
    mkdirSync(join(workspace, "base"));
    writeRun(workspace, "base/round-1.json", result(1));
    writeRun(workspace, "base/round-2.json", result(1, 2, 1, "different case"));
    writeRun(workspace, "candidate.json", result(1));
    const report = runReport(workspace, "base", "candidate.json");
    expect(report.status).not.toBe(0);
    expect(report.stderr).toContain("Missing benchmark");
  });

  it("rejects empty result directories and unequal run counts", () => {
    const workspace = createWorkspace();
    mkdirSync(join(workspace, "base"));
    writeRun(workspace, "candidate.json", result(1));
    expect(runReport(workspace, "base", "candidate.json").stderr).toContain("No benchmark results");
    writeRun(workspace, "base/round-1.json", result(1));
    writeRun(workspace, "base/round-2.json", result(1));
    expect(runReport(workspace, "base", "candidate.json").stderr).toContain("same number of runs");
  });

  it("rejects output paths outside the workspace", () => {
    const workspace = createWorkspace();
    writeRun(workspace, "base.json", result(1));
    writeRun(workspace, "candidate.json", result(1));
    expect(runReport(workspace, "base.json", "candidate.json", "../report.md").stderr).toContain(
      "must stay inside the workspace",
    );
  });
});
