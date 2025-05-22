const fs = require('fs');
const path = require('path');

// Path to main.nr
const mainNrPath = path.join(__dirname, '../circuits/src/main.nr');
const mainNrContent = fs.readFileSync(mainNrPath, 'utf8');

// Regex to extract main function signature
const mainFnMatch = mainNrContent.match(/fn\s+main\s*\(([^)]*)\)/s);
if (!mainFnMatch) {
  throw new Error('Could not find main function in main.nr');
}
const paramsString = mainFnMatch[1];

// Parse parameters
const params = paramsString
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .map(param => {
    // Match: name: type
    const match = param.match(/^(\w+):\s*(pub\s*)?([\w\[\];\s<>]+)$/);
    if (!match) return null;
    const [, name, , type] = match;
    return { name, type: type.trim() };
  })
  .filter(Boolean);

// Generate Prover.toml
let proverToml = '';
params.forEach(({ name, type }) => {
  if (type.startsWith('[')) {
    // Array type, e.g. [Field; N]
    proverToml += `${name} = [""]\n`;
  } else if (type.startsWith('Polynomial')) {
    // Polynomial type
    proverToml += `[${name}]\ncoefficients = [""]\n\n`;
  } else {
    // Scalar (Field, pub Field, etc.)
    proverToml += `${name} = ""\n`;
  }
});

// Generate TypeScript interface
let tsInterface = `export interface CircuitInputs {\n`;
params.forEach(({ name, type }) => {
  if (type.startsWith('[')) {
    tsInterface += `  ${name}: string[];\n`;
  } else if (type.startsWith('Polynomial')) {
    tsInterface += `  ${name}: { coefficients: string[] };\n`;
  } else {
    tsInterface += `  ${name}: string;\n`;
  }
});
tsInterface += `}\n`;

// Write Prover.toml
const outputDir = path.join(__dirname, '../web/public/circuits');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'Prover.toml'), proverToml);
console.log('Generated Prover.toml');

// Write circuit-types.ts
fs.writeFileSync(path.join(outputDir, 'circuit-types.ts'), tsInterface);
console.log('Generated circuit-types.ts');