import { StyleSheet, Text, View, FlatList, ActivityIndicator, ToastAndroid, Platform, Alert } from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import { customColors, shadows, spacing, typography, customFonts, borderRadius, iconSizes } from "../../Config/helper";
import { useQuery } from "@tanstack/react-query";
import { fetchGoDownwiseStockValue, fetchProductsWithStockValue } from "../../Api/product";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Accordion from "../../Components/Accordion";
import FeatherIcon from "react-native-vector-icons/Feather";

const LiveStock = () => {
    const navigation = useNavigation();
    const [isActiveGoDown, setIsActiveGoDown] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const godownId = await AsyncStorage.getItem("activeGodown");
                if (godownId) {
                    setIsActiveGoDown(godownId);
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    const { data: products = [], isLoading: isProductsLoading, refetch } = useQuery({
        queryKey: ["productsWithStockValue"],
        queryFn: fetchProductsWithStockValue,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        select: (rows) => {
            return rows.map((row) => ({
                Product_Id: row.Product_Id,
                Product_Name: row.Product_Name,
                Product_Code: row.Product_Code,
                Pro_Group: row.Pro_Group,
                CL_Qty: row.CL_Qty,
                IsActive: row.IsActive,
                Product_Rate: row.Product_Rate,
                Brand_Id: row.Brand,
                Brand_Name: row.Brand_Name,
            }))
        }
    });

    const { data: goDownStockValueData = [], isLoading: isGodownStockLoading, refetch: refetchGodownStock } = useQuery({
        queryKey: ["goDownStockValue", isActiveGoDown],
        queryFn: () => fetchGoDownwiseStockValue(isActiveGoDown),
        enabled: !!isActiveGoDown,
        select: (rows) => {
            return rows.map((row) => ({
                Product_Id: row.Product_Id,
                stock_item_name: row.stock_item_name,
                Godown_Name: row.Godown_Name,
                Bal_Qty: row.Bal_Qty,
                Product_Rate: row.Product_Rate,
            }))
        }
    });

    const groupedData = useMemo(() => {
        if (!products.length || !goDownStockValueData.length) return [];

        // Create a Set of Product_Ids that exist in goDownStockValueData
        const stockProductIds = new Set(goDownStockValueData.map(stock => stock.Product_Id));
        
        const stockMap = goDownStockValueData.reduce((acc, stock) => {
            acc[stock.Product_Id] = stock.Bal_Qty;
            return acc;
        }, {});

        const groups = products.reduce((acc, item) => {
            // Only include products that exist in goDownStockValueData
            if (!stockProductIds.has(item.Product_Id)) return acc;
            
            const actualQty = stockMap[item.Product_Id] !== undefined ? stockMap[item.Product_Id] : 0;

            const brandName = item.Brand_Name || "Others";
            if (!acc[brandName]) {
                acc[brandName] = {
                    title: brandName,
                    data: [],
                };
            }

            acc[brandName].data.push({
                ...item,
                actualQty
            });
            return acc;
        }, {});

        return Object.values(groups)
            .filter(group => group.data.length > 0)
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [products, goDownStockValueData]);

    const handleRefresh = () => {
        refetch();
        refetchGodownStock();
        if (Platform.OS === "android") {
            ToastAndroid.show("Refreshing stock data...", ToastAndroid.SHORT);
        } else {
            Alert.alert("Refresh", "Refreshing stock data...");
        }
    };

    const renderHeader = (item) => (
        <View style={styles.accordionHeader}>
            <View style={styles.headerLeft}>
                <View style={styles.brandIconContainer}>
                    <FeatherIcon name="box" size={iconSizes.md} color={customColors.primary} />
                </View>
                <Text style={styles.brandTitle}>{item.title}</Text>
            </View>
            <View style={styles.headerRight}>
                <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>{item.data.length} Items</Text>
                </View>
                <FeatherIcon name="chevron-down" size={iconSizes.md} color={customColors.grey500} />
            </View>
        </View>
    );

    const renderContent = (item) => (
        <View style={styles.accordionContent}>
            {item.data.map((product, index) => (
                <View key={product.Product_Id} style={[styles.productRow, index === item.data.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.Product_Name}</Text>
                        <Text style={styles.productCode}>{product.Pro_Group || "N/A"}</Text>
                    </View>
                    <View style={styles.stockInfo}>
                        <Text style={[
                            styles.stockValue,
                            product.actualQty > 0 ? styles.positiveStock : styles.zeroStock
                        ]}>
                            {product.actualQty}
                        </Text>
                        <Text style={styles.stockLabel}>Stock</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Live Stock" 
                navigation={navigation}
                showRightIcon={true}
                rightIconName="refresh-cw"
                rightIconLibrary="Feather"
                onRightIconPress={handleRefresh}
            />

            <View style={styles.contentContainer}>
                {isProductsLoading || isGodownStockLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loaderText}>Loading Stock Data...</Text>
                    </View>
                ) : groupedData.length > 0 ? (
                    <>
                    <View style={styles.totalCountContainer}>
                        <Text style={styles.totalCountText}>
                            Total Products: {goDownStockValueData.length}
                        </Text>
                    </View>
                    <FlatList
                        data={[1]}
                        keyExtractor={item => item.toString()}
                        renderItem={() => (
                            <Accordion
                                data={groupedData}
                                renderHeader={renderHeader}
                                renderContent={renderContent}
                                customStyles={{
                                    container: styles.accordionContainer,
                                    itemContainer: styles.accordionItem,
                                }}
                            />
                        )}
                        contentContainerStyle={{ paddingBottom: spacing.lg }}
                    />
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <FeatherIcon name="package" size={iconSizes.xxl} color={customColors.grey400} />
                        </View>
                        <Text style={styles.emptyText}>No data available</Text>
                        <Text style={styles.emptySubtext}>Stock data will appear here</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default LiveStock;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loaderText: {
        marginTop: spacing.sm,
        ...typography.body2(),
        color: customColors.grey500,
    },
    totalCountContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.md,
        ...shadows.small,
    },
    totalCountText: {
        ...typography.subtitle2(),
        textAlign: "center",
        fontFamily: customFonts.poppinsMedium,
        color: customColors.grey700,
    },
    accordionContainer: {
        margin: spacing.sm,
    },
    accordionItem: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.md,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    brandIconContainer: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    brandTitle: {
        ...typography.subtitle1(),
        marginLeft: spacing.sm,
        color: customColors.grey900,
        fontWeight: "600",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemCountBadge: {
        backgroundColor: customColors.primaryFaded,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        marginRight: spacing.xs,
    },
    itemCountText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "500",
    },
    accordionContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    productName: {
        ...typography.body2(),
        fontFamily: customFonts.poppinsMedium,
        color: customColors.grey900,
    },
    productCode: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    stockInfo: {
        alignItems: "center",
        minWidth: 56,
        backgroundColor: customColors.grey50,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    stockValue: {
        ...typography.subtitle1(),
        fontWeight: "700",
        color: customColors.primaryDark,
    },
    positiveStock: {
        color: customColors.success,
    },
    zeroStock: {
        color: customColors.error,
    },
    stockLabel: {
        ...typography.overline(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    emptyText: {
        ...typography.subtitle1(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    emptySubtext: {
        ...typography.body2(),
        color: customColors.grey500,
        marginTop: spacing.xs,
    },
});
