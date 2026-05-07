import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ToastAndroid,
    Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import FeatherIcon from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OpenCamera from "../../Components/OpenCamera";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import { closeDay, getAttendance } from "../../Api/employee";
import { SafeAreaView } from "react-native-safe-area-context";

const EndDay = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState();
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [formValues, setFormValues] = useState({
        Id: "",
        End_KM: "",
        End_KM_Pic: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
                setFormValues({ ...formValues, Id: userId });
            } catch (err) {
                console.error("Error fetching user ID:", err);
                Alert.alert("Error", "Unable to fetch user ID");
            }
        })();
    }, []);

    const { data: attendanceData = [] } = useQuery({
        queryKey: ["attendance", userId],
        queryFn: () => getAttendance(userId),
        enabled: !!userId,
    });

    useEffect(() => {
        if (attendanceData.length > 0) {
            setFormValues(prevState => ({
                ...prevState,
                Id: attendanceData[0].Id,
            }));
        }
    }, [attendanceData]);

    const startKm =
        attendanceData.length > 0 && attendanceData[0].Start_KM !== null
            ? attendanceData[0].End_KM !== null
                ? attendanceData[0].End_KM
                : attendanceData[0]?.Start_KM
            : "0";

    const handleInputChange = value => {
        setFormValues(prevState => ({ ...prevState, End_KM: value }));
    };

    const handlePhotoCapture = photoPath => {
        setCapturedPhotoPath(photoPath);
        setFormValues(prevState => ({ ...prevState, End_KM_Pic: photoPath }));
        setShowCamera(false);
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
        setFormValues(prevState => ({ ...prevState, End_KM_Pic: "" }));
    };

    const mutation = useMutation({
        mutationFn: closeDay,
        onSuccess: data => {
            ToastAndroid.show(
                data.message || "Your attendance update successfully",
                ToastAndroid.LONG,
            );
            // navigation.navigate("HomeScreen");
            navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}] 
                    }
                }],
            });
        },
        onError: error => {
            console.error("Error posting data:", error);
            Alert.alert("Error", error.message || "Something went wrong");
        },
    });

    const handleSubmit = async () => {
        mutation.mutate({
            Id: formValues.Id,
            End_KM: formValues.End_KM,
            End_KM_Pic: formValues.End_KM_Pic,
        });
    };

    if (showCamera) {
        return (
            <OpenCamera
                onPhotoCapture={handlePhotoCapture}
                onClose={() => setShowCamera(false)}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Wrap Up" navigation={navigation} />

            <View style={styles.contentContainer}>

                <View style={styles.formContainer}>
                    {/* Current KM Display */}
                    <View style={styles.currentKmCard}>
                        <View style={styles.kmIconContainer}>
                            <FeatherIcon name="navigation" size={iconSizes.md} color={customColors.primary} />
                        </View>
                        <View style={styles.kmTextContainer}>
                            <Text style={styles.kmLabel}>Starting KM</Text>
                            <Text style={styles.kmValue}>{startKm} km</Text>
                        </View>
                    </View>

                    {/* End KM Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.sectionLabel}>Ending Kilometers</Text>
                        <FormField
                            value={formValues.End_KM}
                            onChangeText={handleInputChange}
                            placeholder="Enter ending KMs"
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
                            (!formValues.End_KM || !capturedPhotoPath) && styles.disabledButton,
                        ]}
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={!formValues.End_KM || !capturedPhotoPath || mutation.isPending}
                    >
                        {mutation.isPending ? (
                            <Text style={styles.submitButtonText}>Submitting...</Text>
                        ) : (
                            <>
                                <FeatherIcon name="check" size={iconSizes.md} color={customColors.white} />
                                <Text style={styles.submitButtonText}>Complete Day</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default EndDay;

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
    // Current KM Card
    currentKmCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primaryLight + "25",
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
    },
    kmIconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    kmTextContainer: {
        flex: 1,
    },
    kmLabel: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    kmValue: {
        ...typography.h5(),
        color: customColors.primary,
        fontWeight: "800",
        marginTop: spacing.xs,
    },
    // Input Section
    inputSection: {
        marginBottom: spacing.md,
    },
    sectionLabel: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
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
