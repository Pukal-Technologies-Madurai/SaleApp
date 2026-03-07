import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, ToastAndroid, View, TouchableOpacity } from "react-native";
import React from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Accordion from "../../Components/Accordion";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { API } from "../../Config/Endpoint";
import { fetchGodown } from "../../Api/retailers";
import { customColors, shadows, spacing, typography, customFonts } from "../../Config/helper";
import { fetchGoDownwiseStockValue, fetchProductsWithStockValue } from "../../Api/product";

const GodownTransfer = () => {
    const navigation = useNavigation();
    const [isActiveGoDown, setIsActiveGoDown] = React.useState(false);
    const [transferQty, setTransferQty] = React.useState({});
    const [transferGodown, setTransferGodown] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
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
                HSN_Code: row.HSN_Code || "",
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
    
    const groupedData = React.useMemo(() => {
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

    const { data: goDownData = [], isLoading, isError } = useQuery({
        queryKey: ["goDownData"],
        queryFn: () => fetchGodown(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        select: (rows) => {
            return rows.map((row) => ({
                id: row.Godown_Id,
                name: row.Godown_Name,
                tallyId: row.Godown_Tally_Id,
            }))
        }
    });

    const handleRefresh = () => {
        refetch();
        refetchGodownStock();
        if (Platform.OS === "android") {
            ToastAndroid.show("Refreshing stock data...", ToastAndroid.SHORT);
        } else {
            Alert.alert("Refresh", "Refreshing stock data...");
        }
    };

    const handleQtyChange = (productId, value, maxQty) => {
        const numValue = value.replace(/[^0-9]/g, '');
        const parsedValue = parseInt(numValue, 10) || 0;
        const limitedValue = parsedValue > maxQty ? maxQty.toString() : numValue;
        setTransferQty(prev => ({
            ...prev,
            [productId]: limitedValue
        }));
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
                        <View style={styles.productMeta}>
                            <Text style={styles.productCode}>{product.Pro_Group || "N/A"}</Text>
                            <Text style={styles.availableStock}>Avail: {product.actualQty}</Text>
                        </View>
                    </View>
                    <View style={styles.stockInputContainer}>
                        <TextInput
                            style={styles.stockInput}
                            value={transferQty[product.Product_Id] || ''}
                            onChangeText={(value) => handleQtyChange(product.Product_Id, value, product.actualQty)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={customColors.grey400}
                            maxLength={String(product.actualQty).length}
                        />
                    </View>
                </View>
            ))}
        </View>
    );
    
    const handleSubmitTransfer = async () => {
        // Validation
        if (!transferGodown) {
            Alert.alert("Error", "Please select a godown to transfer");
            return;
        }

        if (transferGodown === isActiveGoDown) {
            Alert.alert("Error", "Source and destination godown cannot be the same");
            return;
        }

        // Build transfer items from transferQty state
        const transferItems = [];
        const allProducts = groupedData.flatMap(group => group.data);

        Object.entries(transferQty).forEach(([productId, qty]) => {
            const parsedQty = parseInt(qty, 10) || 0;
            if (parsedQty > 0) {
                const product = allProducts.find(p => p.Product_Id === productId);
                if (product) {
                    transferItems.push({
                        Product_Id: productId,
                        QTY: parsedQty,
                        HSN_Code: product.HSN_Code || "",
                        Unit_Id: 0,
                        Units: "",
                        Gst_Rate: product.Product_Rate || 0,
                    });
                }
            }
        });

        if (transferItems.length === 0) {
            Alert.alert("Error", "Please enter quantity for at least one product");
            return;
        }

        setIsSubmitting(true);

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

            // Build payload as array (matching web frontend)
            const payload = transferItems.map(item => ({
                Arr_Id: "",
                Arrival_Date: currentDate,
                Batch_No: "",
                BatchLocation: "",
                BillNo: "",
                Cgst_P: 0,
                Concern: "",
                Created_By: userId || "1",
                CreatedAt: "",
                From_Location: isActiveGoDown,
                GST_Inclusive: 0,
                Gst_P: 0,
                Gst_Rate: item.Gst_Rate,
                HSN_Code: item.HSN_Code,
                Igst_P: 0,
                IS_IGST: 0,
                KGS: 0,
                Product_Id: item.Product_Id,
                QTY: item.QTY,
                Round_off: 0,
                Sgst_P: 0,
                Taxable_Value: 0,
                To_Location: transferGodown,
                Total_Value: 0,
                Unit_Id: item.Unit_Id,
                Units: item.Units,
                Updated_By: userId || "1",
            }));

            const response = await fetch(API.createGodownTransfer(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                if (Platform.OS === "android") {
                    ToastAndroid.show(data.message || "Stock transferred successfully!", ToastAndroid.SHORT);
                } else {
                    Alert.alert("Success", data.message || "Stock transferred successfully!");
                }
                // Reset form
                setTransferQty({});
                setTransferGodown(null);
                // Refresh data
                refetch();
                refetchGodownStock();
            } else {
                Alert.alert("Error", data.message || "Failed to transfer stock");
            }
        } catch (error) {
            console.error("Transfer error:", error);
            Alert.alert("Error", "An error occurred while transferring stock");
        } finally {
            setIsSubmitting(false);
        }
    };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <AppHeader
            title="Godown Transfer" 
            navigation={navigation}
            showRightIcon={true}
            rightIconName="refresh"
            rightIconLibrary="MaterialIcon"
            onRightIconPress={handleRefresh}
        />

        <View style={styles.contentContainer}>

            <View style={styles.goDownSelectorContainer}>
                <Text style={styles.label}>Select Godown to Transfer</Text>
                <EnhancedDropdown 
                    data={goDownData}
                    labelField="name"
                    valueField="id"
                    value={transferGodown}
                    onChange={(item) => setTransferGodown(item.id)}
                    placeholder="Select Godown"
                />
            </View>


      {isProductsLoading || isGodownStockLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loaderText}>Loading Stock Data...</Text>
                    </View>
                ) : groupedData.length > 0 ? (
                    <FlashList
                        data={[1]}
                        keyExtractor={item => item.toString()}
                        estimatedItemSize={200}
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

        {groupedData.length > 0 && (
            <View style={styles.submitContainer}>
                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitTransfer}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={customColors.white} />
                    ) : (
                        <>
                            <MaterialIcons name="swap-horiz" size={24} color={customColors.white} />
                            <Text style={styles.submitButtonText}>Transfer Stock</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        )}

    </SafeAreaView>
  )
}

export default GodownTransfer

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
    stockInputContainer: {
        alignItems: "center",
        minWidth: 70,
    },
    stockInput: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderColor: customColors.primary,
        borderRadius: 8,
        textAlign: "center",
        ...typography.body2(),
        color: customColors.grey900,
        backgroundColor: customColors.white,
        paddingHorizontal: spacing.xs,
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
    productMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    availableStock: {
        ...typography.caption(),
        color: customColors.success,
        fontFamily: customFonts.poppinsMedium,
    },
    goDownSelectorContainer: {
        backgroundColor: customColors.white,
        margin: spacing.sm,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.small,
    },
    label: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
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
    submitContainer: {
        backgroundColor: customColors.white,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.border,
        ...shadows.medium,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.md,
        borderRadius: 12,
        gap: spacing.sm,
    },
    submitButtonDisabled: {
        backgroundColor: customColors.grey400,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
})