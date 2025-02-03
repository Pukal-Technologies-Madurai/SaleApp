import {
    View,
    Text,
    TextInput,
    ToastAndroid,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ImageBackground,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import LocationIndicator from "../../Components/LocationIndicator";

const AddCustomer = () => {
    const navigation = useNavigation();
    const route = useRoute();
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

    const [routes, setRoutes] = useState([]);
    const [selectRoutes, setSelectRoutes] = useState(null);
    const [areas, setAreas] = useState([]);
    const [selectAreas, setSelectAreas] = useState(null);
    const [isFocus, setIsFocus] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUri, setImageUri] = useState(null);

    useEffect(() => {
        loadAsyncStorageData();
        if (route.params?.imageUri) {
            setImageUri(route.params.imageUri);
        }
    }, [route.params?.imageUri]);

    const loadAsyncStorageData = async () => {
        try {
            const branchId = await AsyncStorage.getItem("branchId");
            const userId = await AsyncStorage.getItem("UserId");
            const companyId = await AsyncStorage.getItem("Company_Id");

            fetchRoutes();
            fetchAreas();

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

    const fetchRoutes = async () => {
        try {
            const response = await fetch(API.routes(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                setRoutes(data.data);
            } else {
                console.log("Failed to fetch routes: ", data.message);
            }
        } catch (error) {
            console.log("Error fetching routes:", error);
        }
    };

    const fetchAreas = async () => {
        try {
            const response = await fetch(API.areas(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                // console.log(data.data)
                setAreas(data.data);
            } else {
                console.log("Failed to fetch routes:", data.message);
            }
        } catch (error) {
            console.log("Error fetching routes:", error);
        }
    };

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

    const handleGeoData = async () => {
        if (location.latitude && location.longitude) {
            setFormValues(prev => ({
                ...prev,
                Latitude: location.latitude.toString(),
                Longitude: location.longitude.toString(),
            }));

            ToastAndroid.show(
                "Location updated successfully!",
                ToastAndroid.SHORT,
            );
        } else {
            Alert.alert(
                "Location Not Available",
                "Please wait for the location to be detected or try refreshing.",
                [{ text: "OK" }],
            );
        }
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

    const validateMobileNo = mobileNo => /^\d{10}$/.test(mobileNo);

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

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert(
                "Validation Error",
                "Please check all required fields and try again.",
                [{ text: "OK" }],
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();

            // Append all form values to formData
            Object.entries(formValues).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // Append image if exists
            if (imageUri) {
                formData.append("Profile_Pic", {
                    uri: `file://${imageUri}`,
                    name: "photo.jpg",
                    type: "image/jpeg",
                });
            }

            const response = await fetch(
                `${API.retailers()}${formValues.Company_Id}`,
                {
                    method: "POST",
                    body: formData,
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Server responded with status: ${response.status}`,
                );
            }

            const result = await response.text();
            // console.log('Success:', result);

            ToastAndroid.show(
                "New Customer Added Successfully!",
                ToastAndroid.LONG,
            );
            navigation.reset({
                index: 0,
                routes: [{ name: "HomeScreen" }],
            });
        } catch (error) {
            console.error("Submission Error:", error);
            Alert.alert(
                "Error",
                "Failed to add new customer. Please try again.",
                [{ text: "OK" }],
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const FormLabel = ({ label, required }) => (
        <Text style={styles.label}>
            {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialIcon
                            name="arrow-back"
                            size={25}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>
                        Retailers
                    </Text>
                </View>

                <ScrollView style={styles.contentContainer}>
                    <View style={styles.formContainer}>
                        <LocationIndicator
                            onLocationUpdate={handleLocationUpdate}
                            autoFetch={true}
                            autoFetchOnMount={true}
                        />

                        <View style={styles.geoSection}>
                            <Text style={styles.label}>Location Details</Text>
                            <View style={styles.geoContainer}>
                                <View style={styles.geoInputContainer}>
                                    <TextInput
                                        style={styles.geoInput}
                                        value={formValues.Latitude}
                                        placeholder="Latitude"
                                        keyboardType="numeric"
                                        editable={false}
                                        // onChangeText={text =>
                                        //     handleInputChange("Latitude", text)
                                        // }
                                    />
                                    <TextInput
                                        style={styles.geoInput}
                                        value={formValues.Longitude}
                                        placeholder="Longitude"
                                        keyboardType="numeric"
                                        editable={false}
                                        // onChangeText={text =>
                                        //     handleInputChange("Longitude", text)
                                        // }
                                    />

                                    <TouchableOpacity
                                        style={styles.geoButton}
                                        onPress={() => handleGeoData()}>
                                        <MaterialIcon
                                            name="location-pin"
                                            size={25}
                                            color={customColors.white}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <EnhancedDropdown
                            data={routes}
                            labelField="Route_Name"
                            valueField="Route_Id"
                            showIcon={true}
                            iconName={"chevron-down"}
                            iconColor={customColors.grey}
                            placeholder={
                                !isFocus ? "Please chosen the Route" : "..."
                            }
                            value={selectRoutes}
                            onChange={value => {
                                setSelectRoutes(value.Route_Id);
                                setFormValues({
                                    ...formValues,
                                    Route_Id: value.Route_Id,
                                });
                                setIsFocus(false);
                            }}
                        />

                        <EnhancedDropdown
                            data={areas}
                            labelField="Area_Name"
                            valueField="Area_Id"
                            showIcon={true}
                            iconName={"chevron-down"}
                            iconColor={customColors.grey}
                            placeholder={
                                !isFocus ? "Please chosen the area" : "..."
                            }
                            value={selectAreas}
                            onChange={value => {
                                setSelectAreas(value.Area_Id);
                                setFormValues({
                                    ...formValues,
                                    Area_Id: value.Area_Id,
                                });
                                setIsFocus(false);
                            }}
                        />

                        <View style={styles.inputWrapper}>
                            <FormLabel label="Retailer Name" required />
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.Retailer_Name && styles.inputError,
                                ]}
                                value={formValues.Retailer_Name}
                                onChangeText={text =>
                                    handleInputChange("Retailer_Name", text)
                                }
                                placeholder="Enter retailer name"
                            />
                            {errors.Retailer_Name && (
                                <Text style={styles.errorText}>
                                    {errors.Retailer_Name}
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <FormLabel label="Contact Person" required />
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.Contact_Person && styles.inputError,
                                ]}
                                value={formValues.Contact_Person}
                                onChangeText={text =>
                                    handleInputChange("Contact_Person", text)
                                }
                                placeholder="Enter contact person name"
                            />
                            {errors.Contact_Person && (
                                <Text style={styles.errorText}>
                                    {errors.Contact_Person}
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <FormLabel label="Mobile Number" required />
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.Mobile_No && styles.inputError,
                                ]}
                                value={formValues.Mobile_No}
                                onChangeText={text =>
                                    handleInputChange("Mobile_No", text)
                                }
                                placeholder="Enter 10-digit mobile number"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                            {errors.Mobile_No && (
                                <Text style={styles.errorText}>
                                    {errors.Mobile_No}
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>GST</Text>
                            <TextInput
                                style={[styles.input]}
                                value={formValues.Gstno}
                                onChangeText={text =>
                                    handleInputChange("Gstno", text)
                                }
                                placeholder="GST number"
                            />
                        </View>

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

                        <View style={styles.inputWrapper}>
                            <FormLabel label="Address" required />
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.Reatailer_Address &&
                                        styles.inputError,
                                ]}
                                value={formValues.Reatailer_Address}
                                onChangeText={text =>
                                    handleInputChange("Reatailer_Address", text)
                                }
                                placeholder="Enter complete address"
                                multiline
                            />
                            {errors.Reatailer_Address && (
                                <Text style={styles.errorText}>
                                    {errors.Reatailer_Address}
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <FormLabel label="City" required />
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.Reatailer_City && styles.inputError,
                                ]}
                                value={formValues.Reatailer_City}
                                onChangeText={text =>
                                    handleInputChange("Reatailer_City", text)
                                }
                                placeholder="Enter city name"
                            />
                            {errors.Reatailer_City && (
                                <Text style={styles.errorText}>
                                    {errors.Reatailer_City}
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Pin Code</Text>
                            <TextInput
                                style={[styles.input]}
                                value={formValues.PinCode}
                                keyboardType="phone-pad"
                                onChangeText={text =>
                                    handleInputChange("PinCode", text)
                                }
                                placeholder="Pin Code"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                isSubmitting && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}>
                            <Text style={styles.submitButtonText}>
                                {isSubmitting ? "Saving..." : "Save Retailer"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </ImageBackground>
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
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    formContainer: {
        padding: 20,
    },
    inputWrapper: {
        marginBottom: 10,
    },
    label: {
        ...typography.h6(),
        marginBottom: 5,
        color: customColors.grey,
        fontWeight: "500",
    },
    input: {
        backgroundColor: customColors.white,
        color: customColors.black,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        ...typography.body1(),
        color: "red",
        marginTop: 5,
    },
    cameraSection: {
        marginBottom: 20,
    },
    previewImage: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: "#f0f0f0",
    },
    cameraButton: {
        backgroundColor: customColors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
    },
    cameraButtonText: {
        color: customColors.white,
        ...typography.h6(),
        fontWeight: "600",
    },
    geoSection: {
        marginVertical: 15,
    },
    geoContainer: {
        width: "100%",
    },
    geoInputContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    geoInput: {
        flex: 1,
        backgroundColor: customColors.lightGrey,
        color: customColors.black,
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginRight: 10,
    },
    geoButton: {
        backgroundColor: customColors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
    },
    geoButtonText: {
        color: customColors.black,
        ...typography.h5(),
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: customColors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        ...typography.h5(),
        color: customColors.white,
        fontWeight: "bold",
    },
    requiredAsterisk: {
        color: "#FF0000",
        ...typography.h6(),
    },
});
