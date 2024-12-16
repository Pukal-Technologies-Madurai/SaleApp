import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import React, { useRef, useEffect } from "react";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import RNFS from "react-native-fs";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import { customColors, typography } from "../Config/helper";

const CameraComponent = ({ onPhotoCapture, showCamera }) => {
    const device = useCameraDevice("back");
    const camera = useRef(null);
    const { hasPermission, requestPermission } = useCameraPermission();

    useEffect(() => {
        checkPermission();
    }, [hasPermission]);

    const checkPermission = async () => {
        const status = await requestPermission();
        if (status !== "authorized") {
            // console.log("Camera permission denied");
        }
    };

    const compressImage = async (imagePath) => {
        try {
            const result = await ImageResizer.createResizedImage(
                imagePath,
                640,        // Max width
                640,        // Max height
                "JPEG",
                50,         // Quality (0-100)
                0           // Rotation angle (e.g., 0, 90, 180, 270)
            );

            const fileStats = await RNFS.stat(result.uri);
            // console.log("Compressed image size: ", fileStats.size / 1024, "KB");

            return result.uri;
        } catch (error) {
            console.log("Image compression error: ", error);
            return imagePath;
        }
    };

    const takePhoto = async () => {
        if (!camera.current) {
            console.log("Camera not ready");
            return;
        }

        try {
            const photo = await camera.current.takePhoto({
                qualityPrioritization: "balanced",
                enableAutoRedEyeReduction: true,
                enableAutoStabilization: true,
                flash: "off",
                enableShutterSound: true,
            });

            // Compress the captured image
            const compressedImagePath = await compressImage(photo.path);
            onPhotoCapture(compressedImagePath);
        } catch (err) {
            console.log("Error taking photo: ", err);
        }
    };

    if (!hasPermission || device == null) return (<ActivityIndicator />);

    return (
        <View style={[styles.container, showCamera && styles.fullScreen]}>
            <Camera
                ref={camera}
                photo={true}
                style={[styles.cameraView, showCamera && styles.fullScreen]}
                device={device}
                isActive={true}
            />
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <Text style={styles.captureButtonText}>Take Photo</Text>
            </TouchableOpacity>
        </View>
    )
}

export default CameraComponent

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    cameraView: {
        width: "90%",
        aspectRatio: 1,
    },
    fullScreen: {
        width: "100%",
        height: "100%",
    },
    captureButton: {
        backgroundColor: customColors.secondary,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 15,
        paddingHorizontal: 30,
        marginTop: 40,
    },
    captureButtonText: {
        ...typography.button(),
        color: customColors.black,
        fontWeight: "700"
    },
})