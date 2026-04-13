import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
    Image,
    ToastAndroid,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import { startDay } from "../../Api/employee";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import OpenCamera from "../../Components/OpenCamera";
import LocationIndicator from "../../Components/LocationIndicator";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import { SafeAreaView } from "react-native-safe-area-context";

const Attendance = locationData => {
    const navigation = useNavigation();
    const [showCamera, setShowCamera] = useState(false);
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [formValues, setFormValues] = useState({
        UserId: "",
        Start_KM: "",
        Latitude: locationData?.latitude || null,
        Longitude: locationData?.longitude || null,
        Start_KM_Pic: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                if (userId) {
                    setFormValues(prevValues => ({
                        ...prevValues,
                        UserId: userId,
                    }));
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const handleLocationUpdate = locationData => {
        setFormValues(prevState => ({
            ...prevState,
            Latitude: locationData.latitude,
            Longitude: locationData.longitude,
        }));
    };

    const handleInputChange = value => {
        setFormValues(prevState => ({
            ...prevState,
            Start_KM: value,
        }));
    };

    const handlePhotoCapture = async photoPath => {
        setCapturedPhotoPath(photoPath);
        setFormValues(prevState => ({
            ...prevState,
            Start_KM_Pic: photoPath,
        }));
        setShowCamera(false);
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
        setFormValues(prevState => ({
            ...prevState,
            Start_KM_Pic: "",
        }));
    };

    const mutation = useMutation({
        mutationFn: startDay,
        onSuccess: data => {
            ToastAndroid.show(data.message, ToastAndroid.LONG);
            navigation.replace("HomeScreen");
        },
        onError: err => {
            Alert.alert("Error", err.message || "Failed to start day");
        },
    });

    const handleSubmit = async () => {
        const { UserId, Start_KM, Latitude, Longitude, Start_KM_Pic } =
            formValues;

        mutation.mutate({
            UserId,
            Start_KM,
            Latitude,
            Longitude,
            Start_KM_Pic,
        });
        // console.log("Submitting formValues:", formValues);
    };

    if (showCamera) {
        return (
            <OpenCamera
                onPhotoCapture={handlePhotoCapture}
                onClose={() => setShowCamera(false)}
                enableCompression={true}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Start Fresh" navigation={navigation} />

            <View style={styles.contentContainer}>

                <View style={styles.formContainer}>
                    {/* Location Section */}
                    <View style={styles.locationSection}>
                        <LocationIndicator
                            onLocationUpdate={handleLocationUpdate}
                            autoFetch={true}
                            autoFetchOnMount={true}
                        />
                    </View>

                    {/* Start KM Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.sectionLabel}>Starting Kilometers</Text>
                        <FormField
                            value={formValues.Start_KM}
                            onChangeText={handleInputChange}
                            placeholder="Enter starting KMs"
                            numbersOnly={true}
                            leftIcon="navigation-2"
                        />
                    </View>

                    {/* Photo Section */}
                    <View style={styles.photoSection}>
                        <Text style={styles.sectionLabel}>Meter Photo</Text>
                        
                        {!capturedPhotoPath ? (
                            <TouchableOpacity
                                onPress={() => setShowCamera(true)}
                                style={styles.photoPlaceholder}
                                activeOpacity={0.8}
                            >
                                <View style={styles.photoPlaceholderContent}>
                                    <View style={styles.cameraIconContainer}>
                                        <FeatherIcon name="camera" size={iconSizes.xl} color={customColors.grey400} />
                                    </View>
                                    <Text style={styles.photoPlaceholderText}>Tap to capture meter photo</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.photoPreviewContainer}>
                                <Image
                                    source={{ uri: "file://" + capturedPhotoPath }}
                                    style={styles.photoPreview}
                                />
                                <View style={styles.photoActions}>
                                    <TouchableOpacity
                                        onPress={clearPhoto}
                                        style={styles.retakeButton}
                                        activeOpacity={0.8}
                                    >
                                        <FeatherIcon name="refresh-cw" size={iconSizes.sm} color={customColors.accent2} />
                                        <Text style={styles.retakeText}>Retake</Text>
                                    </TouchableOpacity>
                                    <View style={styles.photoCheckmark}>
                                        <FeatherIcon name="check-circle" size={iconSizes.md} color={customColors.success} />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!formValues.Start_KM || !capturedPhotoPath || !formValues.Latitude) && styles.disabledButton,
                        ]}
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={!formValues.Start_KM || !capturedPhotoPath || !formValues.Latitude || mutation.isPending}
                    >
                        {mutation.isPending ? (
                            <Text style={styles.submitButtonText}>Starting...</Text>
                        ) : (
                            <>
                                <FeatherIcon name="play" size={iconSizes.md} color={customColors.white} />
                                <Text style={styles.submitButtonText}>Start Day</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Attendance;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    // Location Section
    locationSection: {
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.sm,
    },
    // Input Section
    inputSection: {
        marginBottom: spacing.lg,
    },
    // Photo Section
    photoSection: {
        marginBottom: spacing.lg,
    },
    photoPlaceholder: {
        height: 160,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderColor: customColors.grey200,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    photoPlaceholderContent: {
        alignItems: "center",
    },
    cameraIconContainer: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    photoPlaceholderText: {
        ...typography.body2(),
        color: customColors.grey500,
    },
    photoPreviewContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        overflow: "hidden",
        ...shadows.small,
    },
    photoPreview: {
        width: "100%",
        height: 200,
        resizeMode: "cover",
    },
    photoActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.md,
    },
    retakeButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: "rgba(255, 87, 34, 0.1)",
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    retakeText: {
        ...typography.body2(),
        color: customColors.accent2,
        fontWeight: "600",
    },
    photoCheckmark: {
        padding: spacing.xs,
    },
    // Submit Button
    submitButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: "auto",
        marginBottom: spacing.lg,
        gap: spacing.sm,
        ...shadows.medium,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "700",
    },
    disabledButton: {
        backgroundColor: customColors.grey300,
    },
});
