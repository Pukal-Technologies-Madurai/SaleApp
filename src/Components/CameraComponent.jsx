import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import React, { useRef, useEffect } from 'react'
import { Camera, useCameraDevice, useCameraPermission, } from 'react-native-vision-camera'
import { customColors, typography } from '../Config/helper'

const CameraComponent = ({ onPhotoCapture, showCamera }) => {
    const device = useCameraDevice("back");
    const camera = useRef(null);
    const { hasPermission, requestPermission } = useCameraPermission();

    useEffect(() => {
        checkPermission();
    }, [hasPermission]);

    const checkPermission = async () => {
        const granted = await requestPermission(true);
        if (!granted) {
            console.log("Camera permission denied");
        }
    };

    const takePhoto = async () => {
        try {
            const photo = await camera.current.takePhoto({
                qualityPrioritization: "balanced",
                enableAutoRedEyeReduction: true,
                enableAutoStabilization: true,
                flash: "off",
                enableShutterSound: true
            });

            onPhotoCapture(photo.path);
        } catch (err) {
            console.log(err);
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
    },
})