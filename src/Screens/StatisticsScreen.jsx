import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../Components/AppHeader";
import { customColors, typography } from "../Config/helper";

const StatisticsScreen = ({ route, navigation }) => {
    const {
        title,
        userCount,
    } = route.params;

    // console.log("Received userCount data:", userCount);

    const renderSalesDetails = () => {
        if (!userCount || Object.keys(userCount).length === 0) {
            return (
                <Text style={styles.noDataText}>No sales data available</Text>
            );
        }

        return Object.entries(userCount).map(([salesPerson, details]) => {
            // console.log(`Rendering details for ${salesPerson}:`, details);

            return (
                <View key={salesPerson} style={styles.salesPersonContainer}>
                    <Text style={[styles.salesPersonName, {color: details.cancelledCount > 0 ? customColors.error : customColors.primary}]}>{salesPerson}</Text>
                    <View style={styles.salesDetailsRow}>
                        <Text style={styles.detailLabel}>Number of Sales: </Text>
                        <Text style={[styles.detailValue, { color: customColors.info }]}>
                            {details.count} {details.cancelledCount > 0 && `(${details.cancelledCount} cancelled)`}
                        </Text>
                    </View>
                    <View style={styles.salesDetailsRow}>
                        <Text style={styles.detailLabel}>Total Sales Value: </Text>
                        <Text style={[styles.detailValue, { color: customColors.success }]}>
                            ₹ {details.totalValue.toFixed(2)}
                        </Text>
                    </View>
                </View>
            )
        });
    };

    const renderContent = () => {
        if (!userCount || Object.keys(userCount).length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No data available</Text>
                </View>
            );
        }

        return renderSalesDetails();
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                navigation={navigation}
                title={`${title} Statistics`}
                showBackButton={true}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={true}>
                {renderContent()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        padding: 20,
        backgroundColor: customColors.background,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    noDataContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    noDataText: {
        ...typography.h5(),
        color: "#95a5a6",
        textAlign: "center",
    },
    // Sales specific styles
    salesPersonContainer: {
        marginBottom: 15,
        padding: 15,
        backgroundColor: customColors.white,
        borderRadius: 8,
        ...customColors.shadow,
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
    },
});

export default StatisticsScreen;
