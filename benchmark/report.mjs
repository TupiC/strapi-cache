import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const [, , basePath, candidatePath, outputPath = 'performance-report.md'] = process.argv;

if (!basePath || !candidatePath) {
  console.error(
    'Usage: node benchmark/report.mjs <base-results.json> <candidate-results.json> [report.md]'
  );
  process.exit(1);
}

const loadBenchmarks = (path) => {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const benchmarks = new Map();

  for (const file of report.files ?? []) {
    for (const group of file.groups ?? []) {
      const groupName = group.fullName?.split(' > ').slice(1).join(' > ') || 'benchmarks';

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

const escapeMarkdown = (value) => String(value).replaceAll('|', '\\|');

const formatLatency = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return '—';
  if (milliseconds >= 1) return `${milliseconds.toFixed(2)} ms`;
  if (milliseconds >= 0.001) return `${(milliseconds * 1_000).toFixed(2)} µs`;
  return `${(milliseconds * 1_000_000).toFixed(1)} ns`;
};

const formatChange = (change) => {
  if (!Number.isFinite(change)) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

const classify = (change) => {
  if (!Number.isFinite(change)) return '⚪ unavailable';
  if (change <= -5) return '🟢 faster';
  if (change >= 10) return '🟠 slower';
  return '⚪ stable';
};

const base = loadBenchmarks(basePath);
const candidate = loadBenchmarks(candidatePath);
const keys = [...new Set([...base.keys(), ...candidate.keys()])].sort((left, right) =>
  left.localeCompare(right)
);

let faster = 0;
let slower = 0;
let stable = 0;

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

  if (status.includes('faster')) faster += 1;
  else if (status.includes('slower')) slower += 1;
  else stable += 1;

  return `| ${escapeMarkdown(candidateBenchmark?.displayName ?? baseBenchmark?.displayName ?? key)} | ${formatLatency(baseMedian)} | ${formatLatency(candidateMedian)} | ${formatChange(change)} | ${candidateBenchmark ? `±${candidateBenchmark.rme.toFixed(2)}%` : '—'} | ${status} |`;
});

const markdown = [
  '## Cache performance report',
  '',
  'Lower median latency is better. Results are informational while the benchmark baseline settles.',
  '',
  '| Benchmark | Base median | Candidate median | Change | Candidate RME | Result |',
  '|---|---:|---:|---:|---:|:---|',
  ...rows,
  '',
  `**Summary:** ${faster} faster · ${stable} stable · ${slower} slower`,
  '',
  '_Classification: at least 5% faster is green; at least 10% slower is orange. Hosted-runner variance can exceed these thresholds, so this job does not fail on timing changes._',
  '',
].join('\n');

writeFileSync(outputPath, markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

process.stdout.write(markdown);
