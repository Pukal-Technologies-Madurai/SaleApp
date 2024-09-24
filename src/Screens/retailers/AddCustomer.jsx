import { View, Text, TextInput, ToastAndroid, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ImageBackground } from "react-native"
import React, { useEffect, useState } from "react"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Dropdown } from "react-native-element-dropdown";
import Geolocation from "@react-native-community/geolocation"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customColors, customFonts, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";
import FormField from "../../Components/FormField";

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
        State_Id: "",
        Gstno: "",
        Latitude: "",
        Longitude: "",
        Profile_Pic: "",
        Branch_Id: "",
        Created_By: "",
        Company_Id: "",
    });
    const [routes, setRoutes] = useState([])
    const [areas, setAreas] = useState([])
    const [state, setState] = useState([])
    const [isMobileNoValid, setIsMobileNoValid] = useState(true);
    const [isFocus, setIsFocus] = useState(false);
    const [imageUri, setImageUri] = useState(null);

    useEffect(() => {
        fetchRoutes()
        fetchAreas()
        fetchStates()
        loadAsyncStorageData()

        if (route.params?.imageUri) {
            setImageUri(route.params.imageUri);
        }
    }, [route.params?.imageUri])

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
            console.error('Error loading AsyncStorage data:', error);
        }
    };

    const fetchRoutes = async () => {
        try {
            const response = await fetch(API.routes, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
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
            const response = await fetch(API.areas, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
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

    const fetchStates = async () => {
        try {
            const response = await fetch(API.state, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();

            if (data.success === true) {
                setState(data.data);
            } else {
                console.log("Failed to fetch routes:", data.message);
            }
        } catch (error) {
            console.log("Error fetching routes:", error);
        }
    };

    const handleGeoData = async () => {
        try {
            Geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude.toString();
                    const longitude = position.coords.longitude.toString();

                    setFormValues({
                        ...formValues,
                        Latitude: latitude,
                        Longitude: longitude,
                    });
                }
            )
        } catch (error) {
            console.error('Error fetching geolocation data:', error);
        }
    }

    const handleOpenCamera = () => {
        navigation.navigate('OpenCamera', { onImageCapture: handleImageCapture });
    };

    const handleImageCapture = (uri) => {
        setImageUri(uri);
        setFormValues({ ...formValues, profilePic: uri })
    };

    const validateMobileNo = (mobileNo) => {
        const regex = /^\d{10}$/;
        return regex.test(mobileNo);
    }

    const handleInputChange = (field, value) => {
        setFormValues({ ...formValues, [field]: value });
    };

    const handleSubmit = async () => {

        if (
            !formValues.Retailer_Name ||
            !formValues.Contact_Person ||
            !formValues.Gstno ||
            !formValues.Route_Id ||
            !formValues.Area_Id ||
            !formValues.Reatailer_Address ||
            !formValues.Reatailer_City ||
            !formValues.PinCode ||
            !formValues.State_Id ||
            !formValues.Mobile_No ||
            !formValues.Branch_Id
        ) {
            Alert.alert("Please fill in all required fields.");
            return;
        } else {
            var formData = new FormData()
            formData.append("Retailer_Name", formValues.Retailer_Name)
            formData.append("Contact_Person", formValues.Contact_Person)
            formData.append("Mobile_No", formValues.Mobile_No)
            formData.append("Route_Id", formValues.Route_Id)
            formData.append("Area_Id", formValues.Area_Id)
            formData.append("Reatailer_Address", formValues.Reatailer_Address)
            formData.append("Reatailer_City", formValues.Reatailer_City)
            formData.append("PinCode", formValues.PinCode)
            formData.append("State_Id", formValues.State_Id)
            formData.append("Gstno", formValues.Gstno)
            formData.append("Latitude", formValues.Latitude)
            formData.append("Longitude", formValues.Longitude)
            formData.append("Distributor_Id", formValues.Distributor_Id)
            formData.append("Company_Id", formValues.Company_Id)
            formData.append("Profile_Pic", {
                uri: `file://${imageUri}`,
                name: "photo.jpg",
                type: "image/jpeg"
            })
            formData.append("Created_By", formValues.Created_By)

            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                body: formData
            };

            fetch(`${API.retailers}${1}`, requestOptions)
                .then((response) => response.text())
                .then((result) => console.log(result))
                .catch((error) => console.error(error));

            navigation.reset({
                index: 0,
                routes: [{ name: "HomeScreen" }]
            })
            ToastAndroid.show("New Customer Added", ToastAndroid.LONG)
        }

    };

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image source={assetImages.backArrow} />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Retailers</Text>
                </View>

                <ScrollView style={styles.contentContainer}>
                    <View style={styles.TopContainer}>

                        <FormField label="Retailer Name" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Retailer_Name}
                            placeholder="Retailer Name"
                            onChangeText={(text) => handleInputChange("Retailer_Name", text)}
                        />

                        <FormField label="Contact Person" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Contact_Person}
                            placeholder="Contact Person"
                            onChangeText={(text) => handleInputChange("Contact_Person", text)}
                        />

                        <FormField label="GST" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Gstno}
                            keyboardType="default"
                            autoCapitalize="characters"
                            placeholder="GST Number"
                            onChangeText={(text) => handleInputChange("Gstno", text)}
                        />

                        {imageUri && (
                            <Image source={{ uri: `file://${imageUri}` }} style={styles.previewImage} />
                        )}

                        <TouchableOpacity style={styles.button} onPress={handleOpenCamera}>
                            <Text style={styles.buttonText}>Take Photo</Text>
                        </TouchableOpacity>

                        <FormField label="Area" required />
                        <Dropdown
                            data={areas}
                            labelField="Area_Name"
                            valueField="Area_Id"
                            style={styles.dropdown}
                            search
                            searchPlaceholder="Search..."
                            placeholder={!isFocus ? "Select Area" : "..."}
                            onChange={(value) => {
                                setFormValues({ ...formValues, Area_Id: value.Area_Id })
                            }}
                        />

                        <View style={styles.geoContainer}>
                            <TextInput
                                style={styles.geoInput}
                                value={formValues.Latitude}
                                placeholder="Latitude"
                                keyboardType="numeric"
                                onChangeText={(text) => handleInputChange("Latitude", text)}
                            />

                            <TextInput
                                style={styles.geoInput}
                                value={formValues.Longitude}
                                placeholder="Longitude"
                                keyboardType="numeric"
                                onChangeText={(text) => handleInputChange("Longitude", text)}
                            />

                            <TouchableOpacity style={styles.geoButton} onPress={handleGeoData}>
                                <Text style={styles.geoButtonText}>GeoData</Text>
                            </TouchableOpacity>
                        </View>

                        <FormField label="Retailer Address" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Reatailer_Address}
                            keyboardType="default"
                            placeholder="Retailer Address"
                            onChangeText={(text) => handleInputChange("Reatailer_Address", text)}
                        />

                        <FormField label="City" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Reatailer_City}
                            keyboardType="default"
                            placeholder="City"
                            onChangeText={(text) => handleInputChange("Reatailer_City", text)}
                        />

                        <FormField label="Pin Code" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.PinCode}
                            keyboardType="number-pad"
                            placeholder="Pin Code"
                            onChangeText={(text) => handleInputChange('PinCode', text)}
                        />

                        <FormField label="State" required />
                        <Dropdown
                            data={state}
                            style={styles.dropdown}
                            labelField="State_Name"
                            valueField="State_Id"
                            search
                            searchPlaceholder="Search..."
                            placeholder={!isFocus ? "Select State" : "..."}
                            onChange={(value) => {
                                setFormValues({ ...formValues, State_Id: value.State_Id })
                            }}
                        />

                        <FormField label="Route" required />
                        <Dropdown
                            style={styles.dropdown}
                            data={routes}
                            labelField="Route_Name"
                            valueField="Route_Id"
                            search
                            searchPlaceholder="Search..."
                            placeholder={!isFocus ? "Select Route" : "..."}
                            onChange={(value) => {
                                setFormValues({ ...formValues, Route_Id: value.Route_Id })
                            }}
                        />

                        <FormField label="Mobile Number" required />
                        <TextInput
                            style={styles.input}
                            value={formValues.Mobile_No}
                            keyboardType="phone-pad"
                            placeholder="Mobile Number"
                            onChangeText={(text) => {
                                setIsMobileNoValid(validateMobileNo(text));
                                handleInputChange("Mobile_No", text)
                            }}
                        />
                        {!isMobileNoValid && <Text style={styles.errorText}>Please enter a valid 10-digit mobile number.</Text>}

                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>Save Retailer</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

            </ImageBackground>


        </View>
    )
}

