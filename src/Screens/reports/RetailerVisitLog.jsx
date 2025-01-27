import {
    Image,
    ImageBackground,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIconsIcon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";

const RetailerVisitLog = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [timeLineVisible, setTimeLineVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                fetchVisitersLog(
                    selectedDate.toISOString().split("T")[0],
                    userId,
                );
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedDate]);

    const fetchVisitersLog = async (fromDate, id) => {
        try {
            const url = `${API.visitedLog()}?reqDate=${fromDate}&UserId=${id}`;
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
                console.log("Failed to fetch logs:", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    };

    const handleDateChange = (event, selectedDate) => {
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const handleImagePress = imageUrl => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    const formatTime = dateString => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatDate = date => {
        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const renderRetailerCard = (item, index) => {
        const latitude = item.Latitude;
        const longitude = item.Longitude;

        const isValidCoordinates = latitude !== 0 && longitude !== 0;
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() =>
                        setExpandedId(expandedId === index ? null : index)
                    }>
                    <View style={styles.headerContent}>
                        <Text
                            style={[
                                styles.retailerName,
                                {
                                    color:
                                        item.IsExistingRetailer === 1
                                            ? customColors.white
                                            : "#4CAF50",
                                },
                            ]}>
                            {item.Reatailer_Name}
                        </Text>
                        <Text style={styles.timestamp}>
                            {formatTime(item.EntryAt)}
                        </Text>
                    </View>
                    <MaterialIconsIcon
                        name={
                            expandedId === index
                                ? "keyboard-arrow-up"
                                : "keyboard-arrow-down"
                        }
                        size={24}
                        color={customColors.white}
                    />
                </TouchableOpacity>

                {expandedId === index && (
                    <View style={styles.cardContent}>
                        <View style={styles.statusBadge}>
                            <Text
                                style={[
                                    styles.statusText,
                                    {
                                        color:
                                            item.IsExistingRetailer === 1
                                                ? customColors.white
                                                : "#4CAF50",
                                    },
                                ]}>
                                {item.IsExistingRetailer === 1
                                    ? "● Existing Retailer"
                                    : "● New Retailer"}
                            </Text>
                        </View>

                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <MaterialIconsIcon
                                    name="phone"
                                    size={20}
                                    color={customColors.white}
                                />
                                <TouchableOpacity
                                    onPress={() =>
                                        Linking.openURL(
                                            `tel:${item.Contact_Mobile}`,
                                        )
                                    }
                                    style={styles.phoneButton}>
                                    <Text style={styles.phoneText}>
                                        {item.Contact_Mobile}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoRow}>
                                <MaterialIconsIcon
                                    name="location-on"
                                    size={20}
                                    color={customColors.white}
                                />
                                <Text style={styles.infoText}>
                                    {item.Location_Address || "N/A"}
                                </Text>
                            </View>

                            {item.Narration && (
                                <View style={styles.narrationContainer}>
                                    <MaterialIconsIcon
                                        name="notes"
                                        size={20}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.narrationText}>
                                        {item.Narration}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {item.imageUrl && (
                            <TouchableOpacity
                                onPress={() => handleImagePress(item.imageUrl)}
                                style={styles.imageContainer}>
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.cardImage}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        )}

                        {isValidCoordinates && (
                            <TouchableOpacity
                                style={styles.mapButton}
                                onPress={() => Linking.openURL(googleMapsUrl)}>
                                <MaterialIconsIcon
                                    name="map"
                                    size={20}
                                    color={customColors.white}
                                />
                                <Text style={styles.mapButtonText}>
                                    View on Maps
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headersContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIconsIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headersText}
                            maxFontSizeMultiplier={1.2}>
                            Retailers Log
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("RetailerVisit")
                            }>
                            <MaterialIconsIcon
                                name="add"
                                size={24}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="Pick a Date"
                            date={selectedDate}
                            onDateChange={handleDateChange}
                            containerStyle={styles.datePickerButton}
                        />
                        <View style={styles.countContainer}>
                            <Text style={styles.countText}>
                                {logData ? (
                                    <Text style={styles.countText}>
                                        Total: {logData.length}
                                    </Text>
                                ) : (
                                    <Text style={styles.countText}>
                                        No logs available
                                    </Text>
                                )}
                            </Text>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}>
                        {logData?.map((item, index) => (
                            <View key={index} style={styles.cardWrapper}>
                                {renderRetailerCard(item, index)}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ImageBackground>

            <Modal
                animationType="slide"
                transparent={true}
                visible={timeLineVisible}
                onRequestClose={() => setTimeLineVisible(false)}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        color: customColors.white,
                    }}>
                    <Text>TimeLine</Text>
                    {logData && (
                        <View>
                            <Text>Retailer Name: {logData.Reatailer_Name}</Text>
                            <Text>
                                Entry Time:{" "}
                                {new Date(logData.EntryAt).toLocaleTimeString()}
                            </Text>
                        </View>
                    )}
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
        </View>
    );
};

export default RetailerVisitLog;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        // justifyContent: "center",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        width: "100%",
    },
    headersText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    cardContainer: {
        flex: 1,
        padding: 15,
    },
    datePickerContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 10,
    },
    datePickerButton: {
        flex: 1,
        margin: 15,
    },
    countContainer: {
        justifyContent: "center",
        padding: 10,
        marginTop: 30,
        marginRight: 25,
        backgroundColor: customColors.secondary,
        borderRadius: 5,
    },
    countText: {
        flexWrap: "wrap",
        textAlign: "center",
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.primary,
    },
    headerText: {
        width: "90%",
        flexWrap: "wrap",
        textAlign: "left",
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "500",
    },
    scrollContainer: {
        flex: 1,
        width: "100%",
        paddingHorizontal: 10,
    },
    card: {
        backgroundColor: customColors.primary,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        marginVertical: 5,
        width: "100%",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    headerContent: {
        // flex: 1,
        marginRight: 12,
    },
    retailerName: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "600",
    },
    timestamp: {
        ...typography.body1(),
        color: "rgba(255, 255, 255, 0.7)",
        marginTop: 2,
    },
    cardContent: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.1)",
        width: "100%",
    },
    statusBadge: {
        marginBottom: 16,
    },
    statusText: {
        ...typography.h6(),
        fontWeight: "500",
    },
    infoSection: {
        gap: 16,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    phoneButton: {
        flex: 1,
    },
    phoneText: {
        color: "#64B5F6",
        ...typography.h6(),
        fontWeight: "500",
    },
    infoText: {
        flex: 1,
        color: customColors.white,
        ...typography.h6,
        flexWrap: "wrap",
    },
    narrationContainer: {
        flexDirection: "row",
        gap: 12,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        padding: 12,
        borderRadius: 8,
    },
    narrationText: {
        flex: 1,
        color: customColors.white,
        ...typography.h6,
        lineHeight: 22,
        flexWrap: "wrap",
    },
    imageContainer: {
        width: "100%",
        aspectRatio: 1,
        maxWidth: 200,
        maxHeight: 200,
        marginTop: 10,
        alignSelf: "center",
    },
    cardImage: {
        width: "100%",
        height: "100%",
        borderRadius: 5,
    },
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    mapButtonText: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "500",
    },
});
