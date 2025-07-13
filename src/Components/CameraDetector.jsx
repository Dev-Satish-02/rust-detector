import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const CameraDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState("Loading...");
  const [facingMode, setFacingMode] = useState("environment"); // back camera by default

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Load the model and start camera
  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await tf.loadLayersModel("/model/model.json");
      setModel(loadedModel);
      console.log("✅ Model loaded");
    };

    loadModel();
  }, []);

  // Start or restart camera whenever model or facingMode changes
  useEffect(() => {
    if (!model) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
      } catch (err) {
        console.error("Camera error:", err);
        setPrediction("Error accessing camera");
      }
    };

    startCamera();
  }, [model, facingMode]);

  // Run prediction every 500ms
  useEffect(() => {
    if (!model) return;

    const interval = setInterval(() => {
      detect();
    }, 500);

    return () => clearInterval(interval);
  }, [model]);

  const detect = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Match model input shape (128x128)
    canvas.width = 128;
    canvas.height = 128;

    ctx.drawImage(video, 0, 0, 128, 128);
    const imageTensor = tf.browser
      .fromPixels(canvas)
      .toFloat()
      .div(tf.scalar(255))
      .expandDims(0); // shape: [1, 128, 128, 3]

    const predictionTensor = model.predict(imageTensor);
    predictionTensor.array().then((scores) => {
      const rustScore = scores[0][0];
      if (rustScore > 0.5) {
        setPrediction(`🧱 Rust Detected (${(rustScore * 100).toFixed(1)}%)`);
      } else {
        setPrediction(`✅ No Rust (${((1 - rustScore) * 100).toFixed(1)}%)`);
      }
    });
  };

  return (
    <div className="detector">
      <video ref={videoRef} className="video" autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="prediction">{prediction}</div>

      {isMobile && (
        <button
          onClick={() =>
            setFacingMode((prev) =>
              prev === "environment" ? "user" : "environment"
            )
          }
          style={{
            marginTop: "10px",
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#eee",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Flip Camera
        </button>
      )}
    </div>
  );
};

export default CameraDetector;
