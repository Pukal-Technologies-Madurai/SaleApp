import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { customColors, typography } from "../Config/helper";

const SalesReportModal = ({
    visible,
    onClose,
    totalOrderAmount,
    totalProductsSold,
    logData,
    productSummary
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
            ...typography.h5(),
            fontWeight: "700",
            color: "#111827",
        },
        closeButton: {
            padding: 8,
        },
        contentContainer: {
            flex: 1,
            padding: 14,
        },
        headerCardsContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
        },
        headerCard: {
            flex: 1,
            minWidth: "48%",
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            shadowColor: customColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        cardIcon: {
            marginBottom: 8,
        },
        cardLabel: {
            ...typography.body1(),
            textAlign: "center",
            color: "#6B7280",
        },
        cardValue: {
            ...typography.h5(),
            fontWeight: "700",
            color: "#111827",
        },
        cardSubValue: {
            ...typography.body1(),
            color: "#6B7280",
            marginTop: 2,
        },
        tableContainer: {
            backgroundColor: customColors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
        },
        tableHeader: {
            flexDirection: "row",
            backgroundColor: customColors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        tableRow: {
            flexDirection: "row",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
        },
        tableCell: {
            ...typography.body1(),
            color: "#374151",
        },
        headerText: {
            ...typography.body1(),
            fontWeight: "700",
            color: customColors.white,
        },
        productCell: {
            flex: 2,
        },
        centerCell: {
            flex: 1,
            textAlign: "center",
        },
        rightCell: {
            flex: 1,
            textAlign: "right",
        },
        evenRow: {
            backgroundColor: customColors.white,
        },
        oddRow: {
            backgroundColor: "#F9FAFB",
        },
    };

    const headerCards = [
        {
            icon: "calendar",
            iconColor: "#4A90E2",
            backgroundColor: "#F0F9FF",
            label: new Date().toLocaleDateString(),
            value: new Date().toLocaleString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true
            }),
        },
        {
            icon: "money",
            iconColor: "#2ECC71",
            backgroundColor: "#F0FFF4",
            label: 'Total Order Amount',
            value: `₹ ${totalOrderAmount.toFixed(2)}`,
        },
        {
            icon: "shopping-basket",
            iconColor: "#E74C3C",
            backgroundColor: "#FFF0F0",
            label: "Products Sold",
            value: totalProductsSold.toString(),
        },
        {
            icon: "line-chart",
            iconColor: "#9B59B6",
            backgroundColor: "#FAF0FF",
            label: "Total Sales",
            value: logData.length.toString(),
        },
    ];

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
                        <View style={styles.headerCardsContainer}>
                            {headerCards.map((card, index) => (
                                <View key={index}
                                    style={[styles.headerCard, { backgroundColor: card.backgroundColor }]} >
                                    <Icon
                                        name={card.icon}
                                        size={24}
                                        color={card.iconColor}
                                        style={styles.cardIcon}
                                    />
                                    <Text style={styles.cardLabel}>{card.label}</Text>
                                    <Text style={styles.cardValue}>{card.value}</Text>
                                    {card.subValue && (
                                        <Text style={styles.cardSubValue}>{card.subValue}</Text>
                                    )}
                                </View>
                            ))}
                        </View>

                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, styles.headerText, styles.productCell]}>
                                    Product
                                </Text>
                                <Text style={[styles.tableCell, styles.headerText, styles.centerCell]}>
                                    Qty
                                </Text>
                                <Text style={[styles.tableCell, styles.headerText, styles.rightCell]}>
                                    Total
                                </Text>
                            </View>

                            {productSummary.map((item, index) => (
                                <View key={index} style={[
                                    styles.tableRow,
                                    index % 2 === 0 ? styles.evenRow : styles.oddRow,
                                ]} >
                                    <Text style={[styles.tableCell, styles.productCell]}
                                        numberOfLines={2} >
                                        {item.productName}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.centerCell]}>
                                        {item.totalQty}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.rightCell]}>
                                        ₹ {item.totalAmount}
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