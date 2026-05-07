import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import AppHeader from "../../Components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";

const SalesReport = ({ navigation, route }) => {
    const {
        logData,
        selectedDate,
        isNotAdmin = true,
    } = route.params;

    const [visitLogLength, setVisitLogLength] = useState(0);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const brandListRef = useRef(null);

    // ── Brand helper: use BrandGet if present, else first word of Item_Name / Product_Name
    const getBrand = useCallback((p) =>
        p.BrandGet?.trim() ||
        (p.Item_Name || p.Product_Name || "").trim().split(" ")[0] ||
        "Other", []);

    // Memoized product summary calculation
    const productSummary = useMemo(() => {
        const productMap = {};

        logData.forEach(order => {
            order.Products_List.forEach(product => {
                const productName = (product.Item_Name || product.Product_Name || "").trim();

                if (productMap[productName]) {
                    productMap[productName].totalQty += product.Total_Qty || product.Bill_Qty;
                    productMap[productName].totalAmount += parseFloat(product.Final_Amo || product.Amount);
                } else {
                    productMap[productName] = {
                        productName,
                        totalQty: product.Total_Qty || product.Bill_Qty,
                        totalAmount: parseFloat(product.Final_Amo || product.Amount),
                    };
                }
            });
        });

        return Object.values(productMap);
    }, [logData]);

    useEffect(() => {
        if (selectedDate) {
            fetchVisitLog();
        }
    }, [selectedDate]);

    // Memoized brand options
    const brandOptions = useMemo(() => {
        if (logData && logData.length > 0) {
            const allBrands = logData.flatMap(order =>
                order.Products_List.map(p => getBrand(p)),
            );
            return ["All", ...new Set(allBrands.filter(Boolean))];
        }
        return ["All"];
    }, [logData, getBrand]);

    const fetchVisitLog = async () => {
        try {
            const storeUserTypeId = await AsyncStorage.getItem("userTypeId");
            const userId = await AsyncStorage.getItem("UserId");
            const formattedDate = new Date(selectedDate)
                .toISOString()
                .split("T")[0];

            const isAdminUser = ["0", "1", "2"].includes(storeUserTypeId);
            const userIdParam = isAdminUser ? "" : userId;

            const url = `${API.visitedLog()}?reqDate=${formattedDate}&UserId=${userIdParam}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            if (data.success) {
                const existingRetailersMap = {};
                const newRetailersMap = {};
                for (const curr of data.data) {
                    // Existing retailer → dedupe by Retailer_Id
                    if (curr.IsExistingRetailer === 1 && curr.Retailer_Id !== null) {
                        existingRetailersMap[curr.Retailer_Id] = curr;
                    } else {
                        // New retailer → dedupe by Name + Mobile, keep latest EntryAt
                        const name = (curr.Reatailer_Name || "").trim();
                        const mobile = (curr.Contact_Mobile || "").trim();
                        const key = `${name}_${mobile}`;

                        if (
                            !newRetailersMap[key] ||
                            new Date(curr.EntryAt) > new Date(newRetailersMap[key].EntryAt)
                        ) {
                            newRetailersMap[key] = curr;
                        }
                    }
                }

                const uniqueEntries = [
                    ...Object.values(existingRetailersMap),
                    ...Object.values(newRetailersMap),
                ];

                setVisitLogLength(uniqueEntries.length || 0);
            } else {
                console.log("Failed to fetch logs:", data.message);
                setVisitLogLength(0);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setVisitLogLength(0);
        }
    };

    const selectedDateObj = new Date(selectedDate);

    const fromDate = selectedDateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        // year: "numeric",
    });

    const fromTime = selectedDateObj.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    });

    // Memoized filtered summary
    const filteredSummary = useMemo(() => 
        productSummary.filter(item =>
            selectedBrand === "All"
                ? true
                : logData.some(order =>
                    order.Products_List.some(
                        p =>
                            (p.Product_Name || p.Item_Name)?.trim() === item.productName.trim() &&
                            getBrand(p) === selectedBrand,
                    ),
                ),
        ),
    [productSummary, selectedBrand, logData, getBrand]);

    const filteredQuantity = useMemo(() => 
        filteredSummary.reduce((sum, item) => sum + item.totalQty, 0),
    [filteredSummary]);

    const filteredAmount = useMemo(() => 
        filteredSummary.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0),
    [filteredSummary]);

    // Handle brand selection with auto-scroll
    const handleBrandSelect = useCallback((brand, index) => {
        setSelectedBrand(brand);
        // Scroll to the selected brand chip
        if (brandListRef.current && index >= 0) {
            brandListRef.current.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5, // Center the item
            });
        }
    }, []);

    // FlatList key extractor
    const keyExtractor = useCallback((item, index) => 
        `${item.productName}-${index}`, []);

    // Render product item
    const renderProductItem = useCallback(({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
            <Text style={[styles.tableCell, styles.productCell]} numberOfLines={3}>
                {item.productName}
            </Text>
            <View style={styles.qtyContainer}>
                <Text style={styles.qtyValue}>{item.totalQty}</Text>
            </View>
            <Text style={[styles.tableCell, styles.amountCell]}>
                ₹{parseFloat(item.totalAmount).toFixed(0)}
            </Text>
        </View>
    ), []);

    // List header component
    const ListHeader = useCallback(() => (
        <>
            {/* Stats Card */}
            <View style={styles.statsCard}>
                <LinearGradient
                    colors={[customColors.primary, customColors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statsGradient}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <MaterialIcons name="event" size={18} color="rgba(255,255,255,0.8)" />
                            {/* <Text style={styles.statLabel}>Date</Text> */}
                            <Text style={styles.statValue}>{fromDate}</Text>
                            <Text style={styles.statTime}>{fromTime}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="cart-outline" size={18} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.statLabel}>Orders</Text>
                            <Text style={styles.statValue}>{logData.length}</Text>
                        </View>
                        {isNotAdmin && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <MaterialCommunityIcons name="store-outline" size={18} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.statLabel}>Visits</Text>
                                    <Text style={styles.statValue}>{visitLogLength}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </LinearGradient>
            </View>

            {/* Brand Filter Chips */}
            <FlatList
                ref={brandListRef}
                horizontal
                data={brandOptions}
                keyExtractor={(item, idx) => `brand-${idx}`}
                showsHorizontalScrollIndicator={false}
                style={styles.brandScroll}
                contentContainerStyle={styles.brandContainer}
                onScrollToIndexFailed={(info) => {
                    // Handle scroll failure gracefully
                    setTimeout(() => {
                        if (brandListRef.current) {
                            brandListRef.current.scrollToIndex({
                                index: info.index,
                                animated: true,
                                viewPosition: 0.5,
                            });
                        }
                    }, 100);
                }}
                renderItem={({ item: brand, index }) => (
                    <TouchableOpacity
                        style={[
                            styles.brandChip,
                            selectedBrand === brand && styles.brandChipActive,
                        ]}
                        onPress={() => handleBrandSelect(brand, index)}>
                        <Text style={[
                            styles.brandChipText,
                            selectedBrand === brand && styles.brandChipTextActive,
                        ]}>
                            {brand}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Summary Header */}
            <View style={styles.summaryHeader}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Products</Text>
                    <Text style={styles.summaryValue}>{filteredSummary.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Quantity</Text>
                    <Text style={styles.summaryValue}>{filteredQuantity}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={[styles.summaryValue, { color: customColors.success }]}>
                        ₹{filteredAmount.toFixed(0)}
                    </Text>
                </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.productCell]}>Product</Text>
                <Text style={[styles.headerText, styles.qtyHeader]}>Qty</Text>
                <Text style={[styles.headerText, styles.amountCell]}>Total</Text>
            </View>
        </>
    ), [fromDate, fromTime, logData.length, visitLogLength, isNotAdmin, brandOptions, selectedBrand, filteredSummary.length, filteredQuantity, filteredAmount, handleBrandSelect]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Product Summary"
                navigation={navigation}
                showBackButton={true}
            />

            <View style={styles.contentContainer}>
                <FlatList
                    data={filteredSummary}
                    keyExtractor={keyExtractor}
                    renderItem={renderProductItem}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            </View>
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
        backgroundColor: customColors.grey50,
    },
    listContent: {
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.xxl,
    },
    // Stats Card
    statsCard: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        borderRadius: 12,
        overflow: "hidden",
        ...shadows.medium,
    },
    statsGradient: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    statLabel: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.7)",
        marginTop: 4,
        marginBottom: 2,
    },
    statValue: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "700",
    },
    statTime: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    // Brand Filter
    brandScroll: {
        marginBottom: spacing.sm,
    },
    brandContainer: {
        paddingHorizontal: spacing.xs,
    },
    brandChip: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginRight: spacing.xs,
        borderRadius: 16,
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    brandChipActive: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    brandChipText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    brandChipTextActive: {
        color: customColors.white,
    },
    // Summary Header
    summaryHeader: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 10,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        marginBottom: 2,
    },
    summaryValue: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    // Table
    tableHeader: {
        flexDirection: "row",
        backgroundColor: customColors.grey800,
        paddingVertical: 10,
        paddingHorizontal: spacing.sm,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    headerText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: spacing.sm,
        backgroundColor: customColors.white,
    },
    evenRow: {
        backgroundColor: customColors.white,
    },
    oddRow: {
        backgroundColor: customColors.grey50,
    },
    tableCell: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    productCell: {
        flex: 2.5,
        paddingRight: spacing.xs,
    },
    qtyHeader: {
        flex: 0.8,
        textAlign: "center",
    },
    qtyContainer: {
        flex: 0.8,
        alignItems: "center",
    },
    qtyValue: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
        backgroundColor: customColors.primary + "15",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: "hidden",
    },
    amountCell: {
        flex: 1,
        textAlign: "right",
        fontWeight: "600",
        color: customColors.grey800,
    },
});

export default SalesReport;
