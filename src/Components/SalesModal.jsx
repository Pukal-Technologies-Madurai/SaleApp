import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { customColors, typography } from '../Config/helper';

const SalesModal = ({
    saleData,
    saleCount,
    isSalesModalVisible,
    setIsSalesModalVisible
}) => {
    const renderSalesDetails = () => {
        // If no sale count data, return empty view
        if (!saleCount || Object.keys(saleCount).length === 0) {
            return (
                <Text style={styles.noDataText}>No sales data available</Text>
            );
        }

        return Object.entries(saleCount).map(([salesPerson, details]) => (
            <View key={salesPerson} style={styles.salesPersonContainer}>
                <Text style={styles.salesPersonName}>{salesPerson}</Text>
                <View style={styles.salesDetailsRow}>
                    <Text style={styles.detailLabel}>Number of Sales: </Text>
                    <Text style={[styles.detailValue, {color: "#34495E"}]}>{details.count}</Text>
                </View>
                <View style={styles.salesDetailsRow}>
                    <Text style={styles.detailLabel}>Total Sales Value: </Text>
                    <Text style={[styles.detailValue, {color: "#2ECC71"}]}>₹ {details.totalValue.toFixed(2)}</Text>
                </View>
            </View>
        ));
    };

    return (
        <Modal
            visible={isSalesModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsSalesModalVisible(false)}
        >
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Sales Details</Text>

                    <View style={styles.contentContainer}>
                        {renderSalesDetails()}
                    </View>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsSalesModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        backgroundColor: customColors.white,
        borderRadius: 10,
        padding: 20,
        maxHeight: "80%",
    },
    modalTitle: {
        textAlign: "center",
        ...typography.h5(),
        color: customColors.primary,
        fontWeight: "bold",
        marginBottom: 15,
    },
    contentContainer: {
        maxHeight: 400,
    },
    salesPersonContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: "#f8f8f8",
        borderRadius: 5,
    },
    salesPersonName: {
        ...typography.h6(),
        fontWeight: "bold",
        marginBottom: 10,
        color: customColors.primary,
    },
    salesDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    detailLabel: {
        ...typography.body1(),
        color: "#666",
    },
    detailValue: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.grey,
    },
    noDataText: {
        textAlign: "center",
        ...typography.h5(),
        color: "#666",
    },
    closeButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: customColors.primary,
        borderRadius: 5,
        alignItems: "center",
    },
    closeButtonText: {
        color: customColors.white,
        ...typography.h6(),
    },
});

export default SalesModal;