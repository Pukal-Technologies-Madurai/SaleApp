import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { customColors, typography } from "../Config/helper";
import { API } from "../Config/Endpoint";

const SalesReportModal = ({
    visible,
    onClose,
    totalOrderAmount,
    totalProductsSold,
    logData,
    productSummary,
    selectedDate
}) => {
    const styles = {
        modalBackground: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
        modalContainer: {
            flex: 1,
            backgroundColor: customColors.white,
            margin: 16,
            borderRadius: 16,
            overflow: "hidden",
        },
        modalHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
        },
        modalHeaderText: {
            ...typography.h6(),
            fontWeight: "700",
            color: "#111827",
        },
        closeButton: {
            padding: 2,
        },
        contentContainer: {
            flex: 1,
            paddingVertical: 3,
            paddingHorizontal: 14,
        },

        statsContainer: {},
        statRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
        },
        statValue: {
            ...typography.h6(),
            color: "#111827",
            fontWeight: "600",
            paddingHorizontal: 15,
        },

        tableContainer: {
            backgroundColor: customColors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            marginTop: 10,
        },
        tableHeader: {
            backgroundColor: customColors.primary,
            paddingVertical: 7,
            paddingHorizontal: 16,
        },
        tableRow: {
            flexDirection: "row",
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
        },
        headerRow: {
            flexDirection: "row",
            marginBottom: 4,
        },
        summaryRow: {
            flexDirection: "row",
        },
        headerText: {
            ...typography.body1(),
            fontWeight: "700",
            color: customColors.white,
        },
        summaryText: {
            ...typography.body1(),
            color: "#FFB6C1",
            fontWeight: "700",
        },
        productHeaderCell: {
            flex: 2,
        },
        quantityHeaderCell: {
            flex: 1,
            alignItems: "center",
        },
        amountHeaderCell: {
            flex: 1,
            alignItems: "flex-end",
        },
        tableCell: {
            ...typography.body1(),
            color: "#374151",
        },
        productCell: {
            flex: 2,
            ...typography.body2()
        },
        centerCell: {
            flex: 1,
            textAlign: "center",
        },
        rightCell: {
            flex: 1,
            textAlign: "right",
        },
        quantityCell: {
            flex: 1,
            textAlign: "center",
        },
        amountCell: {
            flex: 1,
            textAlign: "right",
        },
        evenRow: {
            backgroundColor: customColors.white,
        },
        oddRow: {
            backgroundColor: "#F9FAFB",
        },

        checkOrderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            marginRight: 30,
        },
        checkOrderText: {
            ...typography.body2(),
            color: "#374151",
            marginLeft: 10,
        },
    };

    const [visitLogLength, setVisitLogLength] = React.useState(0);
    const totalQuantity = productSummary.reduce((sum, item) => sum + item.totalQty, 0);
    const totalAmount = productSummary.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);

    const fromDate = new Date(selectedDate).toLocaleDateString().split("T")[0];
    const fromTime = new Date(selectedDate).toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
    });

    React.useEffect(() => {
        (async () => {
            try {
                if (!selectedDate) {
                    console.log("selectedDate is undefined");
                    return;
                }
                const storeUserTypeId = await AsyncStorage.getItem("userTypeId");
                const userId = await AsyncStorage.getItem("UserId");
                const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

                const isAdminUser = ["0", "1", "2"].includes(storeUserTypeId);

                if (isAdminUser){
                    await getVisitedLog(formattedDate);
                } else {
                    await getVisitedLog(formattedDate, userId);
                }
            } catch (err) {
                console.error("Error retrieving UserId:", err);
            }
        })();
    }, [selectedDate]);

    const getVisitedLog = async (date, id = "") => {
        try {
            const userIdParam = id || "";
            const url = `${API.visitedLog}?reqDate=${date}&UserId=${userIdParam}`;
            console.log(url)

            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (data.success) {
                const length = data.data?.length || 0;
                setVisitLogLength(length);
            } else {
                console.log("Failed to fetch logs:", data.message);
                setVisitLogLength(0);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setVisitLogLength(0);
        }
    };

    const totalVisitLogCount = visitLogLength + logData.length;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} >
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>Sales Report</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="times" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.contentContainer}>
                        <View style={styles.statsContainer}>
                            <View style={styles.statRow}>
                                <Icon name="calendar" size={20} color="#4A90E2" />
                                <Text style={styles.statValue}>{fromDate} • {fromTime}</Text>
                            </View>

                            {/* <View style={styles.statRow}>
                                <Icon name="line-chart" size={20} color="#9B59B6" />
                                <Text style={styles.statValue}>Total Shop Orders Placed:
                                    <Text style={{ color: "red", fontWeight: "bold" }}> {logData.length.toString()}</Text>
                                </Text>
                            </View> */}

                            <View style={styles.checkOrderRow}>
                                <Text style={styles.checkOrderText}>Check-Ins</Text>
                                <Text style={styles.checkOrderText}>Orders</Text>
                            </View>
                            <View style={[styles.statRow, { marginTop: -10 }]}>
                                <MaterialCommunityIcons name="bike" size={24} color="#2ECC71" />
                                <Text style={styles.statValue}>Check & Order Stats:&nbsp;
                                    <Text style={{ color: "red", fontWeight: "bold" }}>
                                        {totalVisitLogCount} (
                                        {visitLogLength}
                                        &nbsp;+&nbsp;
                                        {logData.length.toString()})
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                {/* Header Labels Row */}
                                <View style={styles.headerRow}>
                                    <View style={styles.productHeaderCell}>
                                        <Text style={styles.headerText}>Product</Text>
                                    </View>
                                    <View style={styles.quantityHeaderCell}>
                                        <Text style={styles.headerText}>Quantity</Text>
                                    </View>
                                    <View style={styles.amountHeaderCell}>
                                        <Text style={styles.headerText}>Total</Text>
                                    </View>
                                </View>

                                <View style={styles.summaryRow}>
                                    <View style={styles.productHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            {productSummary.length}
                                        </Text>
                                    </View>
                                    <View style={styles.quantityHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            {totalQuantity}
                                        </Text>
                                    </View>
                                    <View style={styles.amountHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            ₹ {totalAmount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {productSummary.map((item, index) => (
                                <View key={index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 0 ? styles.evenRow : styles.oddRow,
                                    ]}
                                >
                                    <Text style={[styles.tableCell, styles.productCell]} numberOfLines={3} >
                                        {item.productName}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.quantityCell]}>
                                        {item.totalQty}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.amountCell]}>
                                        ₹ {parseFloat(item.totalAmount).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default SalesReportModal;