import { appendFileSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const [, , basePath, candidatePath, outputPath = "performance-report.md"] = process.argv;

if (!basePath || !candidatePath) {
  console.error(
    "Usage: node benchmark/report.mjs <base-results.json> <candidate-results.json> [report.md]",
  );
  process.exit(1);
}

const workspaceRoot = resolve(process.cwd());

const resolveWorkspacePath = (input, label) => {
  if (typeof input !== "string" || input.length === 0 || isAbsolute(input)) {
    throw new Error(`${label} must be a relative path inside the workspace`);
  }

  const resolvedPath = resolve(workspaceRoot, input);
  const relativePath = relative(workspaceRoot, resolvedPath);

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`${label} must stay inside the workspace`);
  }

  return resolvedPath;
};

const baseResultsPath = resolveWorkspacePath(basePath, "Base results path");
const candidateResultsPath = resolveWorkspacePath(candidatePath, "Candidate results path");
const reportOutputPath = resolveWorkspacePath(outputPath, "Report output path");

const loadRun = (filePath) => {
  const report = JSON.parse(readFileSync(filePath, "utf8"));
  const benchmarks = new Map();

  for (const file of report.files ?? []) {
    for (const group of file.groups ?? []) {
      const groupName = group.fullName?.split(" > ").slice(1).join(" > ") || "benchmarks";

      for (const benchmark of group.benchmarks ?? []) {
        const key = `${groupName}::${benchmark.name}`;
        benchmarks.set(key, {
          ...benchmark,
          displayName: benchmark.name,
          groupName,
        });
      }
    }
  }

  return benchmarks;
};

const median = (values) => {
  if (!values.every(Number.isFinite)) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return Number.NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const loadBenchmarks = (inputPath) => {
  const paths = statSync(inputPath).isDirectory()
    ? readdirSync(inputPath)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => resolve(inputPath, name))
    : [inputPath];
  if (!paths.length) throw new Error(`No benchmark results in ${inputPath}`);
  const runs = paths.map(loadRun);
  const keys = new Set(runs.flatMap((run) => [...run.keys()]));
  if (!keys.size) throw new Error(`No benchmarks in ${inputPath}`);
  const benchmarks = new Map();
  for (const key of keys) {
    const entries = runs.map((run) => run.get(key));
    if (entries.some((entry) => !entry))
      throw new Error(`Missing benchmark ${key} in a repeated run`);
    const medians = entries.map((entry) => entry.median);
    const aggregateMedian = median(medians);
    const rmes = entries.map((entry) => entry.rme).filter(Number.isFinite);
    benchmarks.set(key, {
      ...entries[0],
      median: aggregateMedian,
      p99: median(entries.map((entry) => entry.p99)),
      rme: rmes.length ? Math.max(...rmes) : Number.NaN,
      spread:
        medians.every(Number.isFinite) && aggregateMedian > 0
          ? ((Math.max(...medians) - Math.min(...medians)) / aggregateMedian) * 100
          : Number.NaN,
    });
  }
  return { benchmarks, runCount: runs.length };
};

const escapeMarkdown = (value) => String(value).replaceAll("|", "\\|");

const formatLatency = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return "—";
  if (milliseconds >= 1) return `${milliseconds.toFixed(2)} ms`;
  if (milliseconds >= 0.001) return `${(milliseconds * 1_000).toFixed(2)} µs`;
  return `${(milliseconds * 1_000_000).toFixed(1)} ns`;
};

const formatChange = (change) => {
  if (!Number.isFinite(change)) return "—";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};

const classify = (change) => {
  if (!Number.isFinite(change)) return "⚪ unavailable";
  if (change <= -5) return "🟢 faster";
  if (change >= 10) return "🟠 slower";
  return "⚪ stable";
};

const baseResults = loadBenchmarks(baseResultsPath);
const candidateResults = loadBenchmarks(candidateResultsPath);
if (baseResults.runCount !== candidateResults.runCount)
  throw new Error("Baseline and candidate must have the same number of runs");
const base = baseResults.benchmarks;
const candidate = candidateResults.benchmarks;
const keys = [...new Set([...base.keys(), ...candidate.keys()])].sort((left, right) =>
  left.localeCompare(right),
);

let faster = 0;
let slower = 0;
let stable = 0;
let unavailable = 0;

const formatPercent = (value) => (Number.isFinite(value) ? `${value.toFixed(2)}%` : "—");

const rows = keys.map((key) => {
  const baseBenchmark = base.get(key);
  const candidateBenchmark = candidate.get(key);
  const baseMedian = baseBenchmark?.median;
  const candidateMedian = candidateBenchmark?.median;
  const change =
    Number.isFinite(baseMedian) && baseMedian > 0 && Number.isFinite(candidateMedian)
      ? ((candidateMedian - baseMedian) / baseMedian) * 100
      : Number.NaN;
  const status = classify(change);

  if (status.includes("faster")) faster += 1;
  else if (status.includes("slower")) slower += 1;
  else if (status.includes("unavailable")) unavailable += 1;
  else stable += 1;

  const benchmark = candidateBenchmark ?? baseBenchmark;
  return `| ${escapeMarkdown(`${benchmark.groupName}: ${benchmark.displayName}`)} | ${formatLatency(baseMedian)} | ${formatLatency(candidateMedian)} | ${formatChange(change)} | ${formatLatency(baseBenchmark?.p99)} | ${formatLatency(candidateBenchmark?.p99)} | ${formatPercent(baseBenchmark?.rme)} / ${formatPercent(candidateBenchmark?.rme)} | ${formatPercent(baseBenchmark?.spread)} / ${formatPercent(candidateBenchmark?.spread)} | ${status} |`;
});

const markdown = [
  "## Cache performance report",
  "",
  `Lower latency is better. ${baseResults.runCount} run(s) per revision; medians and p99 values are the median of each run’s statistic. Results are informational.`,
  "",
  "RME is the worst per-run relative margin of error of the mean, not a confidence interval for the median or p99. Run spread is (maximum median − minimum median) / aggregate median. Pairs below are baseline / candidate.",
  "",
  "Middleware cases execute the real middleware and memory provider with Koa contexts, CORS, and JSON responses; request fixture creation, HTTP transport, and database/controller work are excluded from timing. Concurrent Redis latency measures completion of the entire eight-operation batch.",
  "",
  "| Benchmark | Base median | Candidate median | Change | Base p99 | Candidate p99 | RME (B / C) | Run spread (B / C) | Result |",
  "|---|---:|---:|---:|---:|---:|---:|---:|:---|",
  ...rows,
  "",
  `**Summary:** ${faster} faster · ${stable} stable · ${slower} slower · ${unavailable} unavailable`,
  "",
  "_Classification uses median changes: at least 5% faster is green; at least 10% slower is orange. These labels do not imply statistical significance. CI runs base → candidate, then candidate → base with at least 2 s and 1,000 samples after 500 ms warmup per case. Hosted-runner variance can exceed the thresholds, so this job does not fail on timing changes._",
  "",
].join("\n");

writeFileSync(reportOutputPath, markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

process.stdout.write(markdown);
