import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, X, Zap, AlertCircle, Loader2 } from 'lucide-react'

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('init') // init | loading | scanning | error
  const [errorMsg, setErrorMsg] = useState('')
  const [lastCode, setLastCode] = useState('')
  const [flash, setFlash] = useState(false)

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset() } catch {}
      readerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleDetected = useCallback((code) => {
    if (!code || code === lastCode) return
    setLastCode(code)
    setFlash(true)
    setTimeout(() => setFlash(false), 500)
    onDetected(code)
  }, [lastCode, onDetected])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    const startScanner = async () => {
      try {
        // Try native BarcodeDetector first (Chrome 83+)
        if ('BarcodeDetector' in window) {
          const formats = await BarcodeDetector.getSupportedFormats?.() || ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
          const detector = new BarcodeDetector({ formats })

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
          })
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            await videoRef.current.play()
          }
          setStatus('scanning')

          const detect = async () => {
            if (cancelled || !videoRef.current) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                handleDetected(barcodes[0].rawValue)
              }
            } catch {}
            if (!cancelled) requestAnimationFrame(detect)
          }
          requestAnimationFrame(detect)
          return
        }

        // Fallback to ZXing
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        if (cancelled) return

        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        const deviceId = devices.find(d => d.label.toLowerCase().includes('back'))?.deviceId
          || devices.find(d => d.label.toLowerCase().includes('environment'))?.deviceId
          || devices[0]?.deviceId

        if (!deviceId && devices.length === 0) {
          throw new Error('No se encontraron cámaras')
        }

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) handleDetected(result.getText())
        })
        if (cancelled) { reader.reset(); return }
        setStatus('scanning')

      } catch (err) {
        if (cancelled) return
        console.error('Scanner error:', err)
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Permiso de cámara denegado. Habilitá el acceso en la configuración del navegador.')
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No se encontró cámara. Conectá una cámara e intentá de nuevo.')
        } else {
          setErrorMsg(`Error al iniciar el escáner: ${err.message || 'Error desconocido'}`)
        }
        setStatus('error')
      }
    }

    startScanner()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [handleDetected, stopCamera])

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <Camera size={20} />
            <span className="font-semibold">Escáner de código de barras</span>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative w-64 h-32 transition-all ${flash ? 'opacity-50' : 'opacity-100'}`}>
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                {/* Scan line */}
                <div className="absolute inset-x-4 h-0.5 bg-green-400 animate-[scan_2s_linear_infinite]"
                  style={{ animation: 'scan 2s ease-in-out infinite', top: '50%' }} />
              </div>
            </div>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Loader2 size={40} className="animate-spin mb-3" />
              <p className="text-sm">Iniciando cámara...</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <AlertCircle size={40} className="text-red-400 mb-3" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Flash */}
          {flash && (
            <div className="absolute inset-0 bg-white/30 pointer-events-none" />
          )}
        </div>

        {/* Status bar */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              status === 'scanning' ? 'bg-green-500 animate-pulse' :
              status === 'loading' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <div className="flex-1">
              {status === 'scanning' && (
                <p className="text-sm text-gray-600">
                  {lastCode ? (
                    <span>Último código: <strong className="text-gray-900">{lastCode}</strong></span>
                  ) : (
                    <span>Apuntá la cámara al código de barras...</span>
                  )}
                </p>
              )}
              {status === 'loading' && <p className="text-sm text-gray-500">Iniciando cámara...</p>}
              {status === 'error' && <p className="text-sm text-red-500">Error de cámara</p>}
            </div>
            <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 20%; }
          50% { top: 80%; }
        }
      `}</style>
    </div>
  )
}
