const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the output directory exists
const outputDir = path.join(__dirname, '../web/public/circuits');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Run nargo check
console.log('Running nargo check...');
try {
    execSync('nargo check', { cwd: path.join(__dirname, '../circuits') });
    console.log('nargo check completed successfully');
} catch (error) {
    console.error('Error running nargo check:', error.message);
    process.exit(1);
}

// Compile the circuits
console.log('Compiling Noir circuits...');
try {
    execSync('nargo compile', { cwd: path.join(__dirname, '../circuits') });
    console.log('Circuits compiled successfully');
} catch (error) {
    console.error('Error compiling circuits:', error.message);
    process.exit(1);
}

// Read and parse the circuit source to understand input structure
const circuitSource = fs.readFileSync(
    path.join(__dirname, '../circuits/src/main.nr'),
    'utf8'
);

// Extract input parameters from the circuit
const inputParams = [];
const mainFnMatch = circuitSource.match(/fn main\((.*?)\)/);
if (mainFnMatch) {
    const params = mainFnMatch[1].split(',').map(p => p.trim());
    params.forEach(param => {
        const [name, type] = param.split(':').map(p => p.trim());
        const isPublic = type.includes('pub');
        inputParams.push({ name, isPublic });
    });
}

// Generate a template Prover.toml with all inputs
const proverTemplate = inputParams.reduce((acc, param) => {
    acc += `${param.name} = "0"\n`;
    return acc;
}, '');

// Write the template Prover.toml
const proverTemplatePath = path.join(outputDir, 'Prover.toml');
fs.writeFileSync(proverTemplatePath, proverTemplate);
console.log('Generated template Prover.toml');

// Copy the compiled circuits to the web/public directory
const circuitsDir = path.join(__dirname, '../circuits/target');
const files = fs.readdirSync(circuitsDir);

files.forEach(file => {
    if (file.endsWith('.json')) {
        const sourcePath = path.join(circuitsDir, file);
        const destPath = path.join(outputDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${file} to web/public/circuits/`);
    }
});

// Generate a TypeScript interface for the circuit inputs
const tsInterface = `export interface CircuitInputs {
    [key: string]: string;
${inputParams.map(param => `    ${param.name}: string;`).join('\n')}
}`;
fs.writeFileSync(
    path.join(outputDir, 'circuit-types.ts'),
    tsInterface
);
console.log('Generated circuit-types.ts');

console.log('Done! Circuits have been compiled and copied to web/public/circuits/');