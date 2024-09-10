import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native'
import CustomIcon from 'react-native-vector-icons/FontAwesome';
import CameraComponent from '../../Components/CameraComponent';
import { API } from '../../Config/Endpoint';
import { customColors, customFonts } from '../../Config/helper';

const EditCustomer = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const [editValue, setEditValue] = useState({
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Contact_Person: item.Contact_Person,
        Mobile_No: item.Mobile_No,
        Retailer_Channel_Id: item.Retailer_Channel_Id,
        Retailer_Class: item.Retailer_Class,
        Route_Id: "",
        Area_Id: "",
        Reatailer_Address: item.Reatailer_Address,
        Reatailer_City: item.Reatailer_City,
        PinCode: item.PinCode,
        State_Id: "",
        Sales_Force_Id: item.Sales_Force_Id,
        Distributor_Id: "",
        Gstno: item.Gstno,
        Created_By: item.Created_By,
        Profile_Pic: ""
    })
    const [routes, setRoutes] = useState(editValue.Route_Id)
    const [areas, setAreas] = useState(editValue.Area_Id)
    const [state, setState] = useState(editValue.State_Id)
    const [distributors, setDistributors] = useState(editValue.Distributor_Id)
    const [value, setValue] = useState(null);
    const [isFocus, setIsFocus] = useState(false);

    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);

    useEffect(() => {
        fetchRoutes()
        fetchAreas()
        fetchStates()
        fetchDistributors()
    }, [])

    const fetchRoutes = async () => {
        try {
            const response = await fetch(API.routes, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();

            if (data.success === true) {
                setRoutes(data.data);
            } else {
                console.log("Failed to fetch routes:", data.message);
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
                // console.log(data.data)
                setState(data.data);
            } else {
                console.log("Failed to fetch routes:", data.message);
            }
        } catch (error) {
            console.log("Error fetching routes:", error);
        }
    };

    const fetchDistributors = async () => {
        try {
            const response = await fetch(API.distributors, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();

            if (data.success === true) {
                // console.log(data.data)
                setDistributors(data.data);
            } else {
                console.log("Failed to fetch routes:", data.message);
            }
        } catch (error) {
            console.log("Error fetching routes:", error);
        }
    };

    const handleInputChange = (field, value) => {
        setEditValue({ ...editValue, [field]: value });
    };

    const handlePhotoCapture = (photoPath) => {
        setCapturedPhotoPath(photoPath);
        setEditValue({ ...editValue, Profile_Pic: photoPath });
    };

    const savePhoto = () => {
        if (capturedPhotoPath) {
            console.log('Photo saved:', capturedPhotoPath);
            setEditValue({ ...editValue, profilePic: capturedPhotoPath })
        }
    };

    const handleSubmit = () => {
        if (!capturedPhotoPath) {
            Alert.alert('Retailer Photo is required.');
            return;
        }
        console.log('gst', editValue.Gstno)

        var formData = new FormData();
        formData.append("Retailer_Id", editValue.Retailer_Id)
        formData.append("Retailer_Name", editValue.Retailer_Name);
        formData.append("Contact_Person", editValue.Contact_Person);
        formData.append("Mobile_No", editValue.Mobile_No);
        formData.append("Retailer_Channel_Id", editValue.Retailer_Channel_Id)
        formData.append("Retailer_Class", editValue.Retailer_Class)
        formData.append("Route_Id", editValue.Route_Id);
        formData.append("Area_Id", editValue.Area_Id);
        formData.append("Reatailer_Address", editValue.Reatailer_Address);
        formData.append("Reatailer_City", editValue.Reatailer_City);
        formData.append("PinCode", editValue.PinCode);
        formData.append("State_Id", editValue.State_Id);
        formData.append("Gstno", editValue.Gstno);
        formData.append("Profile_Pic", {
            uri: `file://${capturedPhotoPath}`,
            name: 'photo.jpg',
            type: 'image/jpeg'
        });
        formData.append("Distributor_Id", editValue.Distributor_Id);
        formData.append("Updated_By", editValue.Created_By);

        fetch(`${API.retailers}${1}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            body: formData
        })
            .then(response => response.text())
            .then(result => {
                console.log('Retailer updated successfully:', result);
                ToastAndroid.show('Retailer updated successfully', ToastAndroid.LONG)
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'HomeScreen' }]
                });
            })
            .catch(error => {
                console.error('Error updating retailer:', error);
            });
    };

    return (
        <View style={styles.container}>

            <ScrollView>
                <View style={styles.TopContainer}>
                    {routes && routes.length > 0 && (
                        <>
                            <Text style={styles.label}>Routes <Text style={{ color: "red" }}>*</Text></Text>
                            <Dropdown
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                data={routes}
                                value={null}
                                valueField="Route_Id"
                                labelField="Route_Name"
                                search
                                maxHeight={300}
                                placeholder={!isFocus ? "Select Route" : "..."}
                                searchPlaceholder="Search..."
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={(selectedValue) => {
                                    setEditValue({ ...editValue, Route_Id: selectedValue.Route_Id })
                                    setIsFocus(false)
                                }}
                            />
                        </>
                    )}

                    <Text style={styles.label}>Retailer Name <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Retailer_Name}
                        placeholder='Retailer Name'
                        onChangeText={(text) => handleInputChange('Retailer_Name', text)}
                    />

                    <Text style={styles.label}>Contact Person <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Contact_Person}
                        placeholder='Contact Person'
                        onChangeText={(text) => handleInputChange('Contact_Person', text)}
                    />

                    <Text style={styles.mobileLabel}>GST Number <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Gstno}
                        keyboardType='default'
                        placeholder='GST Number'
                        autoCapitalize='characters'
                        onChangeText={(text) => handleInputChange('Gstno', text)}
                    />

                    {!capturedPhotoPath ? (
                        <CameraComponent onPhotoCapture={handlePhotoCapture} />
                    ) : (
                        <>
                            {capturedPhotoPath && typeof capturedPhotoPath === 'string' ? (
                                <>
                                    <Image
                                        source={`file://${capturedPhotoPath}` ? { uri: 'file://' + capturedPhotoPath } : null}
                                        style={styles.previewImage}
                                    />
                                </>
                            ) : null}
                        </>
                    )}

                    {areas && (
                        <>
                            <Text style={styles.label}>Areas <Text style={{ color: "red" }}>*</Text></Text>
                            <Dropdown
                                data={areas}
                                value={null}
                                valueField="Area_Name"
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                search
                                maxHeight={300}
                                placeholder={!isFocus ? "Select Area" : "..."}
                                searchPlaceholder="Search..."
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={(value) => {
                                    setEditValue({ ...editValue, Area_Id: value.Area_Id })
                                    setIsFocus(false)
                                }}
                                labelField="Area_Name"
                            />
                        </>

                    )}

                    <Text style={styles.mobileLabel}>Retailer Address <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Reatailer_Address}
                        keyboardType='default'
                        placeholder='Reatailer Address'
                        onChangeText={(text) => handleInputChange('Reatailer_Address', text)}
                    />

                    <Text style={styles.label}>City <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Reatailer_City}
                        keyboardType='default'
                        placeholder='City'
                        onChangeText={(text) => handleInputChange('Reatailer_City', text)}
                    />

                    <Text style={styles.label}>PinCode <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.PinCode}
                        keyboardType='number-pad'
                        placeholder='PinCode'
                        onChangeText={(text) => handleInputChange('PinCode', text)}
                    />

                    {state && (
                        <>
                            <Text style={styles.label}>State <Text style={{ color: "red" }}>*</Text></Text>
                            <Dropdown
                                data={state}
                                value={value}
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                search
                                maxHeight={300}
                                placeholder={!isFocus ? "Select State" : "..."}
                                searchPlaceholder="Search..."
                                onChange={(value) => {
                                    setEditValue({ ...editValue, State_Id: value.State_Id })
                                    setIsFocus(false)
                                }}
                                labelField="State_Name"
                            />
                        </>
                    )}

                    <Text style={styles.mobileLabel}>Mobile Number <Text style={{ color: "red" }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={editValue.Mobile_No}
                        keyboardType='phone-pad'
                        placeholder='Mobile Number'
                        onChangeText={(text) => handleInputChange('Mobile_No', text)}
                    />

                    {distributors && (
                        <>
                            <Text style={styles.label}>Distributor <Text style={{ color: "red" }}>*</Text></Text>
                            <Dropdown
                                data={distributors}
                                value={value}
                                valueField="distributor_Name"
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                search
                                maxHeight={300}
                                placeholder={!isFocus ? "Select Distributor" : "..."}
                                searchPlaceholder="Search..."
                                onChange={(value) => {
                                    setEditValue({ ...editValue, Distributor_Id: value.Distributor_Id })
                                    setIsFocus(false)
                                }}
                                labelField="distributor_Name"
                            />
                        </>
                    )}

                    <TouchableOpacity style={styles.updateButton} onPress={handleSubmit}>
                        <Text style={styles.updateButtonText}>Update</Text>
                    </TouchableOpacity>


                </View>
            </ScrollView>
        </View>
    )
}

export default EditCustomer

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: customColors.primary,
    },
    headerText: {
        fontFamily: customFonts.plusJakartaSansMedium,
        fontSize: 15,
        color: customColors.white,
        marginLeft: 10
    },
    TopContainer: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: customColors.text,
        fontFamily: customFonts.plusJakartaSansBold
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
    },
    mobileLabel: {
        fontSize: 14,
        marginBottom: 5,
        color: customColors.text,
        marginTop: 10,
        fontFamily: customFonts.plusJakartaSansBold
    },
    previewImage: {
        alignSelf: 'flex-end',
        width: '60%',
        height: '15%',
        resizeMode: 'cover',
        borderRadius: 10,
        marginBottom: 20,
    },
    updateButton: {
        backgroundColor: customColors.accent,
        borderRadius: 5,
        alignItems: 'center',
        padding: 10,
        marginBottom: 250,
        marginTop: 10,
    },
    updateButtonText: {
        fontFamily: customFonts.plusJakartaSansBold,
        color: customColors.white,
        fontSize: 16,
    },
})