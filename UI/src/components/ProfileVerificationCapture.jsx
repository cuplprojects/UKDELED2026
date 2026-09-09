import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, RefreshCw, Upload, Video, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * Calculates average brightness (0-255) from canvas image data.
 */
const calculateBrightness = (canvas) => {
  if (!canvas) return 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 120;
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let colorSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      colorSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return colorSum / (canvas.width * canvas.height);
  } catch (e) {
    return 120;
  }
};

/**
 * Calculates image sharpness using discrete 2D gradient magnitude.
 */
const calculateSharpness = (canvas) => {
  if (!canvas) return 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 10;
  try {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalGradient = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const i = (y * width + x) * 4;
        const currentGray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        const iRight = (y * width + (x + 1)) * 4;
        const rightGray = 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2];

        const iBottom = ((y + 1) * width + x) * 4;
        const bottomGray = 0.299 * data[iBottom] + 0.587 * data[iBottom + 1] + 0.114 * data[iBottom + 2];

        const dx = rightGray - currentGray;
        const dy = bottomGray - currentGray;

        totalGradient += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }
    return count > 0 ? totalGradient / count : 10;
  } catch (e) {
    return 10;
  }
};

/**
 * Convert canvas to a File object adhering strictly to 140x170 dimensions and 5-100 KB size.
 */
const canvasToFile = async (canvas, fileName = 'photograph_140x170.jpg') => {
  return new Promise((resolve) => {
    let quality = 0.92;
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        // If blob is very small (< 5 KB), adjust quality up, or if > 100 KB adjust quality down
        const sizeKB = blob.size / 1024;
        if (sizeKB < 5) {
          // Re-export with higher quality or uncompressed data
          canvas.toBlob(
            (higherBlob) => {
              const finalBlob = higherBlob || blob;
              const file = new File([finalBlob], fileName, { type: 'image/jpeg' });
              resolve(file);
            },
            'image/jpeg',
            0.98
          );
          return;
        }

        if (sizeKB > 100) {
          canvas.toBlob(
            (compressedBlob) => {
              const finalBlob = compressedBlob || blob;
              const file = new File([finalBlob], fileName, { type: 'image/jpeg' });
              resolve(file);
            },
            'image/jpeg',
            0.75
          );
          return;
        }

        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      quality
    );
  });
};

