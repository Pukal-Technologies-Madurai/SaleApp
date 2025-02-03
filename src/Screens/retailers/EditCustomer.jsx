import {
    Alert,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Dropdown } from "react-native-element-dropdown";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import CameraComponent from "../../Components/CameraComponent";
import assetImages from "../../Config/Image";

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
    });

    const [dropdownData, setDropdownData] = useState({
        routes: [],
        areas: [],
        states: [],
        distributors: [],
    });
    const [isFocus, setIsFocus] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    const [currentPhoto, setCurrentPhoto] = useState(
        item.Profile_Pic ? { uri: `file://${item.Profile_Pic}` } : null,
    );

    const fetchDropdownData = useCallback(async () => {
        try {
            const endpoints = {
                routes: API.routes(),
                areas: API.areas(),
                states: API.state(),
                distributors: API.distributors(),
            };

            const results = await Promise.all(
                Object.entries(endpoints).map(([key, url]) =>
                    fetch(url).then(res => res.json()),
                ),
            );

            const newDropdownData = Object.fromEntries(
                Object.keys(endpoints).map((key, index) => [
                    key,
                    results[index].success ? results[index].data : [],
                ]),
            );

            setDropdownData(newDropdownData);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
            Alert.alert("Error", "Failed to load data. Please try again.");
        }
    }, []);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handlePhotoCapture = useCallback(photoPath => {
        setCurrentPhoto({ uri: `file://${photoPath}` });
        setFormData(prev => ({ ...prev, Profile_Pic: photoPath }));
        setShowCamera(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        const formDataToSubmit = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
            if (key === "Profile_Pic" && value !== item.Profile_Pic) {
                formDataToSubmit.append(key, {
                    uri: currentPhoto.uri,
                    name: "photo.jpg",
                    type: "image/jpeg",
                });
            } else {
                formDataToSubmit.append(key, value);
            }
        });

        try {
            const response = await fetch(
                `${API.retailers()}${item.Retailer_Id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "multipart/form-data" },
                    body: formDataToSubmit,
                },
            );

            if (!response.ok) throw new Error("Update failed");

            ToastAndroid.show(
                "Retailer updated successfully.",
                ToastAndroid.LONG,
            );
            navigation.reset({
                index: 0,
                routes: [{ name: "HomeScreen" }],
            });
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to update retailer. Please try again.",
            );
        }
    }, [currentPhoto, formData, navigation, item]);

    const renderDropdown = useCallback(
        ({ label, data, valueField, labelField, value }) => {
            if (!data?.length) return null;

            return (
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        {label} <Text style={styles.required}>*</Text>
                    </Text>
                    <Dropdown
                        style={styles.dropdown}
                        data={data}
                        search
                        maxHeight={300}
                        labelField={labelField}
                        valueField={valueField}
                        placeholder={!isFocus ? `Select ${label}` : "..."}
                        searchPlaceholder="Search..."
                        value={value}
                        onFocus={() => setIsFocus(true)}
                        onBlur={() => setIsFocus(false)}
                        selectedTextStyle={styles.selectedTextStyle}
                        onChange={item => {
                            handleInputChange(valueField, item[valueField]);
                            setIsFocus(false);
                        }}
                        itemTextStyle={styles.itemTextStyle}
                    />
                </View>
            );
        },
        [isFocus, handleInputChange],
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialIcons
                            name="arrow-back"
                            size={25}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>
                        Edit Retailer
                    </Text>
                </View>

                <ScrollView style={styles.contentContainer}>
                    <View style={styles.formContainer}>
                        {/* Basic input fields */}
                        {[
                            { label: "Retailer Name", field: "Retailer_Name" },
                            {
                                label: "Contact Person",
                                field: "Contact_Person",
                            },
                            {
                                label: "GST Number",
                                field: "Gstno",
                                autoCapitalize: "characters",
                            },
                        ].map(({ label, field, ...props }) => (
                            <View key={field} style={styles.fieldContainer}>
                                <Text style={styles.label}>
                                    {label}{" "}
                                    <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData[field]}
                                    onChangeText={text =>
                                        handleInputChange(field, text)
                                    }
                                    placeholder={label}
                                    {...props}
                                />
                            </View>
                        ))}

                        {/* Image Section */}
                        <View style={styles.imageSection}>
                            {showCamera ? (
                                <CameraComponent
                                    onPhotoCapture={handlePhotoCapture}
                                />
                            ) : (
                                <View style={styles.photoContainer}>
                                    {currentPhoto ? (
                                        <Image
                                            source={currentPhoto}
                                            style={styles.previewImage}
                                        />
                                    ) : (
                                        <View style={styles.placeholderImage}>
                                            <Text>No Photo</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.updatePhotoButton}
                                        onPress={() => setShowCamera(true)}>
                                        <Text style={styles.updatePhotoText}>
                                            {currentPhoto
                                                ? "Update Photo"
                                                : "Add Photo"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Dropdowns */}
                        {[
                            {
                                label: "Routes",
                                data: dropdownData.routes,
                                valueField: "Route_Id",
                                labelField: "Route_Name",
                            },
                            {
                                label: "Areas",
                                data: dropdownData.areas,
                                valueField: "Area_Id",
                                labelField: "Area_Name",
                            },
                            {
                                label: "States",
                                data: dropdownData.states,
                                valueField: "State_Id",
                                labelField: "State_Name",
                            },
                            {
                                label: "Distributors",
                                data: dropdownData.distributors,
                                valueField: "Distributor_Id",
                                labelField: "distributor_Name",
                            },
                        ].map(props =>
                            renderDropdown({
                                ...props,
                                value: formData[props.valueField],
                            }),
                        )}

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleSubmit}>
                            <Text style={styles.updateButtonText}>Update</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
    );
};

export default EditCustomer;

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
        borderRadius: 10,
    },
    formContainer: {
        padding: 16,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        ...typography.h6(),
        color: customColors.black,
        fontWeight: "500",
        marginBottom: 3,
    },
    required: {
        color: "red",
    },
    input: {
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 4,
        padding: 12,
        ...typography.h6(),
        color: customColors.black,
    },
    dropdown: {
        height: 50,
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 8,
        paddingHorizontal: 8,
        color: customColors.black,
    },
    selectedTextStyle: {
        color: customColors.black, // Black text for selected items
        fontWeight: "600",
    },
    itemTextStyle: {
        color: customColors.black,
        fontWeight: "400",
    },
    imageSection: {
        marginVertical: 20,
    },
    photoContainer: {
        alignItems: "center",
    },
    previewImage: {
        width: 250,
        height: 250,
        borderRadius: 8,
        marginBottom: 12,
    },
    placeholderImage: {
        width: 250,
        height: 250,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    updatePhotoButton: {
        backgroundColor: customColors.secondary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 4,
        marginTop: 8,
    },
    updatePhotoText: {
        ...typography.h6(),
        color: customColors.black,
        fontWeight: "600",
    },
    updateButton: {
        backgroundColor: customColors.secondary,
        padding: 16,
        borderRadius: 4,
        alignItems: "center",
        marginTop: 24,
    },
    updateButtonText: {
        ...typography.h6(),
        color: customColors.black,
        fontWeight: "bold",
    },
});
