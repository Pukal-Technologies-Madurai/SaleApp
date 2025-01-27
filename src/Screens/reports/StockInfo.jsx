import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    ImageBackground,
    Modal,
    Dimensions,
    ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

import DatePickerButton from "../../Components/DatePickerButton";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import Accordion from "../../Components/Accordion";
import assetImages from "../../Config/Image";
import StockReportCard from "../../Components/StockReportCard";

const { width, height } = Dimensions.get("window");

const StockInfo = () => {
    const navigation = useNavigation();

    const [logData, setLogData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedRetailer, setExpandedRetailer] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [summaryDetails, setSummaryDetails] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("Name");

                fetchStockLog(selectedDate.toISOString(), userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedDate]);

    const fetchStockLog = async (day, id) => {
        console.log(`${API.closingStockReport()}${id}&reqDate=${day}`);
        try {
            const response = await fetch(
                `${API.closingStockReport()}${id}&reqDate=${day}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
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

    const handleDateChange = (event, date) => {
        setSelectedDate(date);
        fetchStockLog(date.toISOString(), userId);
    };

    const calculateSummary = () => {
        const productSummary = {};

        logData.forEach(entry => {
            entry.ProductCount.forEach(product => {
                const productName = product.Product_Name.trim();
                if (!productSummary[productName]) {
                    productSummary[productName] = { count: 0, totalQty: 0 };
                }
                productSummary[productName].count += 1;
                productSummary[productName].totalQty += product.ST_Qty;
            });
        });

        return Object.entries(productSummary)
            .map(([name, data]) => ({
                Product_Name: name,
                ProductCount: data.count,
                ST_Qty: data.totalQty,
            }))
            .sort((a, b) => b.ST_Qty - a.ST_Qty); // Sort by quantity descending
    };

    const handleModalPreview = () => {
        const summary = calculateSummary();
        setSummaryDetails(summary);
        setModalVisible(true);
    };

    const summary = calculateSummary();

    const renderSummaryCard = (
        icon,
        title,
        value,
        onPress,
        isDisabled = false,
    ) => (
        <TouchableOpacity
            style={[
                styles.summaryCard,
                isDisabled && styles.disabledCard, // Apply a different style if disabled
            ]}
            onPress={!isDisabled ? onPress : null} // Disable the click if isDisabled is true
            activeOpacity={isDisabled ? 1 : 0.7} // Prevent visual feedback when disabled
        >
            <View style={styles.summaryCardIconContainer}>
                <Icon name={icon} color={styles.iconColors[icon]} size={24} />
            </View>
            <Text style={styles.summaryCardTitle}>{title}</Text>
            <Text style={styles.summaryCardValue}>{value}</Text>
        </TouchableOpacity>
    );

    const toggleRetailerExpand = retailerName => {
        setExpandedRetailer(
            expandedRetailer === retailerName ? null : retailerName,
        );
    };

    const editOption = item => {
        navigation.navigate("StockClosing", { item, isEdit: true });
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headersContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headersText}
                            maxFontSizeMultiplier={1.2}>
                            Stock Report
                        </Text>
                    </View>

                    <View style={{ marginHorizontal: 20 }}>
                        <DatePickerButton
                            title="Select Stock Date"
                            date={selectedDate}
                            onDateChange={handleDateChange}
                        />
                    </View>

                    <View style={styles.summaryCardsContainer}>
                        {renderSummaryCard(
                            "users",
                            "Retailers",
                            logData.length,
                            null,
                            true,
                        )}
                        {renderSummaryCard(
                            "list",
                            "Product Types",
                            summary.length,
                            null,
                            true,
                        )}
                        {renderSummaryCard(
                            "arrow-up-right",
                            "Total Qty",
                            summary.reduce(
                                (total, product) => total + product.ST_Qty,
                                0,
                            ),
                            handleModalPreview,
                        )}
                    </View>

                    <ScrollView
                        style={styles.retailerListContainer}
                        showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionTitle}>
                            Retailer Stock Details
                        </Text>
                        {logData.map(entry => (
                            <TouchableOpacity
                                key={entry.ST_Id}
                                style={styles.retailerCard}
                                onPress={() =>
                                    setExpandedRetailer(
                                        expandedRetailer === entry.Retailer_Name
                                            ? null
                                            : entry.Retailer_Name,
                                    )
                                }>
                                <View style={styles.retailerHeader}>
                                    <Text
                                        style={styles.retailerName}
                                        numberOfLines={1}>
                                        {entry.Retailer_Name}
                                    </Text>

                                    {/* Edit Option */}
                                    <TouchableOpacity
                                        onPress={() => editOption(entry)}
                                        style={styles.editButton}>
                                        <Icon
                                            name="edit"
                                            size={20}
                                            color="blue"
                                        />
                                    </TouchableOpacity>
                                </View>

                                {expandedRetailer === entry.Retailer_Name && (
                                    <View
                                        style={styles.productDetailsContainer}>
                                        {entry.ProductCount.map(
                                            (product, productIndex) => (
                                                <View
                                                    key={productIndex}
                                                    style={styles.productRow}>
                                                    <Text
                                                        style={
                                                            styles.productName
                                                        }
                                                        numberOfLines={2}>
                                                        {product.Product_Name.trim()}
                                                    </Text>
                                                    <View
                                                        style={
                                                            styles.quantityBadge
                                                        }>
                                                        <Text
                                                            style={
                                                                styles.quantityText
                                                            }>
                                                            {product.ST_Qty}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ),
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Stock Summary</Text>

                            <View style={styles.modalTableHeader}>
                                <Text style={styles.modalHeaderText}>
                                    Product
                                </Text>
                                <Text
                                    style={[
                                        styles.modalHeaderText,
                                        { textAlign: "right" },
                                    ]}>
                                    Qty
                                </Text>
                            </View>

                            <ScrollView style={styles.modalScrollView}>
                                {summaryDetails.map((product, index) => (
                                    <View
                                        key={index}
                                        style={styles.modalTableRow}>
                                        <Text
                                            style={styles.modalProductName}
                                            numberOfLines={2}>
                                            {product.Product_Name}
                                        </Text>
                                        <Text style={styles.modalProductQty}>
                                            {product.ST_Qty}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCloseButtonText}>
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ImageBackground>
        </View>
    );
};

export default StockInfo;

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
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headersText: {
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },

    editButton: {
        alignSelf: "flex-end",
        backgroundColor: customColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginVertical: 5,
        borderRadius: 5,
    },
    editButtonText: {
        ...typography.body1(),
        textAlign: "center",
        fontWeight: "bold",
        color: customColors.black,
    },

    summaryContainer: {
        justifyContent: "space-between",
        // marginHorizontal: 10,
        marginVertical: 15,
    },
    summaryRowContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryCard: {
        width: "30%",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        borderRadius: 8,
        padding: 15,
    },
    disabledCard: {
        // backgroundColor: '#e0e0e0', // Lighter background for disabled cards
        // opacity: 0.9, // Reduce opacity to indicate disabled state
    },
    summaryCardTitle: {
        ...typography.body1(),
        color: customColors.white,
        // marginTop: 5,
    },
    summaryCardValue: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
        // marginTop: 5,
    },

    iconColors: {
        users: "#4A90E2",
        list: "#50C878",
        "arrow-up-right": "#FF6B6B",
    },

    // iconColors: {
    //     'users': '#4A90E2',
    //     'list': '#50C878',
    //     'shopping-bag': '#FF6B6B'
    // },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 10,
        padding: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

    tableContainer: { marginTop: 10 },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    tableHeaderText: { fontWeight: "bold", flex: 1, textAlign: "center" },
    tableRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
    },
    tableCell: { flex: 1, textAlign: "center" },
    modalCloseButton: {
        backgroundColor: "#FF6B6B",
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
    },
    modalCloseButtonText: {
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
    },

    modalCloseButton: {
        backgroundColor: "#4A90E2",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
    },
    modalCloseButtonText: {
        color: "white",
        fontWeight: "600",
    },

    retailerListContainer: {
        padding: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: customColors.white,
        marginBottom: 15,
        marginLeft: 5,
    },
    retailerCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    retailerName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        flex: 0.7,
    },
    editButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dateText: {
        fontSize: 12,
        color: "#6B7280",
    },
    productDetailsContainer: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 10,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    productName: {
        fontSize: 14,
        color: "#4B5563",
        flex: 0.8,
    },
    quantityBadge: {
        backgroundColor: "#E6F2FF",
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    quantityText: {
        color: "#2C5282",
        fontSize: 12,
        fontWeight: "600",
    },

    summaryCardsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginVertical: 15,
    },
    summaryCard: {
        backgroundColor: "white",
        borderRadius: 15,
        padding: 15,
        width: width * 0.27,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    summaryCardIconContainer: {
        backgroundColor: "#F0F4F8",
        borderRadius: 50,
        padding: 10,
        marginBottom: 10,
    },

    summaryCardTitle: {
        fontSize: 12,
        color: "#6E7CA0",
        marginBottom: 5,
    },
    summaryCardValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
    },
    retailerListContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: customColors.white,
        marginBottom: 15,
    },
    retailerCard: {
        backgroundColor: "white",
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    retailerName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        flex: 1,
    },
    dateText: {
        fontSize: 12,
        color: "#6E7CA0",
    },
    productDetailsContainer: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F0F4F8",
        paddingTop: 10,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    productName: {
        fontSize: 14,
        color: "#333",
        flex: 1,
        marginRight: 10,
    },
    quantityBadge: {
        backgroundColor: "#F0F4F8",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    quantityText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4A90E2",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: width * 0.9,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        maxHeight: height * 0.7,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 20,
        color: "#333",
    },
    modalTableHeader: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F4F8",
    },
    modalHeaderText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6E7CA0",
        flex: 1,
        textAlign: "center",
    },
    modalScrollView: {
        maxHeight: height * 0.4,
        marginVertical: 15,
    },
    modalTableRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F4F8",
    },
    modalProductName: {
        fontSize: 14,
        color: "#333",
        flex: 2,
        marginRight: 10,
    },
    modalProductQty: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A90E2",
        flex: 1,
        textAlign: "right",
    },
    modalCloseButton: {
        backgroundColor: "#4A90E2",
        borderRadius: 25,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalCloseButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});
