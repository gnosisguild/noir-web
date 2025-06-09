const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clean up previous build artifacts
const targetDir = path.join(__dirname, '../circuits/target');
const outputDir = path.join(__dirname, '../web/public/circuits');

console.log('Cleaning up previous build artifacts...');
[targetDir, outputDir].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Deleted ${dir}`);
  }
});

// Path to main.nr and Noir source directory
const mainNrPath = path.join(__dirname, '../circuits/src/main.nr');
const noirSrcDir = path.join(__dirname, '../circuits/src');
const mainNrContent = fs.readFileSync(mainNrPath, 'utf8');

console.log("Reading main.nr circuit...");

// Helper: get all .nr files in circuits/src
function getNoirFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.nr'))
    .map(f => path.join(dir, f));
}

// Helper: extract first public field name from a struct definition
function getStructFieldName(typeName) {
  const files = getNoirFiles(noirSrcDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Find struct definition
    const structMatch = content.match(new RegExp(`struct\\s+${typeName}.*?{([\\s\\S]*?)}`));
    if (structMatch) {
      // Find first public field
      const fieldMatch = structMatch[1].match(/pub\s+(\w+)\s*:/);
      if (fieldMatch) {
        return fieldMatch[1];
      }
    }
  }
  // Default fallback
  return 'coefficients';
}

// Regex to extract main function signature (robust for multiline)
const mainFnMatch = mainNrContent.match(/fn\s+main\s*\(([\s\S]*?)\)\s*{/);
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
    const match = param.match(/^(\w+):\s*(pub\s*)?([\w\[\];\s<>()*+-]+)$/);
    if (!match) return null;
    const [, name, , type] = match;
    return { name, type: type.trim() };
  })
  .filter(Boolean);

// Helper: get struct type name from type string
function extractStructType(type) {
  // e.g. Polynomial<N> or [Polynomial<N>; L]
  const m = type.match(/([A-Za-z0-9_]+)<.*?>/);
  if (m) return m[1];
  return null;
}

// Generate Prover.toml
let proverToml = '';
params.forEach(({ name, type }) => {
  const structType = extractStructType(type);
  let fieldName = 'coefficients';
  if (structType) {
    fieldName = getStructFieldName(structType);
  }
  // Array of custom struct: [Type<...>; ...]
  if (type.match(/^\[[A-Za-z0-9_]+<.*?>;.*\]$/)) {
    proverToml += `[[${name}]]\n${fieldName} = [""]\n\n`;
  }
  // Array of Field: [Field; ...]
  else if (type.match(/^\[Field;.*\]$/)) {
    proverToml += `${name} = [""]\n`;
  }
  // Single custom struct: Type<...>
  else if (structType) {
    proverToml += `[${name}]\n${fieldName} = [""]\n\n`;
  }
  // Scalar (Field, pub Field, etc.)
  else {
    proverToml += `${name} = ""\n`;
  }
});

// Generate TypeScript interface
let tsInterface = `export interface CircuitInputs {\n`;
params.forEach(({ name, type }) => {
  const structType = extractStructType(type);
  let fieldName = 'coefficients';
  if (structType) {
    fieldName = getStructFieldName(structType);
  }
  // Array of custom struct: [Type<...>; ...]
  if (type.match(/^\[[A-Za-z0-9_]+<.*?>;.*\]$/)) {
    tsInterface += `  ${name}: { ${fieldName}: string[] }[];\n`;
  }
  // Array of Field: [Field; ...]
  else if (type.match(/^\[Field;.*\]$/)) {
    tsInterface += `  ${name}: string[];\n`;
  }
  // Single custom struct: Type<...>
  else if (structType) {
    tsInterface += `  ${name}: { ${fieldName}: string[] };\n`;
  }
  // Scalar (Field, pub Field, etc.)
  else {
    tsInterface += `  ${name}: string;\n`;
  }
});
tsInterface += `}\n`;

// Write Prover.toml
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'Prover.toml'), proverToml);
console.log('Generated Prover.toml');

// Write circuit-types.ts
fs.writeFileSync(path.join(outputDir, 'circuit-types.ts'), tsInterface);
console.log('Generated circuit-types.ts');

// Run nargo compile
console.log('Running nargo compile...');
try {
  execSync('nargo compile', { cwd: path.join(__dirname, '../circuits'), stdio: 'inherit' });
  console.log('nargo compile completed.');
} catch (e) {
  console.error('nargo compile failed:', e.message);
  process.exit(1);
}

// Copy compiled circuit files to public/circuits
const files = fs.readdirSync(targetDir);
files.forEach(file => {
  if (file.endsWith('.json')) {
    fs.copyFileSync(
      path.join(targetDir, file),
      path.join(outputDir, file)
    );
    console.log(`Copied ${file} to web/public/circuits/`);
  }
});

console.log('Setup complete!');