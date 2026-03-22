const ts = require("typescript");
const path = require("path");

const configPath = ts.findConfigFile("./", ts.sys.readFile, "tsconfig.json");
if (configPath === undefined) {
  console.log("No tsconfig");
  process.exit(1);
}

const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath));

const fileName = path.join(process.cwd(), "src/lib/api/dashboardApi.ts");
const program = ts.createProgram([fileName], Object.assign({}, parsed.options, { noEmit: true }));
const sourceFile = program.getSourceFile(fileName);

if (sourceFile === undefined) {
  console.log("File not in program:", fileName);
  process.exit(1);
}

const errs = ts.getPreEmitDiagnostics(program).filter(function(d) {
  return d.file !== undefined && d.file.fileName === fileName;
});

errs.forEach(function(d) {
  var pos = sourceFile.getLineAndCharacterOfPosition(d.start || 0);
  console.log(fileName + "(" + (pos.line+1) + "," + (pos.character+1) + "): " + ts.flattenDiagnosticMessageText(d.messageText, "\n"));
});

if (errs.length === 0) {
  console.log("No errors");
}
