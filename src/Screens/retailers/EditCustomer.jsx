import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    Modal,
    Dimensions,
    ActivityIndicator,
    Linking,
} from "react-native";
import React, { useCallback, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    spacing,
    typography,
    shadows,
    componentStyles,
} from "../../Config/helper";
import CameraComponent from "../../Components/CameraComponent";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import Icon from "react-native-vector-icons/AntDesign";
import { Camera } from "react-native-vision-camera";
import {
    fetchAreas,
    fetchdistributors,
    fetchRoutes,
    fetchState,
    putRetailer,
} from "../../Api/retailers";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const EditCustomer = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const [formData, setFormData] = useState({
        Retailer_Id: item.Retailer_Id || "",
        Retailer_Name: item.Retailer_Name || "",
        Contact_Person: item.Contact_Person || "",
        Mobile_No: item.Mobile_No || "",
        Retailer_Channel_Id: item.Retailer_Channel_Id || "",
        Retailer_Class: item.Retailer_Class || "",
        Route_Id: item.Route_Id || "",
        Area_Id: item.Area_Id || "",
        State_Id: item.State_Id || "",
        Profile_Pic: item.Profile_Pic || "",
        Reatailer_Address: item.Reatailer_Address || "",
        Reatailer_City: item.Reatailer_City || "",
        PinCode: item.PinCode || "",
        Sales_Force_Id: item.Sales_Force_Id || "",
        Distributor_Id: item.Distributor_Id || "",
        Gstno: item.Gstno || "",
        Created_By: item.Created_By || "",
        Company_Id: item.Company_Id || "",
    });

    const [showCamera, setShowCamera] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);

    const [currentPhoto, setCurrentPhoto] = useState(
        item.Profile_Pic ? { uri: item.Profile_Pic } : null,
    );

    const { data: routes = [] } = useQuery({
        queryKey: ["Route_Name"],
        queryFn: fetchRoutes,
    });

    const { data: areas = [] } = useQuery({
        queryKey: ["Area_Name"],
        queryFn: fetchAreas,
    });

    const { data: states = [] } = useQuery({
        queryKey: ["State_Name"],
        queryFn: fetchState,
    });

    const { data: distributors = [] } = useQuery({
        queryKey: ["Distributor_Name"],
        queryFn: fetchdistributors,
    });

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermission();
            setHasPermission(status === "authorized");
        })();
    }, []);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handlePhotoCapture = useCallback(photoPath => {
        setCurrentPhoto({ uri: photoPath });
        setFormData(prev => ({ ...prev, Profile_Pic: photoPath }));
        setShowCamera(false);
    }, []);

    const mutation = useMutation({
        mutationFn: putRetailer,
        onSuccess: data => {
            ToastAndroid.show(
                data.message || "Retailer updated successfully.",
                ToastAndroid.LONG,
            );
            navigation.reset({
                index: 0,
                routes: [{ name: "HomeScreen" }],
            });
        },
        onError: err => {
            console.error("Update error:", err);
            Alert.alert("Error", err.message || "Failed to update retailer.");
        },
    });

    const handleSubmit = useCallback(() => {
        if (!formData.Company_Id) {
            Alert.alert("Error", "Company ID is missing");
            return;
        }

        // Prepare the photo data
        const photoData = currentPhoto
            ? {
                  uri: currentPhoto.uri,
                  type: "image/jpeg",
                  name: "photo.jpg",
              }
            : null;

        mutation.mutate({
            formValues: formData,
            currentPhoto: photoData,
            originalPhoto: item.Profile_Pic,
        });
    }, [formData, currentPhoto, item.Profile_Pic]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Edit Retailer" navigation={navigation} />

            {showCamera ? (
                <View style={styles.cameraContainer}>
                    {hasPermission === null ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color={customColors.primary}
                            />
                            <Text style={styles.loadingText}>
                                Requesting camera permission...
                            </Text>
                        </View>
                    ) : hasPermission === false ? (
                        <View style={styles.errorContainer}>
                            <Icon
                                name="error"
                                size={40}
                                color={customColors.accent2}
                            />
                            <Text style={styles.errorText}>
                                Camera permission denied
                            </Text>
                            <TouchableOpacity
                                style={styles.permissionButton}
                                onPress={() => Linking.openSettings()}>
                                <Text style={styles.permissionButtonText}>
                                    Open Settings
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <CameraComponent
                            onPhotoCapture={handlePhotoCapture}
                            showCamera={setShowCamera}
                        />
                    )}
                </View>
            ) : (
                <ScrollView style={styles.contentContainer}>
                    <View style={styles.formContainer}>
                        <View style={styles.imageSection}>
                            <View style={styles.photoContainer}>
                                {currentPhoto ? (
                                    <TouchableOpacity
                                        onPress={() =>
                                            setShowImagePreview(true)
                                        }
                                        activeOpacity={0.9}>
                                        <Image
                                            source={currentPhoto}
                                            style={styles.previewImage}
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Icon
                                            name="camera-alt"
                                            size={40}
                                            color={customColors.grey500}
                                        />
                                        <Text style={styles.placeholderText}>
                                            No Photo
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.updatePhotoButton}
                                    onPress={() => setShowCamera(true)}>
                                    <Icon
                                        name="camera-alt"
                                        size={20}
                                        color={customColors.white}
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.updatePhotoText}>
                                        {currentPhoto
                                            ? "Update Photo"
                                            : "Add Photo"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Basic input fields */}
                        {[
                            { label: "Retailer Name", field: "Retailer_Name" },
                            {
                                label: "Contact Person",
                                field: "Contact_Person",
                            },
                            {
                                label: "Mobile Number",
                                field: "Mobile_No",
                            },
                            {
                                label: "GST Number",
                                field: "Gstno",
                                autoCapitalize: "characters",
                            },
                            {
                                label: "Retailer Address",
                                field: "Reatailer_Address",
                            },
                        ].map(({ label, field, ...props }) => (
                            <View key={field} style={styles.fieldContainer}>
                                <FormField
                                    label={label}
                                    required
                                    // error={{}}
                                    value={formData[field]}
                                    onChangeText={text =>
                                        handleInputChange(field, text)
                                    }
                                    placeholder={label}
                                />
                            </View>
                        ))}

                        <EnhancedDropdown
                            data={routes}
                            labelField="Route_Name"
                            valueField="Route_Id"
                            placeholder="Select Route"
                            value={formData.Route_Id}
                            onChange={item =>
                                handleInputChange("Route_Id", item.Route_Id)
                            }
                        />

                        <EnhancedDropdown
                            data={areas}
                            labelField="Area_Name"
                            valueField="Area_Id"
                            placeholder="Select Area"
                            value={formData.Area_Id}
                            onChange={item =>
                                handleInputChange("Area_Id", item.Area_Id)
                            }
                        />

                        <EnhancedDropdown
                            data={states}
                            labelField="State_Name"
                            valueField="State_Id"
                            placeholder="Select State"
                            value={formData.State_Id}
                            onChange={item =>
                                handleInputChange("State_Id", item.State_Id)
                            }
                        />

                        <EnhancedDropdown
                            data={distributors}
                            labelField="Distributor_Name"
                            valueField="Distributor_Id"
                            placeholder="Select Distributor"
                            value={formData.Distributor_Id}
                            onChange={item =>
                                handleInputChange(
                                    "Distributor_Id",
                                    item.Distributor_Id,
                                )
                            }
                        />

                        <TouchableOpacity
                            style={[
                                styles.updateButton,
                                mutation.isPending && styles.disabledButton,
                            ]}
                            onPress={handleSubmit}
                            disabled={mutation.isPending}>
                            <Text style={styles.updateButtonText}>
                                {mutation.isPending ? "Updating..." : "Update"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            <Modal
                visible={showImagePreview}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImagePreview(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        onPress={() => setShowImagePreview(false)}
                        style={styles.closeButton}>
                        <Icon
                            name="close"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Image
                        source={currentPhoto}
                        style={styles.modalImage}
                        resizeMode="contain"
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.updateButton]}
                            onPress={() => {
                                setShowImagePreview(false);
                                setShowCamera(true);
                            }}>
                            <Icon
                                name="camera"
                                size={20}
                                color={customColors.white}
                                style={styles.buttonIcon}
                            />
                            <Text style={styles.modalButtonText}>
                                Update Photo
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.closeModalButton,
                            ]}
                            onPress={() => setShowImagePreview(false)}>
                            <Text
                                style={[
                                    styles.modalButtonText,
                                    styles.closeButtonText,
                                ]}>
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: customColors.background,
    },
    formContainer: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.lg,
        ...shadows.medium,
    },
    imageSection: {
        alignItems: "center",
        marginBottom: spacing.xl,
    },
    photoContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        overflow: "hidden",
        backgroundColor: customColors.grey100,
        ...shadows.medium,
    },
    previewImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    placeholderImage: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.grey200,
    },
    placeholderText: {
        ...typography.subtitle2(),
        color: customColors.grey500,
        marginTop: spacing.xs,
    },
    updatePhotoButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: customColors.primary,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        ...shadows.small,
    },
    updatePhotoText: {
        ...typography.button(),
        color: customColors.white,
    },
    fieldContainer: {
        marginBottom: spacing.md,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: spacing.xl,
        right: spacing.xl,
        zIndex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: 16,
        ...shadows.large,
    },
    modalActions: {
        position: "absolute",
        bottom: spacing.xl,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.md,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: spacing.md,
        borderRadius: 16,
        ...shadows.medium,
    },
    modalButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        maxWidth: 200,
    },
    updateButton: {
        ...componentStyles.button.primary,
        marginTop: spacing.xl,
    },
    disabledButton: {
        backgroundColor: customColors.grey500,
        opacity: 0.7,
    },
    updateButtonText: {
        textAlign: "center",
        ...typography.button(),
        color: customColors.white,
    },
    closeModalButton: {
        ...componentStyles.button.secondary,
        backgroundColor: customColors.grey200,
        marginTop: spacing.xl,
    },
    modalButtonText: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
    },
    closeButtonText: {
        color: customColors.grey900,
    },
    buttonIcon: {
        marginRight: spacing.xs,
    },
    cameraContainer: {
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.black,
        padding: spacing.xl,
    },
    errorText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginTop: spacing.md,
        textAlign: "center",
    },
    permissionButton: {
        marginTop: spacing.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: customColors.primary,
        borderRadius: 8,
    },
    permissionButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
});

export default EditCustomer;
