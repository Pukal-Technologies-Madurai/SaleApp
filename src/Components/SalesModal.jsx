import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { customColors } from '../Config/helper';

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
                    <Text style={styles.detailValue}>{details.count}</Text>
                </View>
                <View style={styles.salesDetailsRow}>
                    <Text style={styles.detailLabel}>Total Sales Value: </Text>
                    <Text style={styles.detailValue}>₹ {details.totalValue.toFixed(2)}</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    contentContainer: {
        maxHeight: 400,
    },
    salesPersonContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f8f8f8',
        borderRadius: 5,
    },
    salesPersonName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: customColors.primary,
    },
    salesDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    noDataText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
    },
    closeButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: customColors.primary,
        borderRadius: 5,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default SalesModal;