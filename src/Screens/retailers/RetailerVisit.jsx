import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
    Modal,
    Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/AntDesign";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import {
    customColors,
    typography,
    spacing,
    shadows,
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

const RetailerVisit = () => {
    const navigation = useNavigation();
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
        <View style={styles.container}>
            <AppHeader title="Visit Entry" navigation={navigation} />

            <View style={styles.contentContainer}>
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
                        label="New shop"
                        selected={selectedValue === "new"}
                        onSelect={() => setSelectedValue("new")}
                    />
                    <CustomRadioButton
                        label="Regular shop"
                        selected={selectedValue === "exist"}
                        onSelect={() => setSelectedValue("exist")}
                    />
                </View>

                {selectedValue === "exist" && (
                    <View style={styles.formSection}>
                        <ScrollView
                            keyboardShouldPersistTaps="always"
                            nestedScrollEnabled={true}
                            contentContainerStyle={styles.scrollContent}>
                            <View style={styles.formCard}>
                                {/* Show filtered retailers count */}
                                {routeInfo && (
                                    <Text style={styles.retailerCountText}>
                                        {filteredRetailers.length} retailers
                                        available in {routeInfo}
                                    </Text>
                                )}

                                <EnhancedDropdown
                                    data={filteredRetailers}
                                    labelField="Retailer_Name"
                                    valueField="Retailer_Id"
                                    placeholder={
                                        filteredRetailers.length > 0
                                            ? "Select Retailer"
                                            : "No retailers available for this route"
                                    }
                                    value={selectedRetail}
                                    onChange={item => {
                                        setSelectedRetail(item.Retailer_Id);
                                        handleInputChange(
                                            "Retailer_Id",
                                            item.Retailer_Id,
                                        );
                                    }}
                                    disable={filteredRetailers.length === 0}
                                />

                                <FormField
                                    value={formValues.Narration}
                                    onChangeText={text =>
                                        handleInputChange("Narration", text)
                                    }
                                    placeholder="Enter a narration"
                                    multiline
                                />

                                <TouchableOpacity
                                    onPress={handlePreviewPress}
                                    style={styles.cameraButton}>
                                    <MaterialIcon
                                        name="camera-alt"
                                        size={24}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.cameraButtonText}>
                                        {!capturedPhotoPath
                                            ? "Take Photo"
                                            : "Preview Photo"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    style={[
                                        styles.button,
                                        {
                                            marginVertical: spacing.md,
                                            backgroundColor:
                                                filteredRetailers.length === 0
                                                    ? customColors.grey400
                                                    : customColors.primary,
                                        },
                                    ]}
                                    disabled={filteredRetailers.length === 0}>
                                    <Text style={styles.buttonText}>
                                        Submit
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {selectedValue === "new" && (
                    <View style={styles.formSection}>
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}>
                            <View style={styles.formCard}>
                                <FormField
                                    value={formValues.Retailer_Name}
                                    onChangeText={text =>
                                        handleInputChange("Retailer_Name", text)
                                    }
                                    placeholder="Enter retailer name"
                                />

                                <FormField
                                    value={formValues.Contact_Person}
                                    onChangeText={text =>
                                        handleInputChange(
                                            "Contact_Person",
                                            text,
                                        )
                                    }
                                    placeholder="Contact Person"
                                />

                                <FormField
                                    value={formValues.Mobile_No}
                                    onChangeText={text =>
                                        handleInputChange("Mobile_No", text)
                                    }
                                    placeholder="Mobile Number"
                                />

                                <FormField
                                    value={formValues.Location_Address}
                                    onChangeText={text =>
                                        handleInputChange(
                                            "Location_Address",
                                            text,
                                        )
                                    }
                                    placeholder="Address"
                                    multiline
                                />

                                <FormField
                                    value={formValues.Narration}
                                    onChangeText={text =>
                                        handleInputChange("Narration", text)
                                    }
                                    placeholder="Enter a narration"
                                    multiline
                                />

                                <TouchableOpacity
                                    onPress={handlePreviewPress}
                                    style={styles.cameraButton}>
                                    <MaterialIcon
                                        name="camera-alt"
                                        size={24}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.cameraButtonText}>
                                        {!capturedPhotoPath
                                            ? "Take Photo"
                                            : "Preview Photo"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    style={[
                                        styles.button,
                                        { marginVertical: spacing.md },
                                    ]}>
                                    <Text style={styles.buttonText}>
                                        Submit
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

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
                    animationType="slide"
                    onRequestClose={() => setShowPreview(false)}
                    transparent={true}>
                    <View style={styles.previewModalContainer}>
                        <View style={styles.previewContent}>
                            <View style={styles.previewHeader}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setShowPreview(false)}>
                                    <Icon
                                        name="close"
                                        size={24}
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
                                    }}>
                                    <MaterialIcon
                                        name="camera-alt"
                                        size={24}
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
                                    onPress={() => setShowPreview(false)}>
                                    <MaterialIcon
                                        name="check"
                                        size={24}
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
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: customColors.white,
    },
    locationSection: {
        marginBottom: spacing.xs,
    },
    radioSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.xs,
        // paddingHorizontal: spacing.sm,
    },
    formSection: {
        flex: 1,
        marginBottom: spacing.xl,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    formCard: {
        // backgroundColor: customColors.white,
        // borderRadius: spacing.xl,
        // padding: spacing.sm,
        // ...shadows.small,
    },
    dropdownContainer: {
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: spacing.md,
        ...shadows.small,
    },
    button: {
        flex: 1,
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.small,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    clearPhotoButton: {
        backgroundColor: customColors.error,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        marginTop: spacing.md,
        ...shadows.small,
    },
    cameraModalContainer: {
        flex: 1,
        backgroundColor: customColors.black,
    },
    cameraButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: spacing.md,
        marginTop: spacing.md,
        gap: spacing.sm,
        ...shadows.small,
    },
    cameraButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    previewModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
        justifyContent: "space-around",
        padding: spacing.md,
        gap: spacing.md,
    },
    previewButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.md,
        borderRadius: spacing.md,
        gap: spacing.sm,
    },
    retakeButton: {
        backgroundColor: customColors.primary,
    },
    closePreviewButton: {
        backgroundColor: customColors.success,
    },
    previewButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    retailerCountText: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
        marginBottom: spacing.sm,
        fontStyle: "italic",
    },
});

export default RetailerVisit;
