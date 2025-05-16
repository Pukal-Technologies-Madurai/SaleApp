import {
    View,
    Text,
    ToastAndroid,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import LocationIndicator from "../../Components/LocationIndicator";
import {
    customColors,
    typography,
    spacing,
    shadows,
    componentStyles,
} from "../../Config/helper";
import { fetchAreas, fetchRoutes, postRetailer } from "../../Api/retailers";
import FormField from "../../Components/FormField";

const AddCustomer = () => {
    const navigation = useNavigation();

    const [formValues, setFormValues] = useState({
        Retailer_Name: "",
        Contact_Person: "",
        Mobile_No: "",
        Route_Id: "",
        Area_Id: "",
        Reatailer_Address: "",
        Reatailer_City: "",
        PinCode: "",
        State_Id: 1,
        Gstno: "",
        Latitude: "",
        Longitude: "",
        Profile_Pic: "",
        Branch_Id: "",
        Created_By: "",
        Company_Id: "",
        Retailer_Class: "A",
        Retailer_Channel_Id: "0",
    });

    const [selectRoutes, setSelectRoutes] = useState(null);
    const [selectAreas, setSelectAreas] = useState(null);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    const [errors, setErrors] = useState({});
    const [imageUri, setImageUri] = useState(null);

    useEffect(() => {
        loadAsyncStorageData();
    }, []);

    const loadAsyncStorageData = async () => {
        try {
            const branchId = await AsyncStorage.getItem("branchId");
            const userId = await AsyncStorage.getItem("UserId");
            const companyId = await AsyncStorage.getItem("Company_Id");

            setFormValues(prevState => ({
                ...prevState,
                Branch_Id: branchId || "",
                Created_By: userId || "",
                Company_Id: companyId || "",
            }));
        } catch (error) {
            console.error("Error loading AsyncStorage data: ", error);
        }
    };

    const { data: routes = [] } = useQuery({
        queryKey: ["routes"],
        queryFn: fetchRoutes,
    });

    const { data: areas = [] } = useQuery({
        queryKey: ["areas"],
        queryFn: fetchAreas,
    });

    const isLoading = !routes.length || !areas.length;

    // if (!isLoading) {
    //     return (
    //         <View style={styles.centered}>
    //             <ActivityIndicator size="large" color={customColors.primary} />
    //             <Text>Loading data...</Text>
    //         </View>
    //     );
    // }

    useEffect(() => {
        if (location.latitude && location.longitude) {
            setFormValues(prev => ({
                ...prev,
                Latitude: location.latitude.toString(),
                Longitude: location.longitude.toString(),
            }));
        }
    }, [location]);

    const handleLocationUpdate = locationData => {
        setLocation(locationData);
    };

    const handleInputChange = (field, value) => {
        setFormValues(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleOpenCamera = () => {
        navigation.navigate("OpenCamera", {
            onImageCapture: handleImageCapture,
        });
    };

    const handleImageCapture = uri => {
        setImageUri(uri);
        setFormValues({ ...formValues, profilePic: uri });
    };

    const validateForm = () => {
        const newErrors = {};

        // Retailer Name validation
        if (!formValues.Retailer_Name.trim()) {
            newErrors.Retailer_Name = "Retailer Name is required";
        } else if (formValues.Retailer_Name.length < 3) {
            newErrors.Retailer_Name =
                "Retailer Name must be at least 3 characters";
        }

        // Contact Person validation
        if (!formValues.Contact_Person.trim()) {
            newErrors.Contact_Person = "Contact Person is required";
        } else if (formValues.Contact_Person.length < 3) {
            newErrors.Contact_Person =
                "Contact Person name must be at least 3 characters";
        }

        // Mobile Number validation
        if (!formValues.Mobile_No) {
            newErrors.Mobile_No = "Mobile Number is required";
        } else if (!/^\d{10}$/.test(formValues.Mobile_No)) {
            newErrors.Mobile_No = "Mobile Number must be 10 digits";
        }

        // Address validation
        if (!formValues.Reatailer_Address.trim()) {
            newErrors.Reatailer_Address = "Address is required";
        } else if (formValues.Reatailer_Address.length < 5) {
            newErrors.Reatailer_Address =
                "Address must be at least 5 characters";
        }

        // City validation
        if (!formValues.Reatailer_City.trim()) {
            newErrors.Reatailer_City = "City is required";
        } else if (formValues.Reatailer_City.length < 3) {
            newErrors.Reatailer_City =
                "City name must be at least 3 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const mutation = useMutation({
        mutationFn: postRetailer,
        onSuccess: () => {
            ToastAndroid.show(
                "New Customer added successfully!",
                ToastAndroid.LONG,
            );
            navigation.reset({
                index: 0,
                routes: [{ name: "HomeScreen" }],
            });
        },
        onError: error => {
            Alert.alert("Error", error.message || "Failed to add customer");
        },
    });

    const handleSubmit = async () => {
        if (mutation.isPending) return; // prevent duplicate tap

        if (!validateForm()) {
            Alert.alert(
                "Validation Error",
                "Please check all required fields and try again.",
            );
            return;
        }

        mutation.mutate({ formValues, imageUri });
    };

    return (
        <View style={styles.container}>
            <View style={styles.backgroundImage}>
                <AppHeader
                    title="Retailers"
                    navigation={navigation}
                    showRightIcon={true}
                    rightIconName="person-pin"
                    rightIconLibrary="MaterialIcons"
                    onRightPress={() => navigation.push("Customers")}
                />

                <ScrollView style={styles.contentContainer}>
                    <View style={styles.formContainer}>
                        <LocationIndicator
                            onLocationUpdate={handleLocationUpdate}
                            autoFetch={true}
                            autoFetchOnMount={true}
                        />

                        <View style={styles.masterDataContainer}>
                            <TouchableOpacity
                                style={styles.masterDataButton}
                                onPress={() =>
                                    navigation.navigate("MasterData")
                                }>
                                <Icon
                                    name="settings-outline"
                                    size={20}
                                    color={customColors.accent2}
                                />
                                <Text style={styles.masterDataText}>
                                    Master Data
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dropdownRow}>
                            <View style={styles.dropdownContainer}>
                                <EnhancedDropdown
                                    data={routes}
                                    labelField="Route_Name"
                                    valueField="Route_Id"
                                    placeholder="Select Route"
                                    value={selectRoutes}
                                    onChange={value => {
                                        setSelectRoutes(value.Route_Id);
                                        setFormValues({
                                            ...formValues,
                                            Route_Id: value.Route_Id,
                                        });
                                    }}
                                />
                            </View>

                            <View style={styles.dropdownContainer}>
                                <EnhancedDropdown
                                    data={areas}
                                    labelField="Area_Name"
                                    valueField="Area_Id"
                                    placeholder="Select Area"
                                    value={selectAreas}
                                    onChange={value => {
                                        setSelectAreas(value.Area_Id);
                                        setFormValues({
                                            ...formValues,
                                            Area_Id: value.Area_Id,
                                        });
                                    }}
                                />
                            </View>
                        </View>

                        <FormField
                            label="Retailer Name"
                            required
                            error={errors.Retailer_Name}
                            value={formValues.Retailer_Name}
                            onChangeText={text =>
                                handleInputChange("Retailer_Name", text)
                            }
                            placeholder="Enter retailer name"
                        />

                        <FormField
                            label="Contact Person"
                            required
                            error={errors.Contact_Person}
                            value={formValues.Contact_Person}
                            onChangeText={text =>
                                handleInputChange("Contact_Person", text)
                            }
                            placeholder="Enter contact person name"
                        />

                        <FormField
                            label="Mobile Number"
                            required
                            error={errors.Mobile_No}
                            value={formValues.Mobile_No}
                            onChangeText={text =>
                                handleInputChange("Mobile_No", text)
                            }
                            placeholder="Enter 10-digit mobile number"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <FormField
                            label="GST"
                            value={formValues.Gstno}
                            onChangeText={text =>
                                handleInputChange("Gstno", text)
                            }
                            placeholder="GST number"
                        />

                        <View style={styles.cameraSection}>
                            {imageUri && (
                                <Image
                                    source={{ uri: `file://${imageUri}` }}
                                    style={styles.previewImage}
                                />
                            )}

                            <TouchableOpacity
                                style={styles.cameraButton}
                                onPress={handleOpenCamera}>
                                <Text style={styles.cameraButtonText}>
                                    {imageUri ? "Retake Photo" : "Take Photo"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <FormField
                            label="Address"
                            required
                            error={errors.Reatailer_Address}
                            value={formValues.Reatailer_Address}
                            onChangeText={text =>
                                handleInputChange("Reatailer_Address", text)
                            }
                            placeholder="Enter complete address"
                            multiline
                        />

                        <FormField
                            label="City"
                            required
                            error={errors.Reatailer_City}
                            value={formValues.Reatailer_City}
                            onChangeText={text =>
                                handleInputChange("Reatailer_City", text)
                            }
                            placeholder="Enter city name"
                        />

                        <FormField
                            label="Pin Code"
                            value={formValues.PinCode}
                            onChangeText={text =>
                                handleInputChange("PinCode", text)
                            }
                            placeholder="Pin Code"
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                mutation.isPending &&
                                    styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={mutation.isPending}>
                            <Text style={styles.submitButtonText}>
                                {mutation.isPending
                                    ? "Saving..."
                                    : "Save Retailer"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default AddCustomer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.primary,
        alignItems: "center",
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    formContainer: {
        padding: spacing.md,
    },
    locationSection: {
        marginBottom: spacing.md,
    },
    masterDataContainer: {
        marginBottom: spacing.md,
        alignItems: "flex-end",
    },
    masterDataButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 20,
        backgroundColor: customColors.accent2 + "10",
        gap: spacing.xs,
        ...shadows.small,
    },
    masterDataText: {
        ...typography.caption(),
        color: customColors.accent2,
        fontWeight: "500",
    },
    dropdownRow: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    dropdownContainer: {
        flex: 1,
    },
    dropdownLabel: {
        ...typography.label(),
        marginBottom: spacing.xs,
        color: customColors.grey900,
        fontWeight: "500",
    },
    dropdown: {
        height: 48,
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        ...shadows.small,
    },
    cameraSection: {
        marginBottom: spacing.md,
    },
    previewImage: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: spacing.sm,
        backgroundColor: customColors.grey100,
    },
    cameraButton: {
        ...componentStyles.button.primary,
        paddingVertical: spacing.sm,
    },
    cameraButtonText: {
        textAlign: "center",
        ...typography.button(),
    },
    submitButton: {
        ...componentStyles.button.primary,
        marginTop: spacing.lg,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        textAlign: "center",
        ...typography.button(),
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
    },
});