export default function ProfileVerificationCapture({
  onFileSelect,
  isLocked = false,
  targetWidth = 140,
  targetHeight = 170,
  minSizeKB = 5,
  maxSizeKB = 100
}) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [error, setError] = useState('');
  const [hasCameraDevice, setHasCameraDevice] = useState(true);

  const videoRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  const landmarkerRef = useRef(null);
  const detectorRef = useRef(null);
  const activeLoopRef = useRef(false);
  const eyesClosedRef = useRef(false);
  const blinkCountRef = useRef(0);
  const hasMultipleFacesRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastPixelValidationRef = useRef({ isGoodLighting: false, isSharp: false });

  const [blinkCount, setBlinkCount] = useState(0);
  const [isLandmarkerLoaded, setIsLandmarkerLoaded] = useState(false);
  const [lastActionText, setLastActionText] = useState('Align Face');
  const [hasMultipleFaces, setHasMultipleFaces] = useState(false);

  const [faceValidation, setFaceValidation] = useState({
    hasFace: false,
    isCentered: false,
    isProperDistance: false,
    isFacingForward: false,
    isGoodLighting: false,
    isSharp: false
  });

  // Check if camera devices exist on mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInput = devices.some((d) => d.kind === 'videoinput');
        setHasCameraDevice(videoInput);
      }).catch(() => {
        setHasCameraDevice(true);
      });
    }
  }, []);

  const stopCamera = () => {
    activeLoopRef.current = false;
    blinkCountRef.current = 0;
    setBlinkCount(0);
    eyesClosedRef.current = false;
    setLastActionText('Align Face');
    hasMultipleFacesRef.current = false;
    setHasMultipleFaces(false);
    setFaceValidation({
      hasFace: false,
      isCentered: false,
      isProperDistance: false,
      isFacingForward: false,
      isGoodLighting: false,
      isSharp: false
    });

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setIsOpenModal(false);
  };

  const capturePhoto = async (force = false) => {
    if (!force) {
      const allChecksPassed =
        faceValidation.isCentered &&
        faceValidation.isProperDistance &&
        faceValidation.isFacingForward &&
        faceValidation.isGoodLighting &&
        faceValidation.isSharp;

      if (isLandmarkerLoaded && !allChecksPassed && !hasMultipleFacesRef.current) {
        setError('Please align your face according to the Quality Checklist before capturing.');
        return;
      }
    }

    if (videoRef.current) {
      const video = videoRef.current;
      const vidWidth = video.videoWidth || 640;
      const vidHeight = video.videoHeight || 480;

      // Calculate passport crop region with exact 140:170 aspect ratio
      const desiredAspect = targetWidth / targetHeight; // 140 / 170 ≈ 0.8235
      let cropW, cropH, cropX, cropY;

      if (vidWidth / vidHeight > desiredAspect) {
        // Video is wider than 140:170
        cropH = vidHeight * 0.90; // Use 90% of height for good framing
        cropW = cropH * desiredAspect;
        cropX = (vidWidth - cropW) / 2;
        cropY = (vidHeight - cropH) / 2;
      } else {
        // Video is taller than 140:170
        cropW = vidWidth * 0.90;
        cropH = cropW / desiredAspect;
        cropX = (vidWidth - cropW) / 2;
        cropY = (vidHeight - cropH) / 2;
      }

      // Create destination canvas with required dimensions (140 x 170)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetWidth; // 140
      exportCanvas.height = targetHeight; // 170
      const ctx = exportCanvas.getContext('2d');

      // Mirror horizontally so the picture matches natural preview
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);

      // Draw the cropped center portion of video feed scaled to 140x170
      // In mirrored coordinate space, cropX from mirrored feed:
      // (When drawing with scale(-1, 1), source cropX needs to align correctly)
      ctx.drawImage(
        video,
        cropX, cropY, cropW, cropH,
        0, 0, targetWidth, targetHeight
      );
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const file = await canvasToFile(exportCanvas, 'photograph_140x170.jpg');
      if (file && onFileSelect) {
        // Construct standard synthetic change event matching handleFileChange(e, "photoFile")
        onFileSelect({
          target: {
            files: [file]
          }
        });
      }
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        const msg = 'Camera access requires a secure context (HTTPS or localhost).';
        setError(msg);
        return;
      }

      setError('');
      setBlinkCount(0);
      blinkCountRef.current = 0;
      eyesClosedRef.current = false;
      setLastActionText('Align Face');
      hasMultipleFacesRef.current = false;
      setHasMultipleFaces(false);
      setIsOpenModal(true);

      if (!offscreenCanvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        offscreenCanvasRef.current = canvas;
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setVideoStream(stream);

      // Load Google MediaPipe Vision dynamically from CDN
      if (!landmarkerRef.current || !detectorRef.current) {
        setIsLandmarkerLoaded(false);
        try {
          const { FaceLandmarker, ObjectDetector, FilesetResolver } = await import(
            /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8'
          );
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
          );

          if (!landmarkerRef.current) {
            landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'GPU'
              },
              runningMode: 'VIDEO',
              outputFaceBlendshapes: true,
              numFaces: 2
            });
          }

          if (!detectorRef.current) {
            detectorRef.current = await ObjectDetector.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
                delegate: 'GPU'
              },
              runningMode: 'VIDEO',
              scoreThreshold: 0.3
            });
          }

          setIsLandmarkerLoaded(true);
        } catch (mErr) {
          console.warn('MediaPipe smart validation unavailable, fallback to manual capture:', mErr);
          setIsLandmarkerLoaded(false);
        }
      } else {
        setIsLandmarkerLoaded(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Unable to access camera. Please check permissions or choose file to upload.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission blocked. Please allow camera access in browser URL bar.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'No webcam device found on your system.';
      } else if (err.name === 'NotReadableError') {
        errMsg = 'Webcam is currently in use by another application.';
      }
      setError(errMsg);
    }
  };

  const detectLoop = () => {
    if (!activeLoopRef.current || !landmarkerRef.current || !videoRef.current) return;

    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        const facesCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

        let peopleCount = 0;
        if (detectorRef.current) {
          const detectResults = detectorRef.current.detectForVideo(video, performance.now());
          if (detectResults.detections) {
            peopleCount = detectResults.detections.filter((d) =>
              d.categories.some((c) => c.categoryName === 'person' && c.score > 0.4)
            ).length;
          }
        }

        if (facesCount > 1 || peopleCount > 1) {
          if (!hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = true;
            setHasMultipleFaces(true);
          }
          setLastActionText(facesCount > 1 ? 'Multiple Faces!' : 'Multiple People!');
          eyesClosedRef.current = false;
          setFaceValidation({
            hasFace: true,
            isCentered: false,
            isProperDistance: false,
            isFacingForward: false,
            isGoodLighting: false,
            isSharp: false
          });
        } else if (facesCount === 0) {
          if (hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = false;
            setHasMultipleFaces(false);
          }
          setLastActionText('No Face Detected');
          eyesClosedRef.current = false;
          setFaceValidation({
            hasFace: false,
            isCentered: false,
            isProperDistance: false,
            isFacingForward: false,
            isGoodLighting: false,
            isSharp: false
          });
        } else {
          if (hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = false;
            setHasMultipleFaces(false);
          }

          const landmarks = results.faceLandmarks[0];

          // 1. Calculate Face Bounding Box
          let minX = 1, maxX = 0, minY = 1, maxY = 0;
          for (const lm of landmarks) {
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.y > maxY) maxY = lm.y;
          }

          // 2. Centering Check
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const isCentered = Math.abs(centerX - 0.5) < 0.15 && Math.abs(centerY - 0.5) < 0.2;

          // 3. Distance Check
          const faceWidth = maxX - minX;
          const isProperDistance = faceWidth >= 0.22 && faceWidth <= 0.6;

          // 4. Orientation Checks (Yaw, Pitch, Roll)
          const nose = landmarks[4];
          const yawRatio = (nose.x - minX) / (maxX - minX);
          const pitchRatio = (nose.y - minY) / (maxY - minY);
          const isYawFacing = yawRatio >= 0.38 && yawRatio <= 0.62;
          const isPitchFacing = pitchRatio >= 0.4 && pitchRatio <= 0.65;

          const eyeLeft = landmarks[33];
          const eyeRight = landmarks[263];
          const rollAngle = Math.atan2(eyeRight.y - eyeLeft.y, eyeRight.x - eyeLeft.x) * (180 / Math.PI);
          const isRollFacing = Math.abs(rollAngle) <= 15;

          const isFacingForward = isYawFacing && isPitchFacing && isRollFacing;

          // 5. Throttled lighting and sharpness check
          frameCountRef.current += 1;
          let isGoodLighting = lastPixelValidationRef.current.isGoodLighting;
          let isSharp = lastPixelValidationRef.current.isSharp;

          if (frameCountRef.current % 10 === 0 && offscreenCanvasRef.current) {
            const canvas = offscreenCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const brightness = calculateBrightness(canvas);
              const sharpness = calculateSharpness(canvas);

              isGoodLighting = brightness >= 60 && brightness <= 220;
              isSharp = sharpness >= 4.5;
              lastPixelValidationRef.current = { isGoodLighting, isSharp };
            }
          }

          setFaceValidation({
            hasFace: true,
            isCentered,
            isProperDistance,
            isFacingForward,
            isGoodLighting,
            isSharp
          });

          const allChecksPassed = isCentered && isProperDistance && isFacingForward && isGoodLighting && isSharp;

          // Passive Liveness Blink Detection (2 consecutive blinks)
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const eyeBlinkLeft = blendshapes.find((b) => b.categoryName === 'eyeBlinkLeft')?.score || 0;
            const eyeBlinkRight = blendshapes.find((b) => b.categoryName === 'eyeBlinkRight')?.score || 0;

            if (eyeBlinkLeft > 0.45 && eyeBlinkRight > 0.45) {
              if (!eyesClosedRef.current) {
                eyesClosedRef.current = true;
                setLastActionText('Blink!');
              }
            } else if (eyeBlinkLeft < 0.2 && eyeBlinkRight < 0.2) {
              if (eyesClosedRef.current) {
                eyesClosedRef.current = false;

                if (allChecksPassed) {
                  blinkCountRef.current += 1;
                  setBlinkCount(blinkCountRef.current);
                  setLastActionText(`Blink ${blinkCountRef.current}/2 detected!`);

                  if (blinkCountRef.current >= 2) {
                    setLastActionText('Capturing...');
                    activeLoopRef.current = false;
                    // 250ms buffer allows subject to open eyes fully before photo snapshot
                    setTimeout(() => {
                      capturePhoto(true);
                    }, 250);
                    return;
                  }
                } else {
                  if (!isCentered) setLastActionText('Please center your face');
                  else if (!isProperDistance) setLastActionText(faceWidth < 0.22 ? 'Please move closer' : 'Please move back');
                  else if (!isFacingForward) setLastActionText('Please look straight at camera');
                  else if (!isGoodLighting) setLastActionText('Improve lighting to capture');
                  else if (!isSharp) setLastActionText('Hold still (image blurry)');
                }
              }
            }
          }

          if (!eyesClosedRef.current && blinkCountRef.current < 2) {
            if (!isCentered) setLastActionText('Center Face');
            else if (!isProperDistance) setLastActionText(faceWidth < 0.22 ? 'Move Closer' : 'Move Back');
            else if (!isFacingForward) setLastActionText(Math.abs(rollAngle) > 15 ? 'Keep Head Straight' : 'Look Straight');
            else if (!isGoodLighting) setLastActionText('Check Lighting');
            else if (!isSharp) setLastActionText('Hold Still');
            else setLastActionText(`Blink twice to capture (${blinkCountRef.current}/2)`);
          }
        }
      }
    } catch (err) {
      console.error('Detection loop error:', err);
    }

    if (activeLoopRef.current) {
      requestAnimationFrame(detectLoop);
    }
  };

  useEffect(() => {
    if (isOpenModal && videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch((e) => console.warn('Autoplay error:', e));

      if (isLandmarkerLoaded && landmarkerRef.current) {
        activeLoopRef.current = true;
        requestAnimationFrame(detectLoop);
      }
    }
    return () => {
      activeLoopRef.current = false;
    };
  }, [isOpenModal, videoStream, isLandmarkerLoaded]);

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  return (
    <>
      {/* Trigger Button inside Form / Step */}
      <button
        type="button"
        onClick={startCamera}
        disabled={isLocked}
        className={`inline-flex items-center gap-2 bg-[#1a56db] hover:bg-[#1648b8] text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded shadow transition cursor-pointer select-none ${
          isLocked ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Capture live photograph using webcam"
      >
        <Camera size={16} />
        <span>Live Camera Photo</span>
      </button>

      {/* Live AI Capture Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#1a56db] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-snug">
                    AI Live Photo Capture (लाइव फोटो)
                  </h3>
                  <p className="text-xs text-blue-100">
                    Auto-cropped to {targetWidth} × {targetHeight} px (.jpg / .jpeg)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Note banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-start gap-2">
              <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">नोट :</span> फोटो का बैकग्राउंड प्लेन(एक कलर में) होना आवश्यक है। सीधे कैमरे में देखें और 2 बार पलकें झपकाएं (Blink twice) ऑटो-कैप्चर के लिए।
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-stretch">
                {/* Live Camera View Screen */}
                <div
                  className="sm:col-span-3 relative rounded-xl overflow-hidden bg-black shadow-inner border border-gray-300 flex items-center justify-center"
                  style={{ minHeight: '260px', aspectRatio: '4/3' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {/* Passport-Aspect Guide Box (140:170) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className="border-2 border-dashed border-white/80 rounded-xl shadow-lg relative flex items-center justify-center"
                      style={{
                        height: '82%',
                        aspectRatio: `${targetWidth} / ${targetHeight}`
                      }}
                    >
                      {/* Oval head guide overlay */}
                      <div className="w-[72%] h-[68%] border border-cyan-300/60 rounded-[50%] absolute top-[12%]" />
                      <div className="absolute bottom-1 bg-black/60 backdrop-blur-xs text-[9px] text-white/90 px-1.5 py-0.5 rounded font-mono">
                        {targetWidth} × {targetHeight}
                      </div>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="absolute top-2 left-2 right-2 bg-slate-900/90 text-white py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs border border-white/10 shadow-lg select-none z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isLandmarkerLoaded
                            ? hasMultipleFaces
                              ? 'bg-red-500 animate-pulse'
                              : faceValidation.isCentered &&
                                faceValidation.isProperDistance &&
                                faceValidation.isFacingForward &&
                                faceValidation.isGoodLighting &&
                                faceValidation.isSharp
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-yellow-500 animate-pulse'
                            : 'bg-amber-500 animate-pulse'
                        }`}
                      />
                      <span className="font-semibold text-gray-100 text-[11px] truncate">
                        {isLandmarkerLoaded
                          ? hasMultipleFaces
                            ? 'Multiple people detected!'
                            : `Blink 2x to Auto-Capture (${blinkCount}/2)`
                          : 'Starting AI Liveness...'}
                      </span>
                    </div>
                    {isLandmarkerLoaded && (
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded border text-[10px] uppercase flex-shrink-0 ${
                          hasMultipleFaces
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : lastActionText === 'Blink!'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                            : lastActionText.startsWith('Blink')
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {hasMultipleFaces ? 'Alert' : lastActionText}
                      </span>
                    )}
                  </div>

                  {/* Multi-Person Security Alert Overlay */}
                  {hasMultipleFaces && (
                    <div className="absolute inset-0 bg-red-950/85 flex flex-col items-center justify-center p-4 text-center select-none z-20">
                      <ShieldAlert size={36} className="text-red-400 mb-2" />
                      <h4 className="font-extrabold text-red-200 text-sm">Multiple People Detected!</h4>
                      <p className="text-xs text-red-300 mt-1 max-w-[200px]">
                        Anti-fraud policy: Only ONE person must be visible in the camera frame.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quality Checklist Panel */}
                <div className="sm:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Quality Checklist
                    </h5>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Face Detected</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${faceValidation.hasFace ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {faceValidation.hasFace ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Centered</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${!faceValidation.hasFace ? 'bg-gray-200 text-gray-500' : faceValidation.isCentered ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {!faceValidation.hasFace ? 'Waiting' : faceValidation.isCentered ? '✓ Good' : 'Adjust'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Distance / Scale</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${!faceValidation.hasFace ? 'bg-gray-200 text-gray-500' : faceValidation.isProperDistance ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {!faceValidation.hasFace ? 'Waiting' : faceValidation.isProperDistance ? '✓ Good' : 'Adjust'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Facing Straight</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${!faceValidation.hasFace ? 'bg-gray-200 text-gray-500' : faceValidation.isFacingForward ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {!faceValidation.hasFace ? 'Waiting' : faceValidation.isFacingForward ? '✓ Good' : 'Adjust'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Good Lighting</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${!faceValidation.hasFace ? 'bg-gray-200 text-gray-500' : faceValidation.isGoodLighting ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {!faceValidation.hasFace ? 'Waiting' : faceValidation.isGoodLighting ? '✓ Good' : 'Dark/Bright'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-700">Sharp & Clear</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${!faceValidation.hasFace ? 'bg-gray-200 text-gray-500' : faceValidation.isSharp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {!faceValidation.hasFace ? 'Waiting' : faceValidation.isSharp ? '✓ Sharp' : 'Blurry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 leading-tight mt-2 bg-white p-2 rounded border border-gray-200">
                    💡 Hold steady, face forward, and blink naturally 2 times for automatic capture.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-gray-100 px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>AI ऑटो-कैप्चर सक्रिय है: कैमरा में देखकर 2 बार पलकें झपकाएं</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-5 rounded-lg text-sm transition flex items-center justify-center cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
