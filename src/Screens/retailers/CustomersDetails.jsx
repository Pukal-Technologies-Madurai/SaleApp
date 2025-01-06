import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    PermissionsAndroid,
    Alert,
    ToastAndroid,
    ScrollView,
    Image,
    useColorScheme,
    ActivityIndicator,
    Modal,
    ImageBackground,
    TextInput,
} from "react-native";
import React, { useEffect, useState } from "react";
import Geolocation from "@react-native-community/geolocation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import Icon from "react-native-vector-icons/AntDesign";
import IconEntypo from "react-native-vector-icons/Entypo";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import LocationIndicator from "../../Components/LocationIndicator";
import assetImages from "../../Config/Image";

const CustomersDetails = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;
    const phoneNumber = item.Mobile_No;
    const [userId, setUserId] = useState("");
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [isLocationModalVisible, setLocationModalVisible] = useState(false);
    const [location, setLocation] = useState(null);

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

    const handleCall = () => {
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        } else {
            ToastAndroid.show("Phone number not available", ToastAndroid.LONG);
        }
    };

    const handleLocation = item => {
        let latitude = item.Latitude;
        let longitude = item.Longitude;

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
            ToastAndroid.show("Location not available", ToastAndroid.LONG);
        }
    };

    const handleImagePress = imageUrl => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    const handleUpdateLocation = async location => {
        console.log("location", location);
        try {
            const response = await fetch(API.retailerLocation, {
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

    return (
        <ScrollView style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <IconMaterial
                            name="arrow-back"
                            size={25}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>
                        Retailer Info
                    </Text>
                </View>

                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.cardImageContent}
                        onPress={() => handleImagePress(item.imageUrl)}>
                        <Image
                            style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: 8,
                                resizeMode: "contain",
                            }}
                            source={
                                item.imageUrl
                                    ? { uri: item.imageUrl }
                                    : assetImages.photoFrame
                            }
                        />
                    </TouchableOpacity>

                    <View style={styles.retailersContainer}>
                        <View style={styles.retailersInto}>
                            <Image
                                style={{
                                    width: 17,
                                    height: 17,
                                }}
                                source={assetImages.store}
                            />
                            <Text
                                maxFontSizeMultiplier={1.2}
                                style={[
                                    styles.retailerText,
                                    { marginTop: 15, fontWeight: "bold" },
                                ]}>
                                {item.Retailer_Name}
                            </Text>
                        </View>

                        <View style={styles.retailersInto}>
                            <Image
                                style={{
                                    width: 17,
                                    height: 17,
                                }}
                                source={assetImages.contact}
                            />
                            <Text
                                maxFontSizeMultiplier={1.2}
                                style={styles.retailerText}>
                                {item.Contact_Person
                                    ? item.Contact_Person
                                    : "N/A"}
                            </Text>
                        </View>

                        <View style={styles.retailersInto}>
                            <Image
                                style={{
                                    width: 17,
                                    height: 17,
                                }}
                                source={assetImages.home}
                            />
                            <Text
                                maxFontSizeMultiplier={1.2}
                                style={
                                    styles.retailerText
                                }>{`${item.Reatailer_Address}, ${item.Reatailer_City}, ${item.StateGet} - ${item.PinCode}`}</Text>
                        </View>

                        <View style={styles.retailersInto}>
                            <Image
                                style={{
                                    width: 22,
                                    height: 22,
                                }}
                                source={assetImages.gst}
                            />
                            <Text
                                maxFontSizeMultiplier={1.2}
                                style={styles.retailerText}>
                                {`GST: ${item.Gstno ? item.Gstno : "N/A"}`}
                            </Text>
                        </View>

                        <View style={styles.retailersInto}>
                            <Image
                                style={{
                                    width: 17,
                                    height: 17,
                                }}
                                source={assetImages.call}
                            />
                            <TouchableOpacity onPressOut={handleCall}>
                                <Text
                                    maxFontSizeMultiplier={1.2}
                                    style={[
                                        styles.retailerText,
                                        {
                                            color: "blue",
                                            textDecorationLine: "underline",
                                        },
                                    ]}>
                                    {item.Mobile_No ? item.Mobile_No : "N/A"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            navigation.navigate("StockClosing", { item });
                        }}>
                        <Image
                            style={styles.tinyLogo}
                            source={assetImages.closingStock}
                        />
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={styles.buttonText}>
                            Closing Stock
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            navigation.navigate("Sales", { item });
                        }}>
                        <Image
                            style={styles.tinyLogo}
                            source={assetImages.salesOrder}
                        />
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={styles.buttonText}>
                            Order
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            navigation.navigate("EditCustomer", { item });
                        }}>
                        <Image
                            style={styles.tinyLogo}
                            source={assetImages.edit}
                        />
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={styles.buttonText}>
                            Edit
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            Linking.openURL(
                                `${API.whatsApp}${item.Mobile_No}/?text=Hi`,
                            );
                        }}>
                        <Image
                            style={styles.tinyLogo}
                            source={assetImages.whatsapp}
                        />
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={styles.buttonText}>
                            WhatsApp
                        </Text>
                    </TouchableOpacity>

                    {(item.Latitude ||
                        item.Longitude ||
                        (item.AllLocations &&
                            item.AllLocations[0] &&
                            item.AllLocations[0].latitude &&
                            item.AllLocations[0].longitude)) && (
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleLocation(item)}>
                            <Image
                                style={styles.tinyLogo}
                                source={assetImages.locationStatus}
                            />
                            <Text
                                maxFontSizeMultiplier={1.2}
                                style={styles.buttonText}>
                                Maps
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setLocationModalVisible(true)}>
                        <Image
                            style={styles.tinyLogo}
                            source={require("../../../assets/images/pin.png")}
                        />
                        <Text
                            maxFontSizeMultiplier={1.2}
                            style={styles.buttonText}>
                            Add Location
                        </Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isLocationModalVisible}
                onRequestClose={() => setLocationModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeading}>
                            Are you sure you want to add the location!
                        </Text>
                        <LocationIndicator onLocationUpdate={setLocation} />
                        <View style={styles.modalButtonGroup}>
                            <TouchableOpacity
                                onPress={() => handleUpdateLocation(location)}
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: customColors.accent },
                                ]}>
                                <Text
                                    style={[
                                        styles.buttonText,
                                        { color: customColors.white },
                                    ]}>
                                    Update Location
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setLocationModalVisible(false)}
                                style={styles.modalButton}>
                                <Text
                                    style={[
                                        styles.buttonText,
                                        { color: customColors.white },
                                    ]}>
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isImageModalVisible}
                onRequestClose={() => setImageModalVisible(false)}>
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                    }}>
                    <TouchableOpacity
                        onPress={() => setImageModalVisible(false)}
                        style={{ position: "absolute", top: 40, right: 20 }}>
                        <Icon name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: currentImage }}
                        style={{
                            width: "90%",
                            height: "80%",
                            resizeMode: "contain",
                        }}
                    />
                </View>
            </Modal>
        </ScrollView>
    );
};

