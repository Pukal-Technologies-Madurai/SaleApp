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
} from "react-native";
import React, { useCallback, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    customColors,
    spacing,
    typography,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import OpenCamera from "../../Components/OpenCamera";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import Icon from "react-native-vector-icons/AntDesign";
import FeatherIcon from "react-native-vector-icons/Feather";
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
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}] 
                    }
                }],
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
                <OpenCamera
                    onPhotoCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            ) : (
                <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
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
                                        <FeatherIcon
                                            name="camera"
                                            size={iconSizes.xxl}
                                            color={customColors.grey400}
                                        />
                                        <Text style={styles.placeholderText}>
                                            Add Photo
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.updatePhotoButton}
                                    onPress={() => setShowCamera(true)}
                                    activeOpacity={0.8}>
                                    <FeatherIcon
                                        name="camera"
                                        size={iconSizes.md}
                                        color={customColors.white}
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.updatePhotoText}>
                                        {currentPhoto
                                            ? "Update Photo"
                                            : "Take Photo"}
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
                            size={iconSizes.lg}
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
                                size={iconSizes.md}
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
        backgroundColor: customColors.grey50,
    },
    formContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.medium,
    },
    imageSection: {
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    photoContainer: {
        alignItems: "center",
    },
    previewImage: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.lg,
        resizeMode: "cover",
        backgroundColor: customColors.grey100,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderWidth: 2,
        borderColor: customColors.grey200,
        borderStyle: "dashed",
    },
    placeholderText: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xs,
    },
    updatePhotoButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: customColors.primary,
        borderRadius: borderRadius.lg,
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
        marginBottom: spacing.sm,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: spacing.xxl,
        right: spacing.lg,
        zIndex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: borderRadius.round,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: borderRadius.xl,
        ...shadows.large,
    },
    modalActions: {
        position: "absolute",
        bottom: spacing.xxl,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.md,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: spacing.md,
        borderRadius: borderRadius.xl,
    },
    modalButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        maxWidth: 180,
    },
    updateButton: {
        backgroundColor: customColors.primary,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.small,
    },
    disabledButton: {
        backgroundColor: customColors.grey400,
    },
    updateButtonText: {
        textAlign: "center",
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    closeModalButton: {
        backgroundColor: customColors.grey200,
        marginTop: spacing.lg,
    },
    modalButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    closeButtonText: {
        color: customColors.grey900,
    },
    buttonIcon: {
        marginRight: spacing.sm,
    },
});

export default EditCustomer;
