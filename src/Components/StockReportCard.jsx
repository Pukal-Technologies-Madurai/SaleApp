import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";

const StockReportCard = ({ data }) => {
    const [expandedRetailer, setExpandedRetailer] = useState(null);

    // Calculate Summary Statistics
    const calculateSummary = () => {
        let totalRetailers = data.length;
        let totalProducts = 0;
        let totalQuantity = 0;
        let uniqueProducts = new Set();

        data.forEach(entry => {
            totalProducts += entry.ProductCount.length;
            entry.ProductCount.forEach(product => {
                totalQuantity += product.ST_Qty;
                uniqueProducts.add(product.Product_Name.trim());
            });
        });

        return {
            totalRetailers,
            totalProducts,
            totalQuantity,
            uniqueProductCount: uniqueProducts.size
        };
    };

    const summary = calculateSummary();

    const toggleRetailerExpand = (retailerName) => {
        setExpandedRetailer(expandedRetailer === retailerName ? null : retailerName);
    };

    const renderSummarySection = () => (
        <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Stock Report Summary</Text>
            <View style={styles.summaryRowContainer}>
                <View style={styles.summaryCard}>
                    {/* <PackageOpen size={24} color="#4A90E2" /> */}
                    <Icon name="open" color="#4A90E2" size={20} strokeWidth={2} />
                    <Text style={styles.summaryCardTitle}>Retailers</Text>
                    <Text style={styles.summaryCardValue}>{summary.totalRetailers}</Text>
                </View>
                <View style={styles.summaryCard}>
                    {/* <List size={24} color="#50C878" /> */}
                    <Icon name="list" color="#50C878" size={20} strokeWidth={2} />
                    <Text style={styles.summaryCardTitle}>Product Types</Text>
                    <Text style={styles.summaryCardValue}>{summary.uniqueProductCount}</Text>
                </View>
                <View style={styles.summaryCard}>
                    {/* <ShoppingBasket size={24} color="#FF6B6B" /> */}
                    <Icon name="basket" color="#FF6B6B" size={20} strokeWidth={2} />
                    <Text style={styles.summaryCardTitle}>Total Qty</Text>
                    <Text style={styles.summaryCardValue}>{summary.totalQuantity}</Text>
                </View>
            </View>
        </View>
    );

    const renderRetailerSection = () => (
        <View style={styles.retailerListContainer}>
            <Text style={styles.sectionTitle}>Retailer Stock Details</Text>
            {data.map((entry, index) => (
                <TouchableOpacity
                    key={entry.ST_Id}
                    style={styles.retailerCard}
                    onPress={() => toggleRetailerExpand(entry.Retailer_Name)}
                >
                    <View style={styles.retailerHeader}>
                        <Text style={styles.retailerName} numberOfLines={1}>
                            {entry.Retailer_Name}
                        </Text>
                        <Text style={styles.dateText}>
                            {new Date(entry.ST_Date).toLocaleDateString()}
                        </Text>
                    </View>

                    {expandedRetailer === entry.Retailer_Name && (
                        <View style={styles.productDetailsContainer}>
                            {entry.ProductCount.map((product, productIndex) => (
                                <View key={productIndex} style={styles.productRow}>
                                    <Text style={styles.productName} numberOfLines={2}>
                                        {product.Product_Name.trim()}
                                    </Text>
                                    <View style={styles.quantityBadge}>
                                        <Text style={styles.quantityText}>{product.ST_Qty}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            {renderSummarySection()}
            {renderRetailerSection()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F9',
    },
    summaryContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        margin: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    summaryRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        width: '30%',
    },
    summaryCardTitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 5,
    },
    summaryCardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginTop: 5,
    },
    retailerListContainer: {
        padding: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        marginLeft: 5,
    },
    retailerCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    retailerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    retailerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 0.7,
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
    },
    productDetailsContainer: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    productName: {
        fontSize: 14,
        color: '#4B5563',
        flex: 0.8,
    },
    quantityBadge: {
        backgroundColor: '#E6F2FF',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    quantityText: {
        color: '#2C5282',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default StockReportCard;