import { StyleSheet, Text, View, FlatList, ActivityIndicator, ToastAndroid, Platform, Alert } from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import { customColors, shadows, spacing, typography, customFonts } from "../../Config/helper";
import { useQuery } from "@tanstack/react-query";
import { fetchGoDownwiseStockValue, fetchProductsWithStockValue } from "../../Api/product";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Accordion from "../../Components/Accordion";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

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
        if (!products.length) return [];

        const stockMap = goDownStockValueData.reduce((acc, stock) => {
            acc[stock.Product_Id] = stock.Bal_Qty;
            return acc;
        }, {});

        const groups = products.reduce((acc, item) => {
            const actualQty = stockMap[item.Product_Id] !== undefined ? stockMap[item.Product_Id] : 0;
            
            // Only include products with stock > 0
            if (actualQty <= 0) return acc;

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
                <MaterialIcons name="inventory" size={24} color={customColors.primary} />
                <Text style={styles.brandTitle}>{item.title}</Text>
            </View>
            <View style={styles.headerRight}>
                <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>{item.data.length} Items</Text>
                </View>
                <MaterialIcons name="keyboard-arrow-down" size={24} color={customColors.grey500} />
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
                rightIconName="refresh"
                rightIconLibrary="MaterialIcon"
                onRightIconPress={handleRefresh}
            />

            <View style={styles.contentContainer}>
                {isProductsLoading || isGodownStockLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loaderText}>Loading Stock Data...</Text>
                    </View>
                ) : groupedData.length > 0 ? (
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
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="inventory-2" size={64} color={customColors.grey300} />
                        <Text style={styles.emptyText}>No data available</Text>
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
        backgroundColor: customColors.background,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loaderText: {
        marginTop: spacing.sm,
        ...typography.body2(),
        color: customColors.grey600,
    },
    accordionContainer: {
        margin: spacing.sm,
    },
    accordionItem: {
        backgroundColor: customColors.white,
        borderRadius: 12,
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
    brandTitle: {
        ...typography.h6(),
        marginLeft: spacing.sm,
        color: customColors.black,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemCountBadge: {
        backgroundColor: customColors.primaryLight + "20",
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: spacing.xs,
    },
    itemCountText: {
        ...typography.overline(),
        color: customColors.primaryDark,
        textTransform: "none",
        letterSpacing: 0,
    },
    accordionContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.border,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
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
        minWidth: 50,
    },
    stockValue: {
        ...typography.h6(),
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
        color: customColors.grey600,
        marginTop: -4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        marginTop: spacing.md,
        ...typography.body1(),
        color: customColors.grey500,
    },
});
