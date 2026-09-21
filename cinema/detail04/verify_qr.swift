import Foundation
import AppKit
import Vision

let paths=Array(CommandLine.arguments.dropFirst())
if paths.isEmpty { fatalError("usage: verify_qr.swift <image> [...]") }
var failed=false
for path in paths {
 guard let image=NSImage(contentsOfFile:path) else { print("FAIL \(path) unreadable"); failed=true; continue }
 var rect=NSRect(origin:.zero,size:image.size)
 guard let cg=image.cgImage(forProposedRect:&rect,context:nil,hints:nil) else { print("FAIL \(path) no CGImage"); failed=true; continue }
 let request=VNDetectBarcodesRequest()
 request.symbologies=[.qr]
 do { try VNImageRequestHandler(cgImage:cg,options:[:]).perform([request]) }
 catch { print("FAIL \(path) vision_error=\(error)"); failed=true; continue }
 let values=(request.results ?? []).compactMap{$0.payloadStringValue}
 if let value=values.first { print("PASS \(path) => \(value)") }
 else { print("FAIL \(path) no_qr"); failed=true }
}
if failed { exit(1) }