export default CustomersDetails;

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
    card: {
        width: "90%",
        backgroundColor: customColors.white,
        borderRadius: 10,
    },
    cardImageContent: {
        width: "100%",
        height: 175,
    },
    retailersContainer: {
        width: "100%",
        paddingHorizontal: 25,
        paddingVertical: 15,
    },
    retailersInto: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 10,
    },
    retailerText: {
        ...typography.h6(),
        color: customColors.primary,
        marginLeft: 15,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 20,
        marginHorizontal: 15,
    },
    button: {
        width: "30%",
        alignItems: "center",
        paddingVertical: 15,
        marginBottom: 20,
    },
    buttonText: {
        ...typography.body1(),
        color: customColors.secondary,
        textAlign: "center",
        fontWeight: "700",
        marginTop: 10,
    },
    tinyLogo: {
        width: 50,
        height: 50,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        width: "90%",
        backgroundColor: customColors.background,
        padding: 20,
        borderRadius: 10,
    },
    modalButtonGroup: {
        flexDirection: "row",
        justifyContent: "space-evenly",
    },
    modalHeading: {
        ...typography.h6(),
        textAlign: "left",
        fontWeight: "bold",
        marginHorizontal: 15,
        marginBottom: 10,
    },
    textInput: {
        ...typography.h6(),
        // marginLeft: 2.5,
        // paddingLeft: 10,
        borderBottomWidth: 1,
        borderBottomColor: "white",
        paddingVertical: 30,
        color: "white",
    },
    modalButton: {
        backgroundColor: customColors.primary,
        borderRadius: 5,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingTop: 5,
        paddingBottom: 10,
        margin: 20,
    },
});
