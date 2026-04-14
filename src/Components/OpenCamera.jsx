import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Linking,
    Dimensions,
} from "react-native";
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
} from "react-native-vision-camera";
import { useNavigation } from "@react-navigation/native";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../Config/helper";
import ImageResizer from "@bam.tech/react-native-image-resizer";
import RNFS from "react-native-fs";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const OpenCamera = ({ onPhotoCapture, enableCompression = false, onClose }) => {
    const navigation = useNavigation();
    const device = useCameraDevice("back");
    const camera = useRef(null);
    const { hasPermission, requestPermission } = useCameraPermission();

    const [photoPath, setPhotoPath] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const compressImage = async imagePath => {
        try {
            const result = await ImageResizer.createResizedImage(
                imagePath,
                640, // Max width
                640, // Max height
                "JPEG",
                50, // Quality (0-100)
                0, // Rotation angle
            );

            const fileStats = await RNFS.stat(result.uri);
            // console.log("Compressed image size: ", fileStats.size / 1024, "KB");

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
                            onPress: () => Linking.openSettings(),
                        },
                        { text: "Cancel", style: "cancel" },
                    ],
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
                qualityPrioritization: "balanced",
                enableAutoRedEyeReduction: true,
                enableAutoStabilization: true,
                flash: "off",
                enableShutterSound: true,
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
                await onPhotoCapture(photoPath);
                if (onClose) {
                    onClose();
                }
            } else {
                navigation.navigate("AddCustomer", { imageUri: photoPath });
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
                <View style={styles.loadingContent}>
                    <ActivityIndicator
                        size="large"
                        color={customColors.primary}
                    />
                    <Text style={styles.loadingText}>Initializing camera...</Text>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            {/* Camera View */}
            <Camera
                ref={camera}
                photo={true}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={!photoPath}
            />

            {/* Header with close button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => onClose?.()}
                    activeOpacity={0.8}>
                    <FeatherIcon
                        name="x"
                        size={iconSizes.lg}
                        color={customColors.white}
                    />
                </TouchableOpacity>
            </View>

            {/* Error Toast */}
            {error && (
                <View style={styles.errorContainer}>
                    <FeatherIcon
                        name="alert-circle"
                        size={iconSizes.md}
                        color={customColors.accent2}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Photo Preview */}
            {photoPath ? (
                <View style={styles.previewOverlay}>
                    <Image
                        style={styles.previewImage}
                        source={{ uri: "file://" + photoPath }}
                        resizeMode="contain"
                    />

                    {/* Preview Actions */}
                    <View style={styles.previewActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={retakePhoto}
                            activeOpacity={0.8}>
                            <View
                                style={[
                                    styles.actionIconBg,
                                    { backgroundColor: customColors.grey700 },
                                ]}>
                                <FeatherIcon
                                    name="refresh-cw"
                                    size={iconSizes.lg}
                                    color={customColors.white}
                                />
                            </View>
                            <Text style={styles.actionText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={savePhoto}
                            disabled={isSaving}
                            activeOpacity={0.8}>
                            <View
                                style={[
                                    styles.actionIconBg,
                                    styles.saveIconBg,
                                    isSaving && styles.actionDisabled,
                                ]}>
                                {isSaving ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={customColors.white}
                                    />
                                ) : (
                                    <FeatherIcon
                                        name="check"
                                        size={iconSizes.lg}
                                        color={customColors.white}
                                    />
                                )}
                            </View>
                            <Text style={styles.actionText}>
                                {isSaving ? "Saving..." : "Use Photo"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                /* Capture Controls */
                <View style={styles.captureControls}>
                    <TouchableOpacity
                        style={[
                            styles.captureButton,
                            isCapturing && styles.captureButtonActive,
                        ]}
                        onPress={takePhoto}
                        disabled={isCapturing}
                        activeOpacity={0.9}>
                        <View style={styles.captureButtonOuter}>
                            <View
                                style={[
                                    styles.captureButtonInner,
                                    isCapturing && styles.captureButtonInnerActive,
                                ]}>
                                {isCapturing && (
                                    <ActivityIndicator
                                        size="small"
                                        color={customColors.primary}
                                    />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.captureHint}>
                        {isCapturing ? "Capturing..." : "Tap to capture"}
                    </Text>
                </View>
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
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.black,
    },
    loadingContent: {
        alignItems: "center",
        padding: spacing.xl,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.white,
        marginTop: spacing.md,
    },
    header: {
        position: "absolute",
        top: spacing.md,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: spacing.md,
        zIndex: 10,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.round,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    errorContainer: {
        position: "absolute",
        top: 70,
        left: spacing.md,
        right: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.accent2 + "E6",
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.medium,
    },
    errorText: {
        ...typography.body2(),
        color: customColors.white,
        flex: 1,
    },
    previewOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: customColors.black,
    },
    previewImage: {
        flex: 1,
        width: "100%",
    },
    previewActions: {
        position: "absolute",
        bottom: spacing.xxl,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.xxl,
    },
    actionButton: {
        alignItems: "center",
        gap: spacing.sm,
    },
    actionIconBg: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.round,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.large,
    },
    saveIconBg: {
        backgroundColor: customColors.success,
    },
    actionDisabled: {
        opacity: 0.7,
    },
    actionText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    captureControls: {
        position: "absolute",
        bottom: spacing.xxl,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    captureButton: {
        marginBottom: spacing.md,
    },
    captureButtonActive: {
        transform: [{ scale: 0.95 }],
    },
    captureButtonOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.large,
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
    },
    captureButtonInnerActive: {
        backgroundColor: customColors.grey200,
    },
    captureHint: {
        ...typography.caption(),
        color: customColors.white,
        textAlign: "center",
    },
});