export default AddCustomer

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
        borderRadius: 7.5
    },
    inputSearchStyle: {
        // height: 40,
        // fontSize: 16,
    },
    TopContainer: {
        padding: 20,
    },
    dropdown: {
        backgroundColor: customColors.white,
        padding: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        // marginBottom: 20
    },
    placeholderStyle: {
        fontSize: 16,
    },
    previewImage: {
        width: "100%",
        height: 200,
        resizeMode: "cover",
        borderRadius: 8,
        marginBottom: 20,
    },
    imagePreview: {
        width: 200,
        height: 200,
        resizeMode: 'cover',
        borderRadius: 10,
        marginBottom: 20,
    },
    geoContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignContent: "center",
        marginTop: 15
    },
    geoInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 25,
        marginRight: 15,
    },
    errorText: {
        color: "red",
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.white,
    },
    geoButton: {
        flex: 1,
        backgroundColor: "#007AFF",
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
        // padding: 10,
        marginBottom: 25,
    },
    geoButtonText: {
        ...typography.body1(),
        color: customColors.white,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: customColors.text,
        fontFamily: customFonts.plusJakartaSansBold
    },
    mobileLabel: {
        fontSize: 14,
        marginBottom: 5,
        color: customColors.text,
        marginTop: 10,
        fontFamily: customFonts.plusJakartaSansBold
    },
    input: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 12,
        ...typography.body1(),
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 20,
    },

    submitButton: {
        backgroundColor: '#34C759',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
})