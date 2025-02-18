import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    ToastAndroid,
    ScrollView,
    Image,
    Modal,
    ImageBackground,
    Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import LocationIndicator from "../../Components/LocationIndicator";
import assetImages from "../../Config/Image";

const CustomersDetails = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const [userId, setUserId] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const [location, setLocation] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);

    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const id = await AsyncStorage.getItem("UserId");
                setUserId(id);
            } catch (e) {
                console.log(e);
            }
        };

        fetchUserId();
    }, []);

    const handleUpdateLocation = async location => {
        console.log("location", location);
        try {
            const response = await fetch(API.retailerLocation(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    EntryBy: userId,
                    Latitude: location.latitude.toString(),
                    Longitude: location.longitude.toString(),
                    Retailer_Id: item.Retailer_Id,
                }),
            });
            const data = await response.json();
            console.log("data", data);

            if (data.status === "Success") {
                Alert.alert(data.message);
                ToastAndroid.show(
                    "Geolocation Data is Updated",
                    ToastAndroid.LONG,
                );
            } else {
                Alert.alert(data.message);
            }
        } catch (error) {
            console.error("Error updating location:", error);
            Alert.alert(
                "Error",
                "Failed to update location. Please try again later.",
            );
        }
    };

    const InfoRow = ({ icon, value, isPhone }) => (
        <View style={styles.infoRow}>
            <Icon
                name={icon}
                size={20}
                color={customColors.primary}
                style={styles.infoIcon}
            />
            {isPhone ? (
                <TouchableOpacity
                    onPress={() => {
                        if (value && value !== "N/A") {
                            Linking.openURL(`tel:${value}`);
                        } else {
                            ToastAndroid.show(
                                "Phone number not available",
                                ToastAndroid.LONG,
                            );
                        }
                    }}>
                    <Text style={styles.phoneText}>{value || "N/A"}</Text>
                </TouchableOpacity>
            ) : (
                <Text style={styles.infoText}>{value || "N/A"}</Text>
            )}
        </View>
    );

    const openMap = () => {
        const { Latitude, Longitude, AllLocations } = item;
        const location = AllLocations?.[0];
        const lat = Latitude || location?.latitude;
        const lng = Longitude || location?.longitude;

        if (lat && lng) {
            Linking.openURL(`${API.google_map}${lat},${lng}`);
        } else {
            ToastAndroid.show("Location not available", ToastAndroid.SHORT);
        }
    };

    const ActionButton = ({ icon, label, onPress }) => (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <Image source={icon} style={styles.actionIcon} />
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <IconMaterial
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headerText}
                            maxFontSizeMultiplier={1.2}>
                            Retailer Details
                        </Text>
                    </View>

                    <ScrollView style={styles.contentContainer}>
                        <View style={styles.card}>
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedImage(item.imageUrl);
                                    setShowImageModal(true);
                                }}
                                style={styles.imageContainer}>
                                <Image
                                    source={
                                        item.imageUrl
                                            ? { uri: item.imageUrl }
                                            : assetImages.photoFrame
                                    }
                                    style={styles.retailerImage}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>

                            <View>
                                <InfoRow
                                    icon="home"
                                    value={item.Retailer_Name}
                                />
                                <InfoRow
                                    icon="user"
                                    value={
                                        item.Contact_Person
                                            ? item.Contact_Person
                                            : "N/A"
                                    }
                                />
                                <InfoRow
                                    icon="pushpino"
                                    value={`${item.Reatailer_Address}, ${item.Reatailer_City}, ${item.StateGet} - ${item.PinCode}`}
                                />
                                <InfoRow
                                    icon="infocirlceo"
                                    value={`GST: ${item.Gstno ? item.Gstno : "N/A"}`}
                                />
                                <InfoRow
                                    icon="phone"
                                    value={item.Mobile_No}
                                    isPhone
                                />
                            </View>
                        </View>

                        <View style={styles.actionGrid}>
                            <ActionButton
                                label="Stock"
                                icon={require("../../../assets/images/closing_stock.png")}
                                onPress={() =>
                                    navigation.navigate("StockClosing", {
                                        item,
                                    })
                                }
                            />
                            <ActionButton
                                label="Order"
                                icon={require("../../../assets/images/sale_order.png")}
                                onPress={() =>
                                    navigation.navigate("Sales", {
                                        item,
                                    })
                                }
                            />

                            <ActionButton
                                label="Edit"
                                icon={require("../../../assets/images/order_list.png")}
                                onPress={() =>
                                    navigation.navigate("EditCustomer", {
                                        item,
                                    })
                                }
                            />

                            <ActionButton
                                label="History"
                                icon={require("../../../assets/images/retailer.png")}
                                onPress={() =>
                                    navigation.navigate("SaleHistory", {
                                        item,
                                    })
                                }
                            />

                            <ActionButton
                                label="WhatsApp"
                                icon={require("../../../assets/images/whatsapp.png")}
                                onPress={() =>
                                    Linking.openURL(
                                        `${API.whatsApp}${item.Mobile_No}/?text=Hi`,
                                    )
                                }
                            />

                            {(item.Latitude ||
                                item.Longitude ||
                                (item.AllLocations &&
                                    item.AllLocations[0] &&
                                    item.AllLocations[0].latitude &&
                                    item.AllLocations[0].longitude)) && (
                                <ActionButton
                                    label="Maps"
                                    icon={require("../../../assets/images/location_status.png")}
                                    onPress={openMap}
                                />
                            )}

                            <ActionButton
                                label="Update Location"
                                icon={require("../../../assets/images/pin.png")}
                                onPress={() => setShowLocationModal(true)}
                            />
                        </View>
                    </ScrollView>
                </View>
            </ImageBackground>

            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        onPress={() => setShowImageModal(false)}
                        style={styles.closeButton}>
                        <Icon name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.modalImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            <Modal
                visible={showLocationModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLocationModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.locationModalContent}>
                        <Text style={styles.modalTitle}>Update Location</Text>
                        <LocationIndicator onLocationUpdate={setLocation} />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(false)}
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                ]}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleUpdateLocation(location)}
                                style={[
                                    styles.modalButton,
                                    styles.updateButton,
                                ]}>
                                <Text style={styles.buttonText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default CustomersDetails;

const { width } = Dimensions.get("window");

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
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },
    card: {
        padding: 15,
        marginHorizontal: 10,
        marginBottom: 5,
    },
    imageContainer: {
        width: "100%",
        height: 200,
        marginBottom: 15,
    },
    retailerImage: {
        width: "100%",
        height: "100%",
        borderRadius: 10,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    infoIcon: {
        textAlign: "center",
        marginRight: 13,
    },
    infoText: {
        flex: 1,
        ...typography.h6(),
        color: customColors.black,
    },
    phoneText: {
        ...typography.h6(),
        color: "#2196F3",
        textDecorationLine: "underline",
    },
    actionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-evenly",
    },
    actionButton: {
        width: (width - 64) / 3,
        alignItems: "center",
        backgroundColor: customColors.white,
        padding: 12,
        margin: 8,
        borderRadius: 8,
        elevation: 2,
    },
    actionIcon: {
        width: 35,
        height: 35,
        marginBottom: 8,
    },
    actionLabel: {
        textAlign: "center",
        ...typography.body1(),
        color: "#333",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 1,
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
    },
    locationModalContent: {
        backgroundColor: "white",
        width: width * 0.9,
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: {
        ...typography.h4(),
        fontWeight: "600",
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginLeft: 12,
    },
    cancelButton: {
        backgroundColor: "#9e9e9e",
    },
    updateButton: {
        backgroundColor: "#2196F3",
    },
    buttonText: {
        ...typography.h6(),
        color: "white",
    },
});
