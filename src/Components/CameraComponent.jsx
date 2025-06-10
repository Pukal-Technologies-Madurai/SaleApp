import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar } from "react-native";
import React, { useRef, useEffect } from "react";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import RNFS from "react-native-fs";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import { customColors, typography, spacing, shadows } from "../Config/helper";
import Icon from "react-native-vector-icons/MaterialIcons";

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

    if (!hasPermission || device == null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customColors.primary} />
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => showCamera(false)}>
                    <Icon name="close" size={28} color={customColors.white} />
                </TouchableOpacity>
                <Text style={styles.headerText}>Take Photo</Text>
                <View style={styles.placeholder} />
            </View>
            
            <View style={styles.cameraContainer}>
                <Camera
                    ref={camera}
                    photo={true}
                    style={styles.cameraView}
                    device={device}
                    isActive={true}
                />
                <View style={styles.overlay}>
                    <View style={styles.frameGuide}>
                        <View style={styles.cornerTL} />
                        <View style={styles.cornerTR} />
                        <View style={styles.cornerBL} />
                        <View style={styles.cornerBR} />
                    </View>
                </View>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity 
                    style={styles.captureButton} 
                    onPress={takePhoto}
                    activeOpacity={0.8}>
                    <View style={styles.captureButtonInner}>
                        <View style={styles.captureButtonRing} />
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default CameraComponent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.black,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.black,
    },
    loadingText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginTop: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    closeButton: {
        padding: spacing.xs,
    },
    headerText: {
        ...typography.h6(),
        color: customColors.white,
        textAlign: "center",
    },
    placeholder: {
        width: 40,
    },
    cameraContainer: {
        flex: 1,
        position: "relative",
    },
    cameraView: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    frameGuide: {
        width: "70%",
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 12,
        position: 'relative',
    },
    cornerTL: {
        position: 'absolute',
        top: -2,
        left: -2,
        width: 20,
        height: 20,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: customColors.white,
    },
    cornerTR: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: customColors.white,
    },
    cornerBL: {
        position: 'absolute',
        bottom: -2,
        left: -2,
        width: 20,
        height: 20,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: customColors.white,
    },
    cornerBR: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: customColors.white,
    },
    controls: {
        position: "absolute",
        bottom: spacing.xl,
        left: 0,
        right: 0,
        alignItems: "center",
        padding: spacing.md,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    captureButtonInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
    },
    captureButtonRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: customColors.primary,
    },
});