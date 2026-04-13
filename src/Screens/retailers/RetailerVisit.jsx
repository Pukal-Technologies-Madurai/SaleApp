import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import CustomRadioButton from "../../Components/CustomRadioButton";
import LocationIndicator from "../../Components/LocationIndicator";
import OpenCamera from "../../Components/OpenCamera";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    fetchRetailers,
    fetchRoutePathData,
    visitEntry,
} from "../../Api/retailers";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import { SafeAreaView } from "react-native-safe-area-context";

const RetailerVisit = () => {
    const navigation = useNavigation();
    const scrollViewRef = useRef(null);
    const [userId, setUserId] = useState();
    const [companyId, setCompanyId] = useState(null);
    const [selectedRetail, setSelectedRetail] = useState(null);
    const [formValues, setFormValues] = useState({
        Retailer_Id: selectedRetail,
        Retailer_Name: "",
        Contact_Person: "",
        Mobile_No: "",
        Route_Id: "",
        Location_Address: "",
        Narration: "",
        Location_Image: "",
    });
    const [selectedValue, setSelectedValue] = useState("new");
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem("Company_Id").then(id => {
            setCompanyId(id);
        });
        AsyncStorage.getItem("UserId").then(id => {
            setUserId(id);
        });
    }, []);

    const { data: retailerData = [] } = useQuery({
        queryKey: ["retailers", companyId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId,
    });

    const currentDate = new Date().toISOString().split("T")[0];

    const { data: existingRouteData = [] } = useQuery({
        queryKey: ["routePath", currentDate, userId],
        queryFn: () => fetchRoutePathData(currentDate, userId),
        enabled: !!userId,
    });

    // Filter retailers based on existing route data
    const getFilteredRetailers = () => {
        // Check if there's any existing route data
        if (!existingRouteData || existingRouteData.length === 0) {
            // No route data exists, return all retailers
            return retailerData;
        }

        // Find active route
        const activeRoute = existingRouteData.find(
            route => route.IsActive === 1,
        );

        if (!activeRoute) {
            // No active route, return all retailers
            return retailerData;
        }

        // Filter retailers based on the active route's Route_Id
        const filteredRetailers = retailerData.filter(
            retailer => retailer.Route_Id === activeRoute.Route_Id,
        );

        return filteredRetailers;
    };

    const filteredRetailers = getFilteredRetailers();

    // Get route information for display
    const getRouteInfo = () => {
        if (!existingRouteData || existingRouteData.length === 0) {
            return null;
        }

        const activeRoute = existingRouteData.find(
            route => route.IsActive === 1,
        );

        if (!activeRoute) {
            return null;
        }

        // Find a retailer with matching Route_Id to get RouteGet information
        const routeRetailer = retailerData.find(
            retailer => retailer.Route_Id === activeRoute.Route_Id,
        );

        return routeRetailer ? routeRetailer.RouteGet : null;
    };

    const routeInfo = getRouteInfo();

    const handleInputChange = (fieldName, value) => {
        setFormValues(prevState => ({
            ...prevState,
            [fieldName]: value,
        }));
    };

    const handlePhotoCapture = async photoPath => {
        setCapturedPhotoPath(photoPath);
        handleInputChange("Location_Image", photoPath);
        setShowCamera(false);
    };

    const handlePreviewPress = () => {
        if (capturedPhotoPath) {
            setShowPreview(true);
        } else {
            setShowCamera(true);
        }
    };

    const mutation = useMutation({
        mutationFn: visitEntry,
        onSuccess: () => {
            ToastAndroid.show("Entry done", ToastAndroid.LONG);
            navigation.navigate("HomeScreen");
            setLocation({ latitude: null, longitude: null });
            setFormValues({
                Retailer_Name: "",
                Contact_Person: "",
                Mobile_No: "",
                Location_Address: "",
                Narration: "",
                Location_Image: "",
            });
            setSelectedRetail(null);
            setSelectedValue(null);
            setCapturedPhotoPath(null);
        },
        onError: error => {
            Alert.alert("Error", error.message || "Error submitting form");
        },
    });

    const handleSubmit = async () => {
        mutation.mutate({
            formValues,
            imageUri: formValues.Location_Image,
            selectedValue,
            selectedRetail,
            location,
            userId,
            capturedPhotoPath,
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Visit Entry" navigation={navigation} />

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.contentContainer}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.locationSection}>
                        <LocationIndicator
                            onLocationUpdate={locationData =>
                                setLocation(locationData)
                            }
                            autoFetch={true}
                            autoFetchOnMount={true}
                        />
                    </View>

                    <View style={styles.radioSection}>
                        <CustomRadioButton
                            label="New Shop"
                            icon="plus-circle"
                            selected={selectedValue === "new"}
                            onSelect={() => setSelectedValue("new")}
                        />
                        <View style={{ width: spacing.md }} />
                        <CustomRadioButton
                            label="Regular Shop"
                            icon="users"
                            selected={selectedValue === "exist"}
                            onSelect={() => setSelectedValue("exist")}
                        />
                    </View>

                {selectedValue === "exist" && (
                    <View style={styles.formSection}>
                        <View style={styles.formCard}>
                            {/* Show filtered retailers count */}
                            {routeInfo && (
                                <View style={styles.routeInfoCard}>
                                    <FeatherIcon
                                        name="map-pin"
                                        size={iconSizes.sm}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.retailerCountText}>
                                        {filteredRetailers.length} retailers in{" "}
                                        <Text style={styles.routeName}>
                                            {routeInfo}
                                        </Text>
                                    </Text>
                                </View>
                            )}

                            <EnhancedDropdown
                                data={filteredRetailers}
                                labelField="Retailer_Name"
                                valueField="Retailer_Id"
                                placeholder={
                                    filteredRetailers.length > 0
                                        ? "Select Retailer"
                                        : "No retailers available"
                                }
                                value={selectedRetail}
                                onChange={item => {
                                    setSelectedRetail(item.Retailer_Id);
                                    handleInputChange(
                                        "Retailer_Id",
                                        item.Retailer_Id,
                                    );
                                }}
                                disabled={filteredRetailers.length === 0}
                            />

                            <FormField
                                label="Narration"
                                value={formValues.Narration}
                                onChangeText={text =>
                                    handleInputChange("Narration", text)
                                }
                                placeholder="Enter visit notes..."
                                multiline
                                inputProps={{
                                    onFocus: () => {
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({
                                                animated: true,
                                            });
                                        }, 150);
                                    },
                                }}
                            />

                            <View style={styles.photoSection}>
                                {capturedPhotoPath ? (
                                    <TouchableOpacity
                                        onPress={handlePreviewPress}
                                        activeOpacity={0.9}>
                                        <Image
                                            source={{
                                                uri: "file://" + capturedPhotoPath,
                                            }}
                                            style={styles.capturedImage}
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <FeatherIcon
                                            name="camera"
                                            size={iconSizes.xl}
                                            color={customColors.grey400}
                                        />
                                        <Text style={styles.photoPlaceholderText}>
                                            Add Photo
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={handlePreviewPress}
                                    style={styles.cameraButton}
                                    activeOpacity={0.8}>
                                    <FeatherIcon
                                        name="camera"
                                        size={iconSizes.md}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.cameraButtonText}>
                                        {capturedPhotoPath
                                            ? "Update Photo"
                                            : "Take Photo"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[
                                    styles.submitButton,
                                    filteredRetailers.length === 0 &&
                                        styles.submitButtonDisabled,
                                ]}
                                disabled={
                                    filteredRetailers.length === 0 ||
                                    mutation.isPending
                                }
                                activeOpacity={0.8}>
                                <FeatherIcon
                                    name="check-circle"
                                    size={iconSizes.md}
                                    color={customColors.white}
                                />
                                <Text style={styles.submitButtonText}>
                                    {mutation.isPending
                                        ? "Submitting..."
                                        : "Submit Visit"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {selectedValue === "new" && (
                    <View style={styles.formSection}>
                        <View style={styles.formCard}>
                            <FormField
                                label="Retailer Name"
                                required
                                value={formValues.Retailer_Name}
                                onChangeText={text =>
                                    handleInputChange("Retailer_Name", text)
                                }
                                placeholder="Enter retailer name"
                            />

                            <FormField
                                label="Contact Person"
                                value={formValues.Contact_Person}
                                onChangeText={text =>
                                    handleInputChange("Contact_Person", text)
                                }
                                placeholder="Contact person name"
                            />

                            <FormField
                                label="Mobile Number"
                                value={formValues.Mobile_No}
                                onChangeText={text =>
                                    handleInputChange("Mobile_No", text)
                                }
                                placeholder="10-digit mobile number"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <FormField
                                label="Address"
                                value={formValues.Location_Address}
                                onChangeText={text =>
                                    handleInputChange("Location_Address", text)
                                }
                                placeholder="Shop address"
                                multiline
                                inputProps={{
                                    onFocus: () => {
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({
                                                animated: true,
                                            });
                                        }, 150);
                                    },
                                }}
                            />

                            <FormField
                                label="Narration"
                                value={formValues.Narration}
                                onChangeText={text =>
                                    handleInputChange("Narration", text)
                                }
                                placeholder="Visit notes..."
                                multiline
                                inputProps={{
                                    onFocus: () => {
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({
                                                animated: true,
                                            });
                                        }, 150);
                                    },
                                }}
                            />

                            <View style={styles.photoSection}>
                                {capturedPhotoPath ? (
                                    <TouchableOpacity
                                        onPress={handlePreviewPress}
                                        activeOpacity={0.9}>
                                        <Image
                                            source={{
                                                uri: "file://" + capturedPhotoPath,
                                            }}
                                            style={styles.capturedImage}
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <FeatherIcon
                                            name="camera"
                                            size={iconSizes.xl}
                                            color={customColors.grey400}
                                        />
                                        <Text style={styles.photoPlaceholderText}>
                                            Add Photo
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={handlePreviewPress}
                                    style={styles.cameraButton}
                                    activeOpacity={0.8}>
                                    <FeatherIcon
                                        name="camera"
                                        size={iconSizes.md}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.cameraButtonText}>
                                        {capturedPhotoPath
                                            ? "Update Photo"
                                            : "Take Photo"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[
                                    styles.submitButton,
                                    mutation.isPending &&
                                        styles.submitButtonDisabled,
                                ]}
                                disabled={mutation.isPending}
                                activeOpacity={0.8}>
                                <FeatherIcon
                                    name="check-circle"
                                    size={iconSizes.md}
                                    color={customColors.white}
                                />
                                <Text style={styles.submitButtonText}>
                                    {mutation.isPending
                                        ? "Submitting..."
                                        : "Submit Visit"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Camera Modal */}
            <Modal
                visible={showCamera}
                animationType="slide"
                onRequestClose={() => setShowCamera(false)}
                statusBarTranslucent>
                <View style={styles.cameraModalContainer}>
                    <OpenCamera
                        onPhotoCapture={handlePhotoCapture}
                        enableCompression={true}
                        onClose={() => setShowCamera(false)}
                    />
                </View>
            </Modal>

            {/* Photo Preview Modal */}
            <Modal
                visible={showPreview}
                animationType="fade"
                onRequestClose={() => setShowPreview(false)}
                transparent={true}>
                <View style={styles.previewModalContainer}>
                    <View style={styles.previewContent}>
                        <View style={styles.previewHeader}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowPreview(false)}
                                activeOpacity={0.8}>
                                <FeatherIcon
                                    name="x"
                                    size={iconSizes.lg}
                                    color={customColors.white}
                                />
                            </TouchableOpacity>
                        </View>

                        <Image
                            source={{ uri: "file://" + capturedPhotoPath }}
                            style={styles.previewImage}
                            resizeMode="contain"
                        />

                        <View style={styles.previewActions}>
                            <TouchableOpacity
                                style={[
                                    styles.previewButton,
                                    styles.retakeButton,
                                ]}
                                onPress={() => {
                                    setShowPreview(false);
                                    setShowCamera(true);
                                }}
                                activeOpacity={0.8}>
                                <FeatherIcon
                                    name="refresh-cw"
                                    size={iconSizes.md}
                                    color={customColors.white}
                                />
                                <Text style={styles.previewButtonText}>
                                    Retake
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.previewButton,
                                    styles.closePreviewButton,
                                ]}
                                onPress={() => setShowPreview(false)}
                                activeOpacity={0.8}>
                                <FeatherIcon
                                    name="check"
                                    size={iconSizes.md}
                                    color={customColors.white}
                                />
                                <Text style={styles.previewButtonText}>
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    keyboardAvoid: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 120,
    },
    locationSection: {
        marginBottom: spacing.md,
    },
    radioSection: {
        flexDirection: "row",
        marginBottom: spacing.lg,
    },
    formSection: {
        flex: 1,
    },
    formCard: {
        // Empty - form elements handle their own spacing
    },
    routeInfoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary + "10",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    retailerCountText: {
        ...typography.caption(),
        color: customColors.grey700,
        flex: 1,
    },
    routeName: {
        fontWeight: "600",
        color: customColors.primary,
    },
    photoSection: {
        alignItems: "center",
        marginVertical: spacing.md,
    },
    capturedImage: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        backgroundColor: customColors.grey100,
    },
    photoPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderStyle: "dashed",
    },
    photoPlaceholderText: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xs,
    },
    cameraButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.small,
    },
    cameraButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: spacing.xs,
        gap: spacing.sm,
        ...shadows.medium,
    },
    submitButtonDisabled: {
        backgroundColor: customColors.grey400,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    cameraModalContainer: {
        flex: 1,
        backgroundColor: customColors.black,
    },
    previewModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewContent: {
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
    },
    previewHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        padding: spacing.md,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.round,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    previewActions: {
        flexDirection: "row",
        justifyContent: "center",
        padding: spacing.lg,
        gap: spacing.lg,
    },
    previewButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        maxWidth: 160,
        ...shadows.medium,
    },
    retakeButton: {
        backgroundColor: customColors.grey700,
    },
    closePreviewButton: {
        backgroundColor: customColors.success,
    },
    previewButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});

export default RetailerVisit;
