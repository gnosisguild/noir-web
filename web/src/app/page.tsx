"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import circuit from "../../public/circuits/noir_circuits.json";
import { CircuitInputs } from "../../public/circuits/circuit-types";
import TOML from '@iarna/toml';

let currentProof: Uint8Array | null = null;
let currentPublicInputs: any = null;

const fakeLogs = [
  { text: "[system] Noir Web Terminal v0.1.0", color: "text-gray-400" },
  { text: "[info] Ready for proof generation...", color: "text-gray-500" },
  { text: "[warn] Privacy mode enabled", color: "text-gray-600" },
  { text: "[user] To use your own circuit:", color: "text-gray-700" },
  { text: "1. Edit circuits/src/main.nr", color: "text-gray-700" },
  { text: "2. Run: pnpm run do", color: "text-gray-700" },
  { text: "3. Edit web/public/circuits/Prover.toml", color: "text-gray-700" },
  { text: "4. Click 'Generate Proof'", color: "text-gray-700" },
];

export default function Home() {
  const [logs, setLogs] = useState(fakeLogs);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, color: string) => {
    setLogs((prev) => [...prev, { text, color }]);
  };

  const handleProve = async () => {
    setProofGenerated(false);
    setLoading(true);
    try {
      const noir = new Noir(circuit as any);
      const honk = new UltraHonkBackend((circuit as any).bytecode, {
        threads: 4,
      });

      const response = await fetch('/circuits/Prover.toml')
      const tomlText = await response.text()
      const parsedToml = TOML.parse(tomlText)

      function flattenInputs(parsedToml: any) {
        const result: any = {};
        for (const key in parsedToml) {
          const value = parsedToml[key];
          if (Array.isArray(value)) {
            if (
              value.length > 0 &&
              value[0] &&
              typeof value[0] === "object" &&
              Object.keys(value[0]).length === 1 &&
              Array.isArray(Object.values(value[0])[0])
            ) {
              const propName = Object.keys(value[0])[0];
              result[key] = value.map((item: any) => ({
                [propName]: item[propName].map(String),
              }));
            } else {
              result[key] = value.map(String);
            }
          } else if (
            value &&
            typeof value === "object" &&
            Object.keys(value).length === 1 &&
            Array.isArray(Object.values(value)[0])
          ) {
            const propName = Object.keys(value)[0];
            result[key] = { [propName]: value[propName].map(String) };
          } else if (typeof value === "string" || typeof value === "number") {
            result[key] = String(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      const circuitInputs = flattenInputs(parsedToml);

      addLog(`[prove] Generating witness with inputs: ${JSON.stringify(circuitInputs)}`, "text-gray-500")
      const witnessStart = performance.now()
      const { witness } = await noir.execute(circuitInputs)
      const witnessEnd = performance.now()
      addLog(
        `[prove] Witness generated! (${(witnessEnd - witnessStart).toFixed(
          0
        )}ms)`,
        "text-green-500"
      );

      addLog("[prove] Generating proof...", "text-gray-500");
      const proofStart = performance.now();
      const result = await honk.generateProof(witness, { keccak: true });
      const proofEnd = performance.now();
      addLog(
        `[prove] Proof generated! (${(proofEnd - proofStart).toFixed(0)}ms)`,
        "text-green-500"
      );
      currentProof = result.proof;
      currentPublicInputs = result.publicInputs;
      setProofGenerated(true);
    } catch (error: any) {
      addLog(`[error] ${error?.message || "Unknown error"}`, "text-red-500");
      setProofGenerated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      if (!currentProof || !currentPublicInputs) {
        addLog("[error] Please generate a proof first", "text-red-500");
        return;
      }
      const honk = new UltraHonkBackend((circuit as any).bytecode, {
        threads: 4,
      });
      const proofData = {
        proof: currentProof,
        publicInputs: currentPublicInputs,
      };
      addLog("[verify] Verifying proof...", "text-gray-500");
      const verifyStart = performance.now();
      const isValid = await honk.verifyProof(proofData, { keccak: true });
      const verifyEnd = performance.now();
      if (isValid) {
        addLog(
          `[verify] Proof verified! (${(verifyEnd - verifyStart).toFixed(
            0
          )}ms)`,
          "text-green-500"
        );
      } else {
        addLog(
          `[verify] Proof verification failed! (${(
            verifyEnd - verifyStart
          ).toFixed(0)}ms)`,
          "text-red-500"
        );
      }
    } catch (error: any) {
      addLog(`[error] ${error?.message || "Unknown error"}`, "text-red-500");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white font-mono text-black">
      {/* Left panel */}
      <div className="flex flex-col justify-center items-start w-full max-w-md p-12 gap-8 bg-black border-r border-gray-200 shadow-2xl">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
          Noir Web
        </h1>
        <div className="flex flex-col gap-4 w-full">
          <Button
            size="lg"
            className="w-full bg-white hover:bg-gray-100 border border-black text-black font-bold shadow-sm transition-all duration-150"
            onClick={handleProve}
            disabled={loading}
          >
            Generate Proof
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`w-full border border-white font-bold shadow-sm transition-all duration-150 
              ${
                !proofGenerated
                  ? "bg-gray-300 text-black opacity-100 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100 hover:text-black"
              }`}
            onClick={handleVerify}
            disabled={!proofGenerated || loading}
          >
            Verify Proof
          </Button>
        </div>
      </div>
      {/* Terminal log panel */}
      <div className="flex-1 flex flex-col h-full p-8 overflow-hidden">
        <div
          className="bg-black rounded-lg h-full w-full p-6 overflow-y-auto border border-gray-200 shadow-inner"
          ref={logRef}
          style={{ fontSize: "1rem", lineHeight: "1.6" }}
        >
          {logs.map((log, i) => (
            <div key={i} className={log.color + " whitespace-pre-wrap"}>
              {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}