import { Image, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View, Modal, ImageBackground } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/AntDesign";
import { useNavigation } from "@react-navigation/native";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import CustomRadioButton from "../../Components/CustomRadioButton";
import LocationIndicator from "../../Components/LocationIndicator";
import CameraComponent from "../../Components/CameraComponent";
import assetImages from "../../Config/Image";

const RetailerVisit = () => {
    const navigation = useNavigation();
    const [selectedRetail, setSelectedRetail] = useState(null);
    const [formValues, setFormValues] = useState({
        Retailer_Id: selectedRetail,
        Retailer_Name: "",
        Contact_Person: "",
        Mobile_No: "",
        Route_Id: "",
        Location_Address: "",
        Narration: "",
        Location_Image: ""
    });
    const [retailerData, setRetailerData] = useState([])
    const [selectedValue, setSelectedValue] = useState("new");
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [userId, setUserId] = useState()

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const companyId = await AsyncStorage.getItem("Company_Id");
                setUserId(userId)
                fetchCustomersData(companyId)
            } catch (err) {
                console.log(err);
            }
        })();
    }, [])

    const fetchCustomersData = async (companyId) => {
        try {
            const response = await fetch(`${API.retailerName}${companyId}`);
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            const jsonData = await response.json();
            setRetailerData(jsonData.data)
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleInputChange = (fieldName, value) => {
        setFormValues((prevState) => ({
            ...prevState,
            [fieldName]: value
        }));
    };

    const handlePhotoCapture = async (photoPath) => {
        setCapturedPhotoPath(photoPath);
        handleInputChange("Location_Image", photoPath);
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
    };

    const validateInputs = () => {
        if (selectedValue === "new") {
            if (formValues.Retailer_Name.trim() === "") {
                ToastAndroid.show("Please enter the Shop Name", ToastAndroid.LONG);
                return false;
            }
            if (formValues.Contact_Person.trim() === "") {
                ToastAndroid.show("Please enter the Shop Owner Name", ToastAndroid.LONG);
                return false;
            }
            if (formValues.Mobile_No.trim().length !== 10) {
                ToastAndroid.show("Please enter a valid 10-digit Mobile Number", ToastAndroid.LONG);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        console.log(location.latitude, location.longitude)
        if (!validateInputs()) return;

        const formData = new FormData();
        formData.append("Mode", selectedValue === "exist" ? 1 : 2);

        if (selectedValue === "exist") {
            formData.append("Retailer_Id", selectedRetail);
        } else {
            formData.append("Reatailer_Name", formValues.Retailer_Name);
            formData.append("Contact_Person", formValues.Contact_Person);
            formData.append("Contact_Mobile", formValues.Mobile_No);
            formData.append("Location_Address", formValues.Location_Address);
        }
        if (location.latitude && location.longitude) {
            formData.append("Latitude", location.latitude);
            formData.append("Longitude", location.longitude);
        }
        formData.append("Narration", formValues.Narration);
        formData.append("EntryBy", userId);

        console.log(formData)

        if (capturedPhotoPath) {
            const photo = {
                uri: `file://${formValues.Location_Image}`,
                type: "image/jpeg",
                name: capturedPhotoPath.split('/').pop()
            };
            formData.append("Location_Image", photo);
        }

        try {
            const response = await fetch(API.visitedLog, {
                method: "POST",
                headers: { "Content-Type": "multipart/form-data" },
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
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
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

    return (
        <ScrollView style={styles.container}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
        >
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={assetImages.backArrow}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Retailers Visit</Text>
                </View>

                <View style={styles.contentContainer}>
                    <LocationIndicator onLocationUpdate={(locationData) => setLocation(locationData)} />

                    <View style={styles.radioView}>
                        <CustomRadioButton
                            label="New Retailer"
                            selected={selectedValue === "new"}
                            onSelect={() => setSelectedValue("new")}
                        />

                        <CustomRadioButton
                            label="Existing Retailer"
                            selected={selectedValue === "exist"}
                            onSelect={() => { setSelectedValue("exist") }}
                        />
                    </View>

                    {selectedValue === "exist" &&
                        <ScrollView
                            keyboardShouldPersistTaps="always"
                            nestedScrollEnabled={true}
                        >
                            <Dropdown
                                data={retailerData}
                                labelField="Retailer_Name"
                                valueField="Retailer_Id"
                                placeholder="Select Retailer"
                                value={selectedRetail}
                                onChange={item => {
                                    setSelectedRetail(item.Retailer_Id);
                                    handleInputChange("Retailer_Id", item.Retailer_Id);
                                    // setFormValues(prevState => ({
                                    //     ...prevState,
                                    //     Retailer_Id: item.Retailer_Id
                                    // }));
                                }}
                                maxHeight={300}
                                search
                                searchPlaceholder="Search Retailer"
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                containerStyle={styles.dropdownContainer}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                maxFontSizeMultiplier={1.2}
                            />

                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.inputBox}
                                multiline={true}
                                numberOfLines={4}
                                placeholder="Enter a narration"
                                value={formValues.Narration}
                                onChangeText={(text) => handleInputChange("Narration", text)}
                            />

                            <View style={styles.buttonGroup}>
                                <TouchableOpacity onPress={() => setShowCameraModal(true)}
                                    style={styles.button}
                                >
                                    <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>
                                        {!capturedPhotoPath ? "Take Photo" : "Preview Photo"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleSubmit}
                                    style={styles.button}
                                ><Text style={styles.buttonText}>Submit</Text></TouchableOpacity>
                            </View>

                            <Modal
                                visible={showCameraModal}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowCameraModal(false)}
                            >
                                <View style={styles.modalContainer}>
                                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.closeButton}>
                                        <Icon name='close' size={30} color={customColors.white} />
                                    </TouchableOpacity>
                                    {
                                        !capturedPhotoPath ? (
                                            <CameraComponent onPhotoCapture={handlePhotoCapture} />
                                        ) : (
                                            capturedPhotoPath && typeof capturedPhotoPath === 'string' && (
                                                <View style={styles.previewImageContainer}>
                                                    <Image
                                                        source={{ uri: 'file://' + capturedPhotoPath }}
                                                        style={styles.previewImage}
                                                    />
                                                    <TouchableOpacity onPress={clearPhoto} style={styles.clearPhotoButton}>
                                                        <Text style={styles.buttonText}>Retake Photo</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.button}>
                                                        <Text style={styles.buttonText}>Okay</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        )
                                    }
                                </View>
                            </Modal>
                        </ScrollView>
                    }

                    {selectedValue === "new" &&
                        <View>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.inputBox}
                                    value={formValues.Retailer_Name}
                                    keyboardType="default"
                                    autoCapitalize="words"
                                    placeholder="Retailer Name"
                                    placeholderTextColor={customColors.accent}
                                    onChangeText={(text) => handleInputChange("Retailer_Name", text)}
                                />

                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.inputBox}
                                    value={formValues.Contact_Person}
                                    keyboardType="default"
                                    autoCapitalize="words"
                                    placeholder="Contact Person"
                                    placeholderTextColor={customColors.accent}
                                    onChangeText={(text) => handleInputChange('Contact_Person', text)}
                                />

                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.inputBox}
                                    value={formValues.Mobile_No}
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
                                    placeholder="Mobile Number"
                                    placeholderTextColor={customColors.accent}
                                    onChangeText={(text) => handleInputChange('Mobile_No', text)}
                                />

                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.inputBox}
                                    value={formValues.Location_Address}
                                    keyboardType="default"
                                    placeholder="Address"
                                    placeholderTextColor={customColors.accent}
                                    onChangeText={(text) => handleInputChange('Location_Address', text)}
                                />

                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.inputBox}
                                    multiline={true}
                                    numberOfLines={4}
                                    placeholder="Enter a narration"
                                    placeholderTextColor={customColors.accent}
                                    value={formValues.Narration}
                                    onChangeText={(text) => handleInputChange('Narration', text)} // Ensure this is properly set
                                />
                            </View>


                            <View style={styles.buttonGroup}>
                                <TouchableOpacity onPress={() => setShowCameraModal(true)}
                                    style={styles.button}
                                ><Text style={styles.buttonText}>{!capturedPhotoPath ? "Take Photo" : "Preview Photo"}</Text></TouchableOpacity>

                                <TouchableOpacity onPress={handleSubmit}
                                    style={styles.button}
                                ><Text style={styles.buttonText}>Submit</Text></TouchableOpacity>
                            </View>

                            <Modal
                                visible={showCameraModal}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowCameraModal(false)}
                            >
                                <View style={styles.modalContainer}>
                                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.closeButton}>
                                        <Icon name='close' size={30} color={customColors.white} />
                                    </TouchableOpacity>
                                    {
                                        !capturedPhotoPath ? (
                                            <CameraComponent onPhotoCapture={handlePhotoCapture} />
                                        ) : (
                                            capturedPhotoPath && typeof capturedPhotoPath === "string" && (
                                                <View style={styles.previewImageContainer}>
                                                    <Image
                                                        source={{ uri: 'file://' + capturedPhotoPath }}
                                                        style={styles.previewImage}
                                                    />
                                                    <TouchableOpacity onPress={clearPhoto} style={styles.clearPhotoButton}>
                                                        <Text style={styles.buttonText}>Retake Photo</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.button}>
                                                        <Text style={styles.buttonText}>Okay</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        )
                                    }
                                </View>
                            </Modal>
                        </View>
                    }
                </View>
            </ImageBackground>

        </ScrollView>
    )
}

