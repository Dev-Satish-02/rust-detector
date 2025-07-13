import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const CameraDetector = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [model, setModel] = useState(null);
    const [prediction, setPrediction] = useState("Loading...");

    useEffect(() => {
        const loadModel = async () => {
            const loadedModel = await tf.loadLayersModel("/model/model.json");
            setModel(loadedModel);
            startCamera();
        };

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoElement = videoRef.current;
                videoElement.srcObject = stream;

                videoElement.onloadedmetadata = () => {
                    videoElement.play(); // Wait until metadata is loaded before calling play()
                };
            } catch (err) {
                setPrediction("Error accessing camera");
                console.error("Camera error:", err);
            }
        };


        loadModel();
    }, []);

    useEffect(() => {
        const detect = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            canvas.width = 128; // <-- match model input
            canvas.height = 128;

            ctx.drawImage(video, 0, 0, 128, 128);
            const img = tf.browser.fromPixels(canvas)
                .toFloat()
                .div(tf.scalar(255))
                .expandDims(0); // shape [1, 128, 128, 3]

            model.predict(img).array().then((result) => {
                const score = result[0][0];
                setPrediction(
                    score > 0.5
                        ? `Rust Detected (${(score * 100).toFixed(1)}%)`
                        : `No Rust (${((1 - score) * 100).toFixed(1)}%)`
                );
            });
        };

        if (model) {
            const interval = setInterval(() => {
                detect();
            }, 500); // Run detection every 500ms

            return () => clearInterval(interval);
        }
    }, [model]);

    return (
        <div className="detector">
            <video ref={videoRef} className="video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="prediction">{prediction}</div>
        </div>
    );
};

export default CameraDetector;
