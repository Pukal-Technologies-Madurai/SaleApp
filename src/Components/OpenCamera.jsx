import React, { useState, useRef, useEffect } from "react";
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Image, 
    StyleSheet, 
    ActivityIndicator, 
    Alert,
    SafeAreaView
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { customColors, typography } from "../Config/helper";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import RNFS from 'react-native-fs';

const OpenCamera = ({ onPhotoCapture, enableCompression = false }) => {
    const navigation = useNavigation();
    const device = useCameraDevice('back');
    const camera = useRef(null);
    const { hasPermission, requestPermission } = useCameraPermission();

    const [photoPath, setPhotoPath] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const compressImage = async (imagePath) => {
        try {
            const result = await ImageResizer.createResizedImage(
                imagePath,
                640,        // Max width
                640,        // Max height
                "JPEG",
                50,         // Quality (0-100)
                0           // Rotation angle
            );

            const fileStats = await RNFS.stat(result.uri);
            console.log("Compressed image size: ", fileStats.size / 1024, "KB");

            return result.uri;
        } catch (error) {
            console.log("Image compression error: ", error);
            return imagePath;
        }
    };

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const permission = await requestPermission();
            if (!permission) {
                setError("Camera permission denied");
                Alert.alert(
                    "Camera Access Required",
                    "Please enable camera access in settings to take photos.",
                    [
                        {
                            text: "Open Settings",
                            onPress: () => Linking.openSettings()
                        },
                        { text: "Cancel", style: "cancel" }
                    ]
                );
            }
        } catch (err) {
            console.error("Camera Permission Error:", err);
            setError("Failed to get camera permission");
        }
    };

    const takePhoto = async () => {
        if (!camera.current) {
            setError("Camera not initialized");
            return;
        }

        setIsCapturing(true);
        setError(null);

        try {
            const photo = await camera.current.takePhoto({
                qualityPrioritization: 'balanced',
                enableAutoRedEyeReduction: true,
                enableAutoStabilization: true,
                flash: 'off',
                enableShutterSound: true
            });

            let finalPhotoPath = photo.path;
            
            // Compress image if enabled
            if (enableCompression) {
                finalPhotoPath = await compressImage(photo.path);
            }

            setPhotoPath(finalPhotoPath);
        } catch (err) {
            console.error("Photo Capture Error:", err);
            setError("Failed to capture photo");
        } finally {
            setIsCapturing(false);
        }
    };

    const savePhoto = async () => {
        if (!photoPath) {
            setError("No photo to save");
            return;
        }

        setIsSaving(true);
        try {
            if (onPhotoCapture) {
                onPhotoCapture(photoPath);
            } else {
                navigation.navigate('AddCustomer', { imageUri: photoPath });
            }
        } catch (err) {
            console.error("Save Photo Error:", err);
            setError("Failed to save photo");
        } finally {
            setIsSaving(false);
        }
    };

    const retakePhoto = () => {
        setPhotoPath(null);
        setError(null);
    };

    if (!device) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customColors.primary} />
                <Text style={styles.loadingText}>Initializing camera...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Camera
                ref={camera}
                photo={true}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
            />

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="warning" size={20} color={customColors.accent2} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {photoPath ? (
                <View style={styles.previewContainer}>
                    <Image 
                        style={styles.previewImage} 
                        source={{ uri: 'file://' + photoPath }} 
                    />
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.retakeButton]} 
                            onPress={retakePhoto}
                        >
                            <Icon name="refresh" size={24} color={customColors.white} />
                            <Text style={styles.buttonText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]} 
                            onPress={savePhoto}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={customColors.white} />
                            ) : (
                                <>
                                    <Icon name="checkmark" size={24} color={customColors.white} />
                                    <Text style={styles.buttonText}>Save</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity 
                    style={[styles.captureButton, isCapturing && styles.buttonDisabled]} 
                    onPress={takePhoto}
                    disabled={isCapturing}
                >
                    {isCapturing ? (
                        <ActivityIndicator color={customColors.white} />
                    ) : (
                        <>
                            <Icon name="camera" size={24} color={customColors.white} />
                            <Text style={styles.buttonText}>Capture</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

export default OpenCamera;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.black,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customColors.black,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.white,
        marginTop: 10,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
    },
    previewImage: {
        width: '100%',
        height: '70%',
        borderRadius: 12,
        marginTop: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        gap: 8,
    },
    captureButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: customColors.primary,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    retakeButton: {
        backgroundColor: customColors.grey700,
    },
    saveButton: {
        backgroundColor: customColors.primary,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
    },
    errorContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.accent2 + '20',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    errorText: {
        ...typography.body2(),
        color: customColors.accent2,
        flex: 1,
    },
});
