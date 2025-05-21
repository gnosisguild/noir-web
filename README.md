# Noir Web

A web interface for compiling, proving, and verifying Noir circuits. This project provides a simple way to interact with Noir circuits through a modern web interface.

## Features

- Dynamic circuit compilation
- Web-based proof generation and verification
- Real-time terminal-like feedback
- Support for custom circuits
- Automatic type generation for circuit inputs

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- nargo (Noir package manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/gnosisguild/noir-web.git
cd noir-web
```

2. Install dependencies:
```bash
cd web && pnpm install
```

## Usage

1. Edit your circuit in `circuits/src/main.nr`
2. Run the following command:
```bash
pnpm run do
```
3. Edit the inputs in `web/public/circuits/Prover.toml`
4. Use the web interface running under `localhost:3000` to generate and verify proofs

## Project Structure

```
noir-web/
├── circuits/          # Noir circuit source files
│   ├── src/
│   │   └── main.nr    # Your circuit code
│   └── Nargo.toml     # Circuit configuration
├── web/               # Next.js web application
│   ├── public/
│   │   └── circuits/  # Compiled circuits and assets
│   └── src/           # Web application source
└── scripts/           # Build and setup scripts
```

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm setup` - Compile circuits and generate assets
- `pnpm do` - Execute `setup` and `dev` sequentially.

## License

GNU LESSER GENERAL PUBLIC LICENSE V3