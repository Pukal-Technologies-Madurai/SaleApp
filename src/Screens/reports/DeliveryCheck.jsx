import {
    StyleSheet,
    Text,
    View,
    ImageBackground,
    TouchableOpacity,
    Image,
    Modal,
    Alert,
    TextInput,
    Dimensions,
    Linking,
    ToastAndroid,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";
import Accordion from "../../Components/Accordion";
import LocationIndicator from "../../Components/LocationIndicator";
import EnhancedDropdown from "../../Components/EnhancedDropdown";

const ImagePreviewModal = ({ imageSource, visible, onClose }) => {
    const { width, height } = Dimensions.get("window");

    return (
        <Modal visible={visible} transparent={true} onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.fullScreenModalOverlay}
                onPress={onClose}
                activeOpacity={1}>
                <View style={styles.fullScreenImageContainer}>
                    <Image
                        source={imageSource}
                        style={{
                            width: width * 0.9,
                            height: height * 0.8,
                            resizeMode: "contain",
                        }}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const DeliveryCheck = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [selectedItem, setSelectedItem] = useState(null);
    const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
    const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    const deliveryStatus = { 5: "Pending", 7: "Delivered" };
    const paymentMode = { 1: "Cash", 2: "G-Pay" };
    const paymentStatus = { 0: "Pending", 3: "Completed" };

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");
                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                fetchDelivery(fromDate, toDate, userId, Company_Id);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const fetchDelivery = async (from, to, userId, company) => {
        // const url = `${API.delivery()}${userId}&Fromdate=${from}&Todate=${to}&Company_Id=${company}`;
        console.log(url);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                setLogData(data.data);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs: ", error);
        }
    };

    const handleFromDateChange = (event, date) => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = (event, date) => {
        if (date) {
            // Only update to date, and ensure it doesn't go before from date
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const renderHeader = item => {
        return (
            <View style={styles.accordionHeader}>
                <Text style={styles.accordionHeaderText}>
                    {item.Retailer_Name}{" "}
                    {item.Delivery_Status === 7 && (
                        <Text
                            style={{
                                ...typography.h6(),
                                color: "red",
                                fontWeight: "bold",
                            }}>
                            (Delivered)
                        </Text>
                    )}
                </Text>
            </View>
        );
    };

    const getDirection = item => {
        let latitude = item.rettainerLatitude;
        let longitude = item.retailerLongitude;

        if (!latitude || !longitude) {
            const location = item.AllLocations && item.AllLocations[0];
            if (location) {
                latitude = location.latitude;
                longitude = location.longitude;
            }
        }

        if (latitude && longitude) {
            const url = `${API.google_map}${latitude},${longitude}`;
            Linking.openURL(url);
        } else {
            ToastAndroid.show("Location not available.", ToastAndroid.LONG);
        }
    };

    const renderContent = item => {
        return (
            <View style={styles.content}>
                <View style={styles.invoiceContainer}>
                    <View style={styles.invoiceHeader}>
                        <Text style={styles.invoiceTitle}>Order Summary</Text>
                        <Text style={styles.invoiceDate}>
                            {new Date(item.Do_Date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.invoiceBody}>
                    <View style={styles.invoiceRow}>
                        <Text style={styles.invoiceValue}>
                            Total amount: ₹ {item.Total_Invoice_value}
                        </Text>
                    </View>

                    <View style={styles.invoiceProducts}>
                        <View style={styles.productRowHeader}>
                            <Text style={styles.invoiceCell}>Name</Text>
                            <Text style={styles.invoiceCell}>Qty</Text>
                            <Text style={styles.invoiceCell}>Amount</Text>
                        </View>
                        {item.Products_List.map((product, index) => (
                            <View key={index} style={styles.productRow}>
                                <Text
                                    style={[
                                        styles.invoiceCell,
                                        { flex: 1, textAlign: "left" },
                                    ]}
                                    numberOfLines={5}
                                    ellipsizeMode="tail">
                                    {product.Product_Name}
                                </Text>
                                <Text style={styles.invoiceCell}>
                                    {product.Bill_Qty}
                                </Text>
                                <Text style={styles.invoiceCell}>
                                    ₹ {product.Amount}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                setSelectedItem(item);
                                setIsUpdateModalVisible(true);
                            }}>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: customColors.black },
                                ]}>
                                Update
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                getDirection(item);
                            }}>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: customColors.black },
                                ]}>
                                Direction
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Modal
                    visible={isUpdateModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsUpdateModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {/* Fetch and display current location */}
                            <LocationIndicator
                                onLocationUpdate={locationData => {
                                    setLocation(prevLocation => ({
                                        latitude: locationData.latitude,
                                        longitude: locationData.longitude,
                                    }));
                                }}
                                autoFetch={true}
                                autoFetchOnMount={true}
                            />

                            {/* Delivery Status Dropdown */}
                            <EnhancedDropdown
                                data={Object.keys(deliveryStatus).map(key => ({
                                    label: deliveryStatus[key],
                                    value: key,
                                }))}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Delivery Status"
                                value={selectedItem?.deliveryStatus}
                                onChange={item => {
                                    setSelectedItem(prev => ({
                                        ...prev,
                                        deliveryStatus: item.value,
                                    }));
                                }}
                            />

                            {/* Payment Status Dropdown */}
                            <EnhancedDropdown
                                data={Object.keys(paymentMode).map(key => ({
                                    label: paymentMode[key],
                                    value: key,
                                }))}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Payment Status"
                                value={selectedItem?.paymentMode}
                                onChange={item => {
                                    setSelectedItem(prev => ({
                                        ...prev,
                                        paymentMode: item.value,
                                    }));
                                }}
                            />

                            {selectedItem?.paymentMode === "2" && (
                                <View style={styles.gpayContainer}>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setIsImagePreviewVisible(true)
                                        }>
                                        <Image
                                            source={assetImages.gpayLogo}
                                            style={styles.gpayLogo}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={styles.gpayReferenceInput}
                                        placeholder="Enter G-Pay Reference Number"
                                        value={selectedItem?.paymentRefNo}
                                        onChangeText={text => {
                                            setSelectedItem(prev => ({
                                                ...prev,
                                                paymentRefNo: text,
                                            }));
                                        }}
                                        keyboardType="default"
                                    />

                                    <ImagePreviewModal
                                        imageSource={assetImages.gpayLogo}
                                        visible={isImagePreviewVisible}
                                        onClose={() =>
                                            setIsImagePreviewVisible(false)
                                        }
                                    />
                                </View>
                            )}

                            {/* Save and Cancel Buttons */}
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.modalButton]}
                                    onPress={() => {
                                        handleUpdate(
                                            {
                                                ...selectedItem,
                                                Payment_Ref_No:
                                                    selectedItem?.paymentRefNo ||
                                                    "",
                                            },
                                            selectedItem?.deliveryStatus,
                                        );
                                        setIsUpdateModalVisible(false);
                                    }}>
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.modalButton]}
                                    onPress={() =>
                                        setIsUpdateModalVisible(false)
                                    } // Close modal without saving
                                >
                                    <Text style={styles.buttonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    const handleUpdate = async (item, dropdownValue) => {
        try {
            // Validate input before proceeding
            if (!item || !item.Do_Id) {
                Alert.alert("Error", "Invalid delivery item selected");
                return;
            }

            const userId = await AsyncStorage.getItem("UserId");
            const locationString =
                location.latitude && location.longitude
                    ? `${location.latitude},${location.longitude}`
                    : "Madurai";

            let paymentStatus = "0"; // Default to pending
            let paymentRefNo = "";

            // If payment mode is G-Pay (2), set payment status to completed and use reference number
            if (item.paymentMode === "2") {
                paymentStatus = "3"; // Completed
                paymentRefNo = item.paymentRefNo || "GPay"; // Use provided reference number
            } else if (item.paymentMode === "1") {
                // If payment mode is Cash (1)
                paymentStatus = "3"; // Completed
                paymentRefNo = "CASH"; // Indicate cash payment
            }

            // Prepare the update payload with fallback values
            const updatePayload = {
                Do_Id: item.Do_Id,
                Do_No: item.Do_No || "",
                Do_Date: item.Do_Date || new Date().toISOString(),
                Retailer_Id: item.Retailer_Id || "",

                // Delivery-specific updates
                Delivery_Time: new Date().toISOString(),
                Delivery_Location: locationString,
                Delivery_Latitude: location.latitude || null,
                Delivery_Longitude: location.longitude || null,

                Delivery_Person_Id: userId,

                // Collected information
                Collected_By: userId,
                Collected_Status: "1",
                Payment_Mode: item.paymentMode || "0",
                Payment_Status: paymentStatus,
                Payment_Ref_No: paymentRefNo,

                Branch_Id: item.Branch_Id,
                GST_Inclusive: item.GST_Inclusive,
                Total_Invoice_value: item.Total_Invoice_value,

                Delivery_Status: dropdownValue || "5",
                Created_by: userId,
                Alter_Id: item.Alter_Id,
            };

            // Perform the PUT request with improved error handling
            const response = await fetch(API.deliveryPut(), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload),
            });

            const responseData = await response.json();

            // Validate response
            if (responseData.success) {
                Alert.alert("Success", responseData.message, [{ text: "OK" }]);

                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                fetchDelivery(fromDate, toDate, userId, item.Company_Id);
            } else {
                Alert.alert(
                    "Error",
                    responseData.message || "Failed to update delivery.",
                );
            }
        } catch (error) {
            // Catch any other unexpected errors
            console.error("Unexpected Error in handleUpdate:", error);
            Alert.alert("Error", "An unexpected error occurred", [
                { text: "OK" },
            ]);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Delivery Check</Text>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="From Date"
                            date={selectedFromDate}
                            onDateChange={handleFromDateChange}
                            containerStyle={{ width: "50%" }}
                        />
                        <DatePickerButton
                            title="To Date"
                            date={selectedToDate}
                            onDateChange={handleToDateChange}
                            // disabled={true}
                            containerStyle={{ width: "50%" }}
                            // style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
                        />
                    </View>

                    <Accordion
                        data={logData}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                    />

                    {/* <TabView
                        navigationState={{ index, routes }}
                        renderScene={renderScene}
                        renderTabBar={renderTabBar}
                        onIndexChange={setIndex}
                    /> */}
                </View>
            </ImageBackground>
        </View>
    );
};

