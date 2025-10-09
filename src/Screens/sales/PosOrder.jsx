import { FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, Modal, Alert, ActivityIndicator } from "react-native";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { customColors, shadows, spacing, typography } from "../../Config/helper";
import { useMutation, useQuery } from "@tanstack/react-query";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { createSaleOrder } from "../../Api/sales";
import { fetchCostCenter, fetchPosOrderBranch, fetchProductsWithStockValue } from "../../Api/product";

const PosOrder = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();
    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [orderItems, setOrderItems] = useState({});
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTransportId, setSelectedTransportId] = useState(null);
    const [selectedBrokerId, setSelectedBrokerId] = useState(null);
    const [showFilter, setShowFilter] = useState(false);

    const [orderData, setOrderData] = useState({
        Company_Id: item.Company_Id,
        So_Date: new Date().toISOString().split("T")[0],
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Sales_Person_Id: "",
        Sales_Person_Name: "",
        Branch_Id: "",
        Narration: "",
        Created_by: "",
        So_Id: "",
        TaxType: 0,
        VoucherType: 173, // 166 //39,
        Product_Array: [],
        Staff_Involved_List: [],
    });

    const { data: productBranch = [], isLoading: isBranchLoading } = useQuery({
        queryKey: ["posOrderBranch"],
        queryFn: fetchPosOrderBranch,
    });

    const { data: productData = [], isLoading: isProductLoading } = useQuery({
        queryKey: ["masterDataProducts"],
        queryFn: () => fetchProductsWithStockValue(),
        // enabled: !!item.Company_Id,
    });

    const { data: rawCostCenters = [], isLoading: isCostCenterLoading } = useQuery({
        queryKey: ["costCenters"],
        queryFn: fetchCostCenter,
    });

    const { brokersData, transportData } = useMemo(() => {
        const Broker_User_Type = 3;
        const Transport_User_Type = 2;

        const broker = rawCostCenters.filter(item => item.User_Type === Broker_User_Type);
        const transport = rawCostCenters.filter(item => item.User_Type === Transport_User_Type);

        return { brokersData: broker, transportData: transport };
    }, [rawCostCenters]);

    const mutation = useMutation({
        mutationFn: createSaleOrder,
        onSuccess: data => {
            Alert.alert("Success", data.message, [
                {
                    text: "Okay",
                    onPress: () => {
                        setShowOrderSummary(false);
                        navigation.goBack();
                    },
                },
            ]);
        },
        onError: error => {
            Alert.alert("Error", error.message || "Failed to submit order");
        },
    });

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");
                const branchId = await AsyncStorage.getItem("branchId");

                if (companyId && userId) {
                    setOrderData(prev => ({
                        ...prev,
                        Company_Id: companyId,
                        Sales_Person_Id: userId,
                        Created_by: userId,
                        Sales_Person_Name: userName,
                        Branch_Id: branchId,
                    }));
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    useEffect(() => {
        const productArray = Object.values(orderItems)
            .filter(item => item.qty > 0 && item.rate > 0)
            .map(item => ({
                Item_Id: item.Product_Id,
                Bill_Qty: item.qty,
                Item_Rate: item.rate,
                UOM: item.UOM_Id || 1, // Default UOM if not specified
                Product_Id: item.Product_Id,
            }));

        setOrderData(prev => ({
            ...prev,
            Product_Array: productArray
        }));
    }, [orderItems]);

    useEffect(() => {
        const staffInvolvedList = [];

        // Add selected broker if valid
        if (selectedBrokerId && brokersData.length > 0) {
            const selectedBroker = brokersData.find(broker =>
                String(broker.Cost_Center_Id) === String(selectedBrokerId)
            );

            if (selectedBroker) {
                staffInvolvedList.push({
                    Id: "",
                    So_Id: "",
                    Involved_Emp_Id: parseInt(selectedBroker.Cost_Center_Id),
                    EmpName: selectedBroker.Cost_Center_Name || "",
                    Cost_Center_Type_Id: selectedBroker.User_Type || 3,
                    EmpType: selectedBroker.UserTypeGet || "Broker"
                });
            }
        }

        // Add selected transport if valid
        if (selectedTransportId && transportData.length > 0) {
            const selectedTransport = transportData.find(transport =>
                String(transport.Cost_Center_Id) === String(selectedTransportId)
            );

            if (selectedTransport) {
                staffInvolvedList.push({
                    Id: "",
                    So_Id: "",
                    Involved_Emp_Id: parseInt(selectedTransport.Cost_Center_Id),
                    EmpName: selectedTransport.Cost_Center_Name || "",
                    Cost_Center_Type_Id: selectedTransport.User_Type || 2,
                    EmpType: selectedTransport.UserTypeGet || "Transport"
                });
            }
        }

        setOrderData(prev => ({
            ...prev,
            Staff_Involved_List: staffInvolvedList
        }));
    }, [selectedBrokerId, selectedTransportId, brokersData, transportData]);

    // Computed values
    const filteredProducts = useMemo(() => {
        if (!productData.length) return [];

        const activeProducts = productData.filter(product => product.IsActive === 1);

        if (!selectedBrandId) return activeProducts;

        return activeProducts.filter(product => product.Pos_Brand_Id === selectedBrandId);
    }, [productData, selectedBrandId]);

    const { totalAmount, orderCount } = useMemo(() => {
        const items = Object.values(orderItems).filter(item => item.qty > 0 && item.rate > 0);
        const total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        return { totalAmount: total, orderCount: items.length };
    }, [orderItems]);

    // Handlers
    const updateOrderItem = useCallback((productId, field, value) => {
        setOrderItems(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: value === '' ? 0 : parseFloat(value) || 0,
                [`${field}Text`]: value // Store the text representation
            }
        }));
    }, []);

    const addToOrder = useCallback((product) => {
        setOrderItems(prev => ({
            ...prev,
            [product.Product_Id]: {
                ...product,
                qty: (prev[product.Product_Id]?.qty || 0) + 1,
                rate: product.Item_Rate || 0
            }
        }));
    }, []);

    const removeFromOrder = useCallback((productId) => {
        setOrderItems(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
        });
    }, []);

    const handleSubmitOrder = async () => {
        if (orderData.Product_Array.length === 0) {
            Alert.alert(
                "Error",
                "Please add at least one product to the order"
            );
            return;
        }

        if (!orderData.Product_Array.every(product => product.Item_Rate > 0)) {
            Alert.alert("Error", "Please enter valid prices for all products");
            return;
        }

        setIsSubmitting(true);

        mutation.mutate(
            { orderData },
            {
                onSettled: () => setIsSubmitting(false),
            }
        );
    };

    // Render functions
    const renderProductCard = useCallback(({ item: product }) => {
        const orderItem = orderItems[product.Product_Id];
        const isInOrder = orderItem && orderItem.qty > 0;

        return (
            <View style={styles.productCard}>
                <View style={styles.productHeader}>
                    <View style={styles.productIconContainer}>
                        <Text style={styles.productIcon}>📦</Text>
                    </View>

                    <View style={styles.productDetails}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {product.Short_Name || product.Product_Name}
                        </Text>
                        <View style={styles.productMeta}>
                            <Text style={styles.productUnits}>
                                {product.PackGet} {product.Units}
                            </Text>
                            <Text style={[styles.stockIndicator, product.CL_Qty > 0 ? styles.inStock : styles.outOfStock]}>
                                {product.CL_Qty !== null ? `Stock: ${product.CL_Qty} ${product.Units}` : "Stock: N/A"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Rate and Quantity Inputs */}
                <View style={styles.inputSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Rate</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.rateInput}
                                value={isInOrder && orderItem.rateText !== undefined ? orderItem.rateText :
                                    (isInOrder ? orderItem.rate.toString() : (product.Item_Rate || '').toString())}
                                onChangeText={(value) => {
                                    // Allow empty string, numbers, and decimal points
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        const numericValue = value === '' ? 0 : parseFloat(value) || 0;
                                        if (isInOrder) {
                                            setOrderItems(prev => ({
                                                ...prev,
                                                [product.Product_Id]: {
                                                    ...prev[product.Product_Id],
                                                    rate: numericValue,
                                                    rateText: value
                                                }
                                            }));
                                        } else if (numericValue > 0) {
                                            setOrderItems(prev => ({
                                                ...prev,
                                                [product.Product_Id]: {
                                                    ...product,
                                                    qty: 1,
                                                    rate: numericValue,
                                                    rateText: value
                                                }
                                            }));
                                        }
                                    }
                                }}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={customColors.grey500}
                                selectTextOnFocus={true}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Qty</Text>
                        <View style={styles.quantityContainer}>
                            <TextInput
                                style={styles.quantityInput}
                                value={isInOrder && orderItem.qtyText !== undefined ? orderItem.qtyText :
                                    (isInOrder ? orderItem.qty.toString() : "0")}
                                onChangeText={(value) => {
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        const numericValue = value === '' ? 0 : parseFloat(value) || 0;
                                        if (numericValue > 0) {
                                            if (!isInOrder) {
                                                setOrderItems(prev => ({
                                                    ...prev,
                                                    [product.Product_Id]: {
                                                        ...product,
                                                        qty: numericValue,
                                                        rate: product.Item_Rate || 0,
                                                        qtyText: value
                                                    }
                                                }));
                                            } else {
                                                setOrderItems(prev => ({
                                                    ...prev,
                                                    [product.Product_Id]: {
                                                        ...prev[product.Product_Id],
                                                        qty: numericValue,
                                                        qtyText: value
                                                    }
                                                }));
                                            }
                                        } else if (value === '' || (isInOrder && numericValue === 0)) {
                                            if (isInOrder) {
                                                if (value === '') {
                                                    setOrderItems(prev => ({
                                                        ...prev,
                                                        [product.Product_Id]: {
                                                            ...prev[product.Product_Id],
                                                            qty: 0,
                                                            qtyText: value
                                                        }
                                                    }));
                                                } else {
                                                    removeFromOrder(product.Product_Id);
                                                }
                                            }
                                        }
                                    }
                                }}
                                keyboardType="decimal-pad"
                                textAlign="center"
                                placeholder="0"
                                placeholderTextColor={customColors.grey500}
                                selectTextOnFocus={true}
                            />
                        </View>
                    </View>
                </View>

                {/* Total and Action Button */}
                <View style={styles.actionSection}>
                    {isInOrder && (
                        <View style={styles.totalSection}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>
                                Total: ₹{(orderItem.qty * orderItem.rate).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, isInOrder ? styles.removeButton : styles.addButton]}
                        onPress={() => {
                            if (isInOrder) {
                                removeFromOrder(product.Product_Id)
                            } else {
                                addToOrder(product);
                            }
                        }}
                    >
                        <Text style={[
                            styles.actionButtonText,
                            isInOrder ? styles.removeButtonText : styles.addButtonText
                        ]}>{isInOrder ? "Remove" : "Add to Cart"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [orderItems, updateOrderItem, addToOrder, removeFromOrder]);

    const renderOrderSummary = () => (
        <Modal
            visible={showOrderSummary}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order Summary</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowOrderSummary(false)}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={Object.values(orderItems).filter(item => item.qty > 0)}
                    keyExtractor={item => item.Product_Id}
                    style={styles.summaryList}
                    renderItem={({ item }) => (
                        <View style={styles.summaryItem}>
                            <View style={styles.summaryItemLeft}>
                                <Text style={styles.summaryName}>{item.Product_Name}</Text>
                                <Text style={styles.summaryItemMeta}>
                                    {item.qty} × ₹{item.rate.toFixed(2)}
                                </Text>
                            </View>
                            <Text style={styles.summaryItemTotal}>₹{(item.qty * item.rate).toFixed(2)}</Text>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />

                <View style={styles.summaryFooter}>
                    <View style={styles.grandTotalSection}>
                        <Text style={styles.grandTotalLabel}>Total Amount</Text>
                        <Text style={styles.grandTotal}>₹{totalAmount.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.checkoutButton,
                            isSubmitting && styles.checkoutButtonDisabled
                        ]}
                        onPress={handleSubmitOrder}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={customColors.white} size="small" />
                        ) : (
                            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );

    if (isBranchLoading || isProductLoading || isCostCenterLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader title="Sales Order" navigation={navigation} />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Sales Order"
                navigation={navigation}
                showRightIcon={orderCount > 0}
                rightIconName="shopping-cart"
                rightIconLibrary="FeatherIcon"
                showBadge={orderCount > 0}
                badgeValue={orderCount}
                onRightPress={() => setShowOrderSummary(true)}
            />

            <View style={styles.content}>
                {/* Brand Filter */}
                <View style={styles.filterSection}>
                    <View style={styles.mainFilterRow}>
                        <View style={styles.brandDropdownContainer}>
                            <EnhancedDropdown
                                data={productBranch}
                                labelField="POS_Brand_Name"
                                valueField="POS_Brand_Id"
                                placeholder="Select Brand (All)"
                                value={selectedBrandId}
                                onChange={item => setSelectedBrandId(item?.POS_Brand_Id)}
                                searchPlaceholder="Search brands..."
                            />
                        </View>

                        <TouchableOpacity style={[styles.filterToggleButton, showFilter && styles.filterToggleButtonActive]}
                            onPress={() => { setShowFilter(!showFilter) }}
                            activeOpacity={0.7}>
                            <FeatherIcon name="sliders" size={20} color={showFilter ? customColors.white : customColors.primary} />
                            <Text style={[styles.filterToggleText, showFilter && styles.filterToggleTextActive]}>
                                Filters
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showFilter && (
                        <View style={styles.expandableFilters}>
                            <View style={styles.filterDivider} />
                            <View style={styles.additionalFiltersRow}>
                                <View style={styles.fullWidthFilter}>
                                    <EnhancedDropdown
                                        data={brokersData}
                                        labelField="Cost_Center_Name"
                                        valueField="Cost_Center_Id"
                                        placeholder="Select Broker"
                                        value={selectedBrokerId}
                                        onChange={item => setSelectedBrokerId(item?.Cost_Center_Id)}
                                        searchPlaceholder="Search brokers..."
                                    />
                                </View>
                                <View style={styles.fullWidthFilter}>
                                    <EnhancedDropdown
                                        data={transportData}
                                        labelField="Cost_Center_Name"
                                        valueField="Cost_Center_Id"
                                        placeholder="Select Transport"
                                        value={selectedTransportId}
                                        onChange={item => setSelectedTransportId(item?.Cost_Center_Id)}
                                        searchPlaceholder="Search transport..."
                                    />
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Products Grid */}
                <View style={styles.productsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <Text style={styles.sectionTitle}>({filteredProducts.length})</Text>
                    </View>

                    <FlatList
                        data={filteredProducts}
                        renderItem={renderProductCard}
                        keyExtractor={item => item.Product_Id}
                        numColumns={1}
                        contentContainerStyle={styles.productsList}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                    />
                </View>
            </View>

            {renderOrderSummary()}
        </SafeAreaView>
    );
};

export default PosOrder;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
    },
    filterSection: {
        backgroundColor: customColors.white,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 4,
    },
    mainFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    brandDropdownContainer: {
        flex: 1,
    },
    filterToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: customColors.primary,
        backgroundColor: customColors.white,
        gap: 8,
        minWidth: 100,
        justifyContent: "center",
    },
    filterToggleButtonActive: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    filterToggleText: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.primary,
    },
    filterToggleTextActive: {
        color: customColors.white,
    },
    expandableFilters: {
        marginTop: 6,
    },
    filterDivider: {
        height: 1,
        backgroundColor: customColors.grey200,
        marginBottom: 4,
    },
    additionalFiltersRow: {
        flexDirection: "column",
        gap: 12,
        marginBottom: 6,
    },
    fullWidthFilter: {
        width: "100%",
    },

    productsSection: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
    },
    sectionTitle: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.grey900,
        marginBottom: spacing.xxs,
    },
    sectionSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    productsList: {
        paddingBottom: 175,
    },
    productRow: {
        justifyContent: 'space-between',
    },
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        marginHorizontal: spacing.xs,
        ...shadows.medium,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productHeader: {
        flexDirection: "row",
        marginBottom: 20,
    },
    productIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    productIcon: {
        fontSize: 20,
    },
    productDetails: {
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productName: {
        width: "80%",
        ...typography.body1(),
        fontWeight: "700",
        color: customColors.grey900,
        marginBottom: spacing.xs,
        lineHeight: 24,
    },
    productMeta: {
        flexDirection: "row",
        // justifyContent: "space-between",
        alignItems: "center",
    },
    productUnits: {
        ...typography.body2(),
        color: customColors.grey600,
        fontWeight: "500",
    },
    stockIndicator: {
        ...typography.body2(),
        fontWeight: "500",
        marginLeft: spacing.md,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    inStock: {
        backgroundColor: customColors.success + "20",
        color: customColors.success,
    },
    outOfStock: {
        backgroundColor: customColors.error + "20",
        color: customColors.error,
    },

    inputSection: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.grey700,
        marginBottom: spacing.xs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        paddingHorizontal: 16,
        height: 48,
    },
    currencySymbol: {
        ...typography.h4(),
        fontWeight: "600",
        color: customColors.primary,
        marginRight: 4,
    },
    rateInput: {
        flex: 1,
        ...typography.h4(),
        fontWeight: "700",
        color: customColors.primary,
        padding: 0,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        height: 48,
    },
    quantityInput: {
        flex: 1,
        ...typography.h4(),
        fontWeight: "600",
        color: customColors.black,
        textAlign: "center",
    },

    actionSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: spacing.md,
    },
    totalSection: {
        flex: 1,
    },
    totalLabel: {
        ...typography.caption(),
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 4,
    },
    totalAmount: {
        ...typography.h4(),
        fontWeight: "700",
        color: "#059669",
    },
    actionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 120,
        alignItems: "center",
    },
    addButton: {
        backgroundColor: "#059669",
    },
    removeButton: {
        backgroundColor: "#EF4444",
    },
    actionButtonText: {
        ...typography.button(),
        fontWeight: "600",
    },
    addButtonText: {
        color: customColors.white,
    },
    removeButtonText: {
        color: customColors.white,
    },

    modalContainer: {
        flex: 1,
        // backgroundColor: customColors.white,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomColor: customColors.border,
    },
    modalTitle: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey200,
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        ...typography.h6(),
        color: customColors.grey600,
    },
    summaryList: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    summaryItemLeft: {
        flex: 1,
        marginRight: 16,
    },
    summaryItemName: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: 4,
    },
    summaryItemMeta: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    summaryItemTotal: {
        ...typography.h6(),
        fontWeight: "600",
        color: "#059669",
    },
    summaryFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    grandTotalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    grandTotalLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        textAlign: "center",
        fontWeight: "700",
    },
    grandTotal: {
        ...typography.h5(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    checkoutButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        paddingVertical: spacing.lg,
        alignItems: "center",
    },
    checkoutButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    checkoutButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
});