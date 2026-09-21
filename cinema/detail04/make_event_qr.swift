import Foundation
import CoreImage
import CoreImage.CIFilterBuiltins
import AppKit

let args=CommandLine.arguments
guard args.count==3 else { fatalError("usage: make_event_qr.swift <url> <output.png>") }
let text=args[1], output=args[2]
let filter=CIFilter.qrCodeGenerator()
filter.message=Data(text.utf8)
filter.correctionLevel="H"
guard let base=filter.outputImage else { fatalError("QR generation failed") }
let modules=Int(base.extent.width.rounded())
let quiet=4
let target=1600
let scale=max(1,target/(modules+quiet*2))
let side=(modules+quiet*2)*scale
let s=CGFloat(scale), inset=CGFloat(quiet*scale)
let canvas=CIImage(color:CIColor.white).cropped(to:CGRect(x:0,y:0,width:side,height:side))
let qr=base.transformed(by:CGAffineTransform(scaleX:s,y:s)).transformed(by:CGAffineTransform(translationX:inset,y:inset))
let image=qr.composited(over:canvas)
let context=CIContext()
guard let cg=context.createCGImage(image,from:CGRect(x:0,y:0,width:side,height:side)) else { fatalError("render failed") }
let rep=NSBitmapImageRep(cgImage:cg)
guard let png=rep.representation(using:.png,properties:[:]) else { fatalError("PNG encode failed") }
try png.write(to:URL(fileURLWithPath:output),options:.atomic)
print("QR_URL=\(text)")
print("MODULES=\(modules) QUIET=\(quiet) SCALE=\(scale) SIDE=\(side)")
print("OUTPUT=\(output)")
