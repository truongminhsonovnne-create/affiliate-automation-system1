const ts = require("typescript");
const path = require("path");
const configPath = ts.findConfigFile("./", ts.sys.readFile, "tsconfig.json");
if (\!configPath) { console.log("No tsconfig"); process.exit(1); }
const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath));
const fileName = path.join(__dirname, "src/lib/api/dashboardApi.ts");
const program = ts.createProgram([fileName], { ...parsed.options, noEmit: true });
const sourceFile = program.getSourceFile(fileName);
if (\!sourceFile) { console.log("File not in program"); process.exit(1); }
const errs = ts.getPreEmitDiagnostics(program).filter(d => d.file && d.file.fileName === fileName);
errs.forEach(d => {
  const pos = sourceFile.getLineAndCharacterOfPosition(d.start || 0);
  console.log(fileName + "(" + (pos.line+1) + "," + (pos.character+1) + "): " + ts.flattenDiagnosticMessageText(d.messageText, "
"));
});
if (\!errs.length) console.log("No errors");