export default RetailerVisit

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: customColors.background,
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
        backgroundColor: customColors.white,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    radioView: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginVertical: 15,
    },
    inputBox: {
        ...typography.body1(),
        color: customColors.black,
        borderColor: "#E2E8F0",
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    textArea: {
        ...typography.body1(),
        color: customColors.black,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginHorizontal: 20,
        borderRadius: 10,
        padding: 12,
    },
    dropdown: {
        backgroundColor: customColors.white,
        height: 50,
        margin: 20,
        padding: 12,
        borderRadius: 10,
        borderColor: "#E2E8F0",
        borderWidth: 1,
    },
    dropdownContainer: {
        backgroundColor: customColors.white,
        borderColor: customColors.accent,
        borderWidth: 0.5,
        borderRadius: 10,
    },
    placeholderStyle: {
        ...typography.h6(),
        color: customColors.black,
    },
    selectedTextStyle: {
        ...typography.body1(),
        color: customColors.black,
        // numberOfLines: 1,
    },
    inputSearchStyle: {
        ...typography.body1(),
        color: customColors.black,
    },
    buttonGroup: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 250
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        marginLeft: "auto",
        top: 15,
        right: 25,
    },
    previewImageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    previewImage: {
        width: 350,
        height: 450,
        resizeMode: 'cover',
        borderRadius: 10,
    },
    button: {
        width: 150,
        height: 50,
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: customColors.secondary,
        color: customColors.white,
        borderRadius: 10,
        marginTop: 30
    },
    buttonText: {
        textAlign: "center",
        ...typography.button(),
        fontWeight: "bold",
    },
    clearPhotoButton: {
        width: 150,
        height: 50,
        marginTop: 30,
        backgroundColor: customColors.accent,
        color: customColors.white,
        padding: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignSelf: 'center',
    },
})