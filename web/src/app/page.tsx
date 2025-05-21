"use client"
import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

const fakeLogs = [
  { text: "[system] Noir Web Terminal v0.1.0", color: "text-gray-400" },
  { text: "[info] Ready for proof generation...", color: "text-gray-500" },
  { text: "[warn] Privacy mode enabled", color: "text-gray-600" },
  { text: "[user] Awaiting input...", color: "text-gray-700" },
]

export default function Home() {
  const [logs, setLogs] = useState(fakeLogs)
  const [proofGenerated, setProofGenerated] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (text: string, color: string) => {
    setLogs((prev) => [...prev, { text, color }])
  }

  const handleProve = async () => {
    setProofGenerated(false)
    const witnessStart = performance.now()
    addLog("[prove] Generating witness...", "text-gray-500")
    await new Promise(res => setTimeout(res, 700))
    const witnessEnd = performance.now()
    addLog(
      `[prove] Witness generated! (${(witnessEnd - witnessStart).toFixed(0)}ms)`,
      "text-green-500"
    )

    const proofStart = performance.now()
    addLog("[prove] Generating proof...", "text-gray-500")
    await new Promise(res => setTimeout(res, 900))
    const proofEnd = performance.now()
    addLog(
      `[prove] Proof generated! (${(proofEnd - proofStart).toFixed(0)}ms)`,
      "text-green-500"
    )
    setProofGenerated(true)
  }

  const handleVerify = async () => {
    const verifyStart = performance.now()
    addLog("[verify] Verifying proof...", "text-gray-500")
    await new Promise(res => setTimeout(res, 800))
    const verifyEnd = performance.now()
    addLog(
      `[verify] Proof verified! (${(verifyEnd - verifyStart).toFixed(0)}ms)`,
      "text-green-500"
    )
  }

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
          >
            Generate Proof
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`w-full border border-white font-bold shadow-sm transition-all duration-150 
              ${!proofGenerated ? 'bg-gray-300 text-black opacity-100 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-100 hover:text-black'}`}
            onClick={handleVerify}
            disabled={!proofGenerated}
          >
            Verify Proof
          </Button>
        </div>
      </div>
      {/* Terminal log panel */}
      <div className="flex-1 flex flex-col h-full p-8 overflow-hidden">
        <div className="bg-black rounded-lg h-full w-full p-6 overflow-y-auto border border-gray-200 shadow-inner" ref={logRef} style={{fontSize: '1rem', lineHeight: '1.6'}}>
          {logs.map((log, i) => (
            <div key={i} className={log.color + " whitespace-pre-wrap"}>{log.text}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
