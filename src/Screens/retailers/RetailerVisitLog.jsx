import {
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import { visitEntryLog } from "../../Api/retailers";
import DatePickerButton from "../../Components/DatePickerButton";
import AppHeader from "../../Components/AppHeader";
import { formatTime } from "../../Config/functions";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const RetailerVisitLog = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeLineVisible, setTimeLineVisible] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        AsyncStorage.getItem("UserId")
            .then(uId => {
                setUserId(uId);
            })
            .catch(err => {
                console.error("Error reading UserId", err);
            });
    }, []);

    const formattedDate = selectedDate.toISOString().split("T")[0];

    const { data: logData = [] } = useQuery({
        queryKey: ["logData", formattedDate, userId],
        queryFn: () => visitEntryLog({ toDate: formattedDate, uId: userId }),
        enabled: !!userId && !!formattedDate,
    });

    const handleDateChange = selectedDate => {
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
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
                                            : customColors.accent2,
                                },
                            ]}>
                            {item.Reatailer_Name}
                        </Text>
                        <Text style={styles.timestamp}>
                            {formatTime(item.EntryAt)}
                        </Text>
                    </View>
                    <MaterialIcon
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
                                                ? customColors.primaryLight
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
                                <MaterialIcon
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
                                <MaterialIcon
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
                                    <MaterialIcon
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
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.cardImage}
                                    resizeMode="cover"
                                />
                            </View>
                        )}

                        {isValidCoordinates && (
                            <TouchableOpacity
                                style={styles.mapButton}
                                onPress={() => Linking.openURL(googleMapsUrl)}>
                                <MaterialIcon
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
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Log Entries"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="add"
                onRightPress={() => navigation.navigate("RetailerVisit")}
            />
            <View style={styles.contentContainer}>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: customColors.background,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.lg,
        backgroundColor: customColors.primaryLight,
        padding: spacing.md,
        borderRadius: 12,
        ...shadows.small,
    },
    datePickerButton: {
        flex: 1,
        marginRight: spacing.md,
    },
    countContainer: {
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        ...shadows.small,
    },
    countText: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    cardWrapper: {
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        overflow: "hidden",
        ...shadows.medium,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primary,
    },
    headerContent: {
        flex: 1,
        marginRight: spacing.sm,
    },
    retailerName: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    timestamp: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.8,
    },
    cardContent: {
        padding: spacing.md,
        backgroundColor: customColors.primaryLight,
    },
    statusBadge: {
        backgroundColor: customColors.grey100,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginBottom: spacing.md,
    },
    statusText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    infoSection: {
        marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    phoneButton: {
        marginLeft: spacing.sm,
    },
    phoneText: {
        ...typography.body2(),
        color: customColors.primaryDark,
        textDecorationLine: "underline",
    },
    infoText: {
        ...typography.body2(),
        color: customColors.grey900,
        marginLeft: spacing.sm,
        flex: 1,
    },
    narrationContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    narrationText: {
        ...typography.body2(),
        color: customColors.grey900,
        marginLeft: spacing.sm,
        flex: 1,
    },
    imageContainer: {
        marginTop: spacing.xxs,
        borderRadius: 12,
        overflow: "hidden",
        // backgroundColor: customColors.grey100,
        // ...shadows.small,
        justifyContent: "center",
        alignItems: "center",
    },
    cardImage: {
        width: "50%",
        height: 100,
        borderRadius: 12,
        resizeMode: "cover",
    },
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        padding: spacing.sm,
        borderRadius: 8,
        marginTop: spacing.md,
        ...shadows.small,
    },
    mapButtonText: {
        ...typography.button(),
        color: customColors.white,
        marginLeft: spacing.xs,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: 16,
        ...shadows.large,
    },
    closeButton: {
        position: "absolute",
        top: spacing.xl,
        right: spacing.xl,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
});
export default RetailerVisitLog;