export default DeliveryCheck;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
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
    datePickerContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        justifyContent: "space-between",
        gap: 10,
    },

    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.white,
    },
    accordionHeaderText: {
        width: "90%",
        flexWrap: "wrap",
        textAlign: "left",
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "500",
    },

    content: {
        margin: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 10,
    },
    invoiceContainer: {
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    invoiceHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    invoiceTitle: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "bold",
    },
    invoiceDate: {
        ...typography.body1(),
        color: customColors.white,
    },
    invoiceBody: {
        padding: 10,
    },
    invoiceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    invoiceValue: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
    },
    invoiceProducts: {
        marginTop: 10,
    },
    productRowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: customColors.secondary,
        borderWidth: 1,
        borderColor: customColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    invoiceCell: {
        flex: 1,
        textAlign: "center",
        ...typography.body2(),
        color: customColors.black,
        fontWeight: "bold",
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: customColors.secondary,
        padding: 10,
        backgroundColor: customColors.white,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        height: "90%",
    },
    modalContent: {
        width: "95%",
        height: "85%",
        backgroundColor: customColors.white,
        borderRadius: 15,
        maxHeight: "80%",
        marginVertical: 10,
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
        width: "100%",
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: "#007BFF",
        borderRadius: 5,
        paddingVertical: 10,
        alignItems: "center",
    },
    button: {
        backgroundColor: customColors.secondary,
        alignItems: "center",
        borderRadius: 5,
        padding: 12,
        marginTop: 10,
    },
    buttonText: {
        ...typography.h6(),
        color: "white",
        fontWeight: "bold",
    },

    gpayContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    gpayLogo: {
        width: 100, // Increased from 50
        height: 100, // Increased from 50
        marginRight: 10,
    },
    fullScreenModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenImageContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
});
