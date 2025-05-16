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
    componentStyles,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import CustomRadioButton from "../../Components/CustomRadioButton";
import LocationIndicator from "../../Components/LocationIndicator";
import CameraComponent from "../../Components/CameraComponent";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import assetImages from "../../Config/Image";
import { fetchRetailers, visitEntry } from "../../Api/retailers";
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
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

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

    const handleInputChange = (fieldName, value) => {
        setFormValues(prevState => ({
            ...prevState,
            [fieldName]: value,
        }));
    };

    const handlePhotoCapture = async photoPath => {
        setCapturedPhotoPath(photoPath);
        handleInputChange("Location_Image", photoPath);
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
    };

    const validateInputs = () => {
        if (selectedValue === "new") {
            if (formValues.Retailer_Name.trim() === "") {
                ToastAndroid.show(
                    "Please enter the Shop Name",
                    ToastAndroid.LONG,
                );
                return false;
            }
            if (formValues.Contact_Person.trim() === "") {
                ToastAndroid.show(
                    "Please enter the Shop Owner Name",
                    ToastAndroid.LONG,
                );
                return false;
            }
            if (formValues.Mobile_No.trim().length !== 10) {
                ToastAndroid.show(
                    "Please enter a valid 10-digit Mobile Number",
                    ToastAndroid.LONG,
                );
                return false;
            }
        }
        return true;
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
                        label="New Retailer"
                        selected={selectedValue === "new"}
                        onSelect={() => setSelectedValue("new")}
                    />
                    <CustomRadioButton
                        label="Existing Retailer"
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
                                <EnhancedDropdown
                                    data={retailerData}
                                    labelField="Retailer_Name"
                                    valueField="Retailer_Id"
                                    placeholder="Select Retailer"
                                    value={selectedRetail}
                                    containerStyle={styles.dropdownContainer}
                                    onChange={item => {
                                        setSelectedRetail(item.Retailer_Id);
                                        handleInputChange(
                                            "Retailer_Id",
                                            item.Retailer_Id,
                                        );
                                    }}
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
                                    onPress={() => setShowCameraModal(true)}
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
                                    onPress={() => setShowCameraModal(true)}
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
                            </View>
                        </ScrollView>
                    </View>
                )}

                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={styles.button}>
                        <Text style={styles.buttonText}>Submit</Text>
                    </TouchableOpacity>
                </View>

                {/* Camera Modal */}
                <Modal
                    visible={showCameraModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowCameraModal(false)}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity
                            onPress={() => setShowCameraModal(false)}
                            style={styles.closeButton}>
                            <Icon
                                name="close"
                                size={24}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        {!capturedPhotoPath ? (
                            <CameraComponent
                                onPhotoCapture={handlePhotoCapture}
                            />
                        ) : (
                            capturedPhotoPath &&
                            typeof capturedPhotoPath === "string" && (
                                <View style={styles.previewImageContainer}>
                                    <Image
                                        source={{
                                            uri: "file://" + capturedPhotoPath,
                                        }}
                                        style={styles.previewImage}
                                    />
                                    <TouchableOpacity
                                        onPress={clearPhoto}
                                        style={styles.clearPhotoButton}>
                                        <Text style={styles.buttonText}>
                                            Retake Photo
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setShowCameraModal(false)
                                        }
                                        style={styles.button}>
                                        <Text style={styles.buttonText}>
                                            Okay
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        )}
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
    buttonGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.md,
        backgroundColor: customColors.white,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        ...shadows.medium,
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
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: spacing.xl,
        right: spacing.xl,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    previewImageContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    previewImage: {
        width: "90%",
        height: "70%",
        borderRadius: spacing.md,
        ...shadows.large,
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
});

export default RetailerVisit;
