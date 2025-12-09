const fs = require("fs");
const path = require("path");

const reportPath = path.join(
  __dirname,
  "jscpd-report.json",
  "jscpd-report.json"
);

try {
  const data = fs.readFileSync(reportPath, "utf8");
  const report = JSON.parse(data);
  const duplicates = report.duplicates;

  let output = `Found ${duplicates.length} duplicates.\n`;
  output += "| Index | File 1 | Lines | File 2 | Lines | Size (lines) |\n";
  output += "|---|---|---|---|---|---|\n";

  // Sort by number of lines descending
  duplicates.sort((a, b) => b.lines - a.lines);

  duplicates.forEach((dup, index) => {
    // Relative paths usually provided or absolute
    const name1 = dup.firstFile.name;
    const range1 = `${dup.firstFile.start}-${dup.firstFile.end}`;
    const name2 = dup.secondFile.name;
    const range2 = `${dup.secondFile.start}-${dup.secondFile.end}`;

    output += `| ${index + 1} | ${name1} | ${range1} | ${name2} | ${range2} | ${
      dup.lines
    } |\n`;
  });

  output += "\nTop 5 Candidates for Refactoring:\n";
  duplicates.slice(0, 5).forEach((dup, i) => {
    output += `${i + 1}. ${dup.firstFile.name} & ${dup.secondFile.name} (${
      dup.lines
    } lines)\n`;
    // Simple heuristic name proposal
    const commonName = "sharedLogic" + (i + 1);
    output += `   Suggestion: Extract to src/shared/${commonName}.ts\n`;
  });

  fs.writeFileSync(path.join(__dirname, "dupes_summary.txt"), output, "utf8");
} catch (e) {
  console.error("Error parsing report:", e);
}
