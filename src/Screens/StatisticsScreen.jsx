import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import AppHeader from "../Components/AppHeader";
import { customColors, typography } from "../Config/helper";

const StatisticsScreen = ({ route, navigation }) => {
    const {
        title,
        userCount,
        selectedDate,
        selectedBranch,
    } = route.params;

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate async fetch, replace with your actual reload logic
        setTimeout(() => {
            setRefreshing(false);
        }, 1200);
    }, []);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        if (!userCount || Object.keys(userCount).length === 0) {
            return { totalSales: 0, totalAmount: 0, totalCancelled: 0, salesPersonCount: 0 };
        }
        
        return Object.values(userCount).reduce((acc, details) => ({
            totalSales: acc.totalSales + details.count,
            totalAmount: acc.totalAmount + details.totalValue,
            totalCancelled: acc.totalCancelled + details.cancelledCount,
            salesPersonCount: acc.salesPersonCount + 1,
        }), { totalSales: 0, totalAmount: 0, totalCancelled: 0, salesPersonCount: 0 });
    }, [userCount]);

    const renderSummaryCard = () => (
        <LinearGradient
            colors={["#3B82F6", "#2563EB", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
                <View style={styles.summaryIconWrapper}>
                    <MaterialCommunityIcons name="chart-areaspline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.summaryTitle}>
                    {selectedDate === new Date().toISOString().split("T")[0] 
                        ? "Today's Summary" 
                        : new Date(selectedDate).toLocaleDateString("en-IN", { 
                            day: "2-digit", 
                            month: "short", 
                            year: "numeric" 
                        })}
                </Text>
            </View>
            
            <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{summaryStats.salesPersonCount}</Text>
                    <Text style={styles.summaryStatLabel}>Salespersons</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{summaryStats.totalSales}</Text>
                    <Text style={styles.summaryStatLabel}>Total Orders</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>₹{(summaryStats.totalAmount / 1000).toFixed(1)}K</Text>
                    <Text style={styles.summaryStatLabel}>Revenue</Text>
                </View>
            </View>
        </LinearGradient>
    );

    const renderSalesPersonCard = (salesPerson, details, index) => {
        const hasCancelled = details.cancelledCount > 0;
        
        return (
            <TouchableOpacity
                key={salesPerson}
                style={styles.salesPersonCard}
                activeOpacity={0.7}
                onPress={() => {
                    navigation.navigate("SalesAdmin", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranch || "",
                        selectedSalesPersonId: details.salesPersonId,
                    });
                }}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={hasCancelled ? ["#F87171", "#EF4444"] : ["#34D399", "#10B981"]}
                            style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {salesPerson.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    </View>
                    
                    <View style={styles.cardTitleSection}>
                        <Text style={styles.salesPersonName} numberOfLines={1}>
                            {salesPerson}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: "#DBEAFE" }]}>
                                <Text style={[styles.badgeText, { color: "#2563EB" }]}>
                                    {details.count} orders
                                </Text>
                            </View>
                            {hasCancelled && (
                                <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
                                    <Text style={[styles.badgeText, { color: "#DC2626" }]}>
                                        {details.cancelledCount} cancelled
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    <View style={styles.arrowContainer}>
                        <Feather name="chevron-right" size={20} color={customColors.grey400} />
                    </View>
                </View>
                
                <View style={styles.cardDivider} />
                
                <View style={styles.cardStats}>
                    <View style={styles.statBlock}>
                        <View style={styles.statIconWrapper}>
                            <MaterialIcons name="receipt-long" size={16} color="#10B981" />
                        </View>
                        <View>
                            <Text style={styles.statBlockLabel}>Active Sales</Text>
                            <Text style={styles.statBlockValue}>{details.activeCount}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.statBlock}>
                        <View style={[styles.statIconWrapper, { backgroundColor: "#FEF3C7" }]}>
                            <MaterialIcons name="currency-rupee" size={16} color="#D97706" />
                        </View>
                        <View>
                            <Text style={styles.statBlockLabel}>Total Value</Text>
                            <Text style={[styles.statBlockValue, { color: "#D97706" }]}>
                                ₹{details.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderContent = () => {
        if (!userCount || Object.keys(userCount).length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <MaterialCommunityIcons name="chart-box-outline" size={64} color={customColors.grey300} />
                    <Text style={styles.noDataTitle}>No Sales Data</Text>
                    <Text style={styles.noDataText}>No sales records found for this date</Text>
                </View>
            );
        }

        return (
            <>
                {renderSummaryCard()}
                
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sales by Person</Text>
                    <Text style={styles.sectionSubtitle}>{summaryStats.salesPersonCount} active</Text>
                </View>
                
                {Object.entries(userCount).map(([salesPerson, details], index) => 
                    renderSalesPersonCard(salesPerson, details, index)
                )}
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                navigation={navigation}
                title={`${title} Statistics`}
                showBackButton={true}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="arrow-up-right"
                onRightPress={() => navigation.navigate("SalesAdmin", {
                    selectedDate: selectedDate,
                    selectedBranch: selectedBranch || "",
                })}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[customColors.primary]}
                    />
                }
                >
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
        backgroundColor: customColors.background,
    },
    scrollViewContent: {
        padding: 16,
        paddingBottom: 32,
    },
    
    // Summary Card
    summaryCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    summaryIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    summaryTitle: {
        ...typography.h6(),
        color: "#FFFFFF",
        fontWeight: "600",
    },
    summaryStatsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryStatItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryStatValue: {
        ...typography.h5(),
        color: "#FFFFFF",
        fontWeight: "700",
        marginBottom: 4,
    },
    summaryStatLabel: {
        ...typography.caption(),
        color: "rgba(255, 255, 255, 0.8)",
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    
    // Section Header
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey800,
    },
    sectionSubtitle: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    
    // Sales Person Card
    salesPersonCard: {
        backgroundColor: customColors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        ...typography.h6(),
        color: "#FFFFFF",
        fontWeight: "700",
    },
    cardTitleSection: {
        flex: 1,
    },
    salesPersonName: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: customColors.grey100,
        alignItems: "center",
        justifyContent: "center",
    },
    cardDivider: {
        height: 1,
        backgroundColor: customColors.grey100,
        marginVertical: 14,
    },
    cardStats: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statBlock: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    statIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#D1FAE5",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    statBlockLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        marginBottom: 1,
    },
    statBlockValue: {
        ...typography.body2(),
        fontWeight: "600",
        color: "#059669",
    },
    
    // No Data
    noDataContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    noDataTitle: {
        ...typography.h6(),
        color: customColors.grey600,
        marginTop: 16,
        marginBottom: 4,
    },
    noDataText: {
        ...typography.body2(),
        color: customColors.grey400,
        textAlign: "center",
    },
});

export default StatisticsScreen;
