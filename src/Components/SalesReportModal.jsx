import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { customColors, typography, shadows, spacing } from "../Config/helper";
import { API } from "../Config/Endpoint";

const SalesReportModal = ({
    visible,
    onClose,
    totalOrderAmount,
    totalProductsSold,
    logData,
    productSummary,
    selectedDate,
}) => {
    const styles = {
        modalBackground: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
        },
        modalContainer: {
            width: "90%",
            maxHeight: "80%",
            backgroundColor: customColors.white,
            borderRadius: 16,
            overflow: "hidden",
            ...shadows.large,
        },
        modalHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: spacing.md,
            backgroundColor: customColors.primary,
            borderBottomWidth: 1,
            borderBottomColor: customColors.grey200,
        },
        modalHeaderText: {
            ...typography.h6(),
            color: customColors.white,
            fontWeight: "700",
        },
        closeButton: {
            padding: spacing.xs,
        },
        contentContainer: {
            padding: spacing.md,
        },
        statsContainer: {
            marginBottom: spacing.md,
        },
        statRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: customColors.grey200,
        },
        statValue: {
            ...typography.subtitle1(),
            color: customColors.grey900,
            fontWeight: "600",
            paddingHorizontal: spacing.md,
        },
        tableContainer: {
            backgroundColor: customColors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: customColors.grey200,
            overflow: "hidden",
            marginTop: spacing.md,
        },
        tableHeader: {
            backgroundColor: customColors.primary,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
        },
        tableRow: {
            flexDirection: "row",
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: customColors.grey200,
        },
        headerRow: {
            flexDirection: "row",
            marginBottom: spacing.xs,
        },
        summaryRow: {
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.2)",
            paddingTop: spacing.xs,
        },
        headerText: {
            ...typography.subtitle2(),
            color: customColors.white,
            fontWeight: "700",
        },
        summaryText: {
            ...typography.subtitle2(),
            color: customColors.white,
            opacity: 0.9,
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
            ...typography.body2(),
            color: customColors.grey900,
        },
        productCell: {
            flex: 2,
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
            backgroundColor: customColors.grey50,
        },
        checkOrderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            marginRight: spacing.xl,
            marginTop: spacing.sm,
        },
        checkOrderText: {
            ...typography.body2(),
            color: customColors.grey700,
            marginLeft: spacing.md,
            fontWeight: "600",
        },
    };

    const [visitLogLength, setVisitLogLength] = React.useState(0);
    const totalQuantity = productSummary.reduce(
        (sum, item) => sum + item.totalQty,
        0,
    );
    const totalAmount = productSummary.reduce(
        (sum, item) => sum + parseFloat(item.totalAmount),
        0,
    );

    const fromDate = new Date(selectedDate).toLocaleDateString().split("T")[0];
    const fromTime = new Date(selectedDate).toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    });

    React.useEffect(() => {
        (async () => {
            try {
                if (!selectedDate) {
                    console.log("selectedDate is undefined");
                    return;
                }
                const storeUserTypeId =
                    await AsyncStorage.getItem("userTypeId");
                const userId = await AsyncStorage.getItem("UserId");
                const formattedDate = new Date(selectedDate)
                    .toISOString()
                    .split("T")[0];

                const isAdminUser = ["0", "1", "2"].includes(storeUserTypeId);

                if (isAdminUser) {
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
            const url = `${API.visitedLog()}?reqDate=${date}&UserId=${userIdParam}`;
            // console.log(url);

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
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}>
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>Sales Report</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}>
                            <Icon
                                name="times"
                                size={24}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.contentContainer}>
                        <View style={styles.statsContainer}>
                            <View style={styles.statRow}>
                                <Icon
                                    name="calendar"
                                    size={20}
                                    color={customColors.primary}
                                />
                                <Text style={styles.statValue}>
                                    {fromDate} • {fromTime}
                                </Text>
                            </View>

                            <View style={styles.checkOrderRow}>
                                <Text style={styles.checkOrderText}>
                                    Check-Ins: {visitLogLength}
                                </Text>
                                <Text style={styles.checkOrderText}>
                                    Orders: {logData.length}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <MaterialCommunityIcons
                                    name="bike"
                                    size={24}
                                    color={customColors.success}
                                />
                                <Text style={styles.statValue}>
                                    Total Visits: s
                                    <Text
                                        style={{
                                            color: customColors.error,
                                            fontWeight: "bold",
                                        }}>
                                        {totalVisitLogCount} (for sales:{" "}
                                        {logData.length})
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <View style={styles.headerRow}>
                                    <View style={styles.productHeaderCell}>
                                        <Text style={styles.headerText}>
                                            Product
                                        </Text>
                                    </View>
                                    <View style={styles.quantityHeaderCell}>
                                        <Text style={styles.headerText}>
                                            Quantity
                                        </Text>
                                    </View>
                                    <View style={styles.amountHeaderCell}>
                                        <Text style={styles.headerText}>
                                            Total
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.summaryRow}>
                                    <View style={styles.productHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            {productSummary.length} Products
                                        </Text>
                                    </View>
                                    <View style={styles.quantityHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            {totalQuantity}
                                        </Text>
                                    </View>
                                    <View style={styles.amountHeaderCell}>
                                        <Text style={styles.summaryText}>
                                            ₹{totalAmount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {productSummary.map((item, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 0
                                            ? styles.evenRow
                                            : styles.oddRow,
                                    ]}>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.productCell,
                                        ]}
                                        numberOfLines={2}>
                                        {item.productName}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.quantityCell,
                                        ]}>
                                        {item.totalQty}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.amountCell,
                                        ]}>
                                        ₹
                                        {parseFloat(item.totalAmount).toFixed(
                                            2,
                                        )}
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
