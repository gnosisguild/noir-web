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

// Read and parse main.nr
const mainNrPath = path.join(__dirname, '../circuits/src/main.nr');
const mainNrContent = fs.readFileSync(mainNrPath, 'utf8');

// Extract the main function signature
const mainFunctionMatch = mainNrContent.match(/fn main\((.*?)\)/s);
if (!mainFunctionMatch) {
    throw new Error('Could not find main function in main.nr');
}

// Parse the parameters
const paramsString = mainFunctionMatch[1];
const inputParams = paramsString.split(',')
    .map(param => param.trim())
    .map(param => {
        // Match parameter name and type
        const match = param.match(/(\w+):\s*(.*)/);
        if (!match) return null;
        
        const [_, name, type] = match;
        
        // Check if it's an array type
        const arrayMatch = type.match(/\[(.*?);\s*(\d+)\]/);
        if (arrayMatch) {
            return {
                name,
                isArray: true,
                arraySize: parseInt(arrayMatch[2])
            };
        }
        
        return {
            name,
            isArray: false
        };
    })
    .filter(Boolean);

// Now inputParams will be dynamically generated from main.nr
console.log('Parsed input parameters:', inputParams);

// Generate Prover.toml
console.log('Generating Prover.toml...');
const proverTemplate = inputParams.reduce((acc, param) => {
    if (param.isArray) {
        // For arrays, generate multiple entries with empty coefficients
        for (let i = 0; i < param.arraySize; i++) {
            acc += `[[${param.name}]]\ncoefficients = [${Array(1024).fill('""').join(', ')}]\n\n`;
        }
    } else {
        // For scalar values, generate a single entry with empty coefficients
        acc += `[${param.name}]\ncoefficients = [${Array(1024).fill('""').join(', ')}]\n\n`;
    }
    return acc;
}, '');

// Write the template Prover.toml
const proverTemplatePath = path.join(outputDir, 'Prover.toml');
fs.writeFileSync(proverTemplatePath, proverTemplate);
console.log('Generated Prover.toml');

// Generate TypeScript interface
console.log('Generating TypeScript interface...');
const tsInterface = `export interface CircuitInputs {
    [key: string]: string | string[];
${inputParams.map(param => {
    if (param.isArray) {
        return `    ${param.name}: string[];`;
    }
    return `    ${param.name}: string;`;
}).join('\n')}
}`;

fs.writeFileSync(
    path.join(outputDir, 'circuit-types.ts'),
    tsInterface
);
console.log('Generated circuit-types.ts');

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

console.log('Done! Circuits have been compiled and copied to web/public/circuits/');