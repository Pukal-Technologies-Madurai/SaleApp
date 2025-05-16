import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Feather";
import AntDesign from "react-native-vector-icons/AntDesign";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { fetchUOM, fetchProducts } from "../../Api/product";
import { createSaleOrder } from "../../Api/sales";

const Sales = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;

    const [initialValue, setInitialValue] = useState({
        Company_Id: "",
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
        VoucherType: 0,
        Product_Array: [],
    });

    const [uID, setUID] = useState([]);
    // const [productData, setProductData] = useState([]);
    // const [brandData, setBrandData] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);

    const [proGroupData, setProGroupData] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedUOMs, setSelectedUOMs] = useState({});

    const [filteredProducts, setFilteredProducts] = useState([]);
    const [orderQuantities, setOrderQuantities] = useState({});
    const [editedPrices, setEditedPrices] = useState({});
    const [priceInputValues, setPriceInputValues] = useState({});

    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");
                const branchId = await AsyncStorage.getItem("branchId");
                setUID(userId);
                if (companyId && userId) {
                    setInitialValue(prev => ({
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

    const { data: productQueryData = { productData: [], brandData: [] } } =
        useQuery({
            queryKey: ["product", uID],
            queryFn: () => fetchProducts(uID),
            enabled: !!uID,
            select: data => {
                const brands = Array.from(
                    new Set(data.map(item => item.Brand_Name)),
                )
                    .filter(brand => brand)
                    .sort()
                    .map(brand => ({
                        label: brand,
                        value: brand,
                    }));

                return {
                    productData: data,
                    brandData: brands,
                };
            },
        });

    const productData = productQueryData.productData;
    const brandData = productQueryData.brandData;

    const { data: uomData = [] } = useQuery({
        queryKey: ["uomData"],
        queryFn: () => fetchUOM(),
    });

    const handleBrandChange = item => {
        setSelectedBrand(item.value);
        setSelectedGroup(null); // Reset product group when brand changes
        setFilteredProducts([]); // Clear products when brand changes

        // Update product groups for selected brand
        const filteredByBrand = productData.filter(
            product => product.Brand_Name === item.value,
        );

        // Extract unique product groups for the selected brand
        const groups = Array.from(
            new Set(filteredByBrand.map(item => item.Pro_Group)),
        )
            .filter(group => group) // Remove empty or null values
            .sort() // Sort alphabetically
            .map(group => ({
                label: group,
                value: group,
            }));

        setProGroupData(groups);
    };

    // Handle product group selection
    const handleGroupChange = item => {
        setSelectedGroup(item.value);

        // Filter products only when both brand and group are selected
        const filtered = productData.filter(
            product =>
                product.Brand_Name === selectedBrand &&
                product.Pro_Group === item.value,
        );

        setFilteredProducts(filtered);
    };

    const handleQuantityChange = useCallback(
        (productId, quantity, rate, product) => {
            const newQuantity = Math.max(0, parseInt(quantity) || 0);
            const selectedUOM = selectedUOMs[productId] || product.UOM_Id;

            setInitialValue(prev => {
                const updatedProductArray = [...(prev.Product_Array || [])];
                const existingIndex = updatedProductArray.findIndex(
                    item => item.Item_Id === productId,
                );

                if (newQuantity > 0) {
                    const productEntry = {
                        Item_Id: productId,
                        Bill_Qty: newQuantity,
                        Item_Rate: rate,
                        UOM: selectedUOM, // Changed from UOM to UOM_Id
                        Product_Id: productId, // Added Product_Id explicitly
                    };

                    if (existingIndex !== -1) {
                        updatedProductArray[existingIndex] = productEntry;
                    } else {
                        updatedProductArray.push(productEntry);
                    }
                } else if (existingIndex !== -1) {
                    updatedProductArray.splice(existingIndex, 1);
                }

                return {
                    ...prev,
                    Product_Array: updatedProductArray,
                };
            });

            setOrderQuantities(prev => ({
                ...prev,
                [productId]: newQuantity > 0 ? newQuantity.toString() : "",
            }));
        },
        [selectedUOMs],
    );

    const handleUOMChange = useCallback(
        (productId, uomId) => {
            // Update local state for UOM selection
            setSelectedUOMs(prev => ({
                ...prev,
                [productId]: uomId,
            }));

            // Update Product_Array with new UOM
            setInitialValue(prev => {
                const updatedProductArray = [...prev.Product_Array];
                const existingIndex = updatedProductArray.findIndex(
                    item => item.Item_Id === productId,
                );

                if (existingIndex !== -1) {
                    // Update existing product entry
                    updatedProductArray[existingIndex] = {
                        ...updatedProductArray[existingIndex],
                        UOM: uomId, // Make sure to use UOM_Id instead of UOM
                    };
                } else {
                    // If product doesn't exist in array but has quantity, add it
                    const product = filteredProducts.find(
                        p => p.Product_Id === productId,
                    );
                    if (product && orderQuantities[productId]) {
                        updatedProductArray.push({
                            Item_Id: productId,
                            Product_Id: productId,
                            Bill_Qty: parseInt(orderQuantities[productId] || 0),
                            Item_Rate:
                                editedPrices[productId] || product.Item_Rate,
                            UOM: uomId,
                        });
                    }
                }

                return {
                    ...prev,
                    Product_Array: updatedProductArray,
                };
            });
        },
        [orderQuantities, filteredProducts, editedPrices],
    );

    const handlePriceChange = useCallback(
        (productId, price) => {
            // Update the display value immediately
            setPriceInputValues(prev => ({
                ...prev,
                [productId]: price,
            }));

            // Only update the actual price if it's a valid number
            const numericPrice = price === "" ? 0 : parseFloat(price);
            if (!isNaN(numericPrice)) {
                setEditedPrices(prev => ({
                    ...prev,
                    [productId]: numericPrice,
                }));

                // Update Product_Array with new price
                setInitialValue(prev => {
                    const updatedProductArray = [...prev.Product_Array];
                    const existingIndex = updatedProductArray.findIndex(
                        item => item.Item_Id === productId,
                    );

                    if (existingIndex !== -1) {
                        updatedProductArray[existingIndex] = {
                            ...updatedProductArray[existingIndex],
                            Item_Rate: numericPrice,
                        };
                    } else if (orderQuantities[productId]) {
                        const product = filteredProducts.find(
                            p => p.Product_Id === productId,
                        );
                        updatedProductArray.push({
                            Item_Id: productId,
                            Product_Id: productId,
                            Bill_Qty: parseInt(orderQuantities[productId]),
                            Item_Rate: numericPrice,
                            UOM: selectedUOMs[productId] || product.UOM_Id,
                        });
                    }

                    return {
                        ...prev,
                        Product_Array: updatedProductArray,
                    };
                });
            }
        },
        [orderQuantities, filteredProducts, selectedUOMs],
    );

    // Add a handler for input focus
    const handlePriceFocus = useCallback((productId, originalPrice) => {
        // When focusing, if there's no input value, set it to the current price
        setPriceInputValues(prev => ({
            ...prev,
            [productId]: prev[productId] || String(originalPrice),
        }));
    }, []);

    // Add a handler for input blur
    const handlePriceBlur = useCallback(
        productId => {
            const inputValue = priceInputValues[productId];
            if (inputValue === "" || isNaN(parseFloat(inputValue))) {
                // Reset to the original price if empty or invalid
                const product = filteredProducts.find(
                    p => p.Product_Id === productId,
                );
                handlePriceChange(productId, String(product.Item_Rate));
            }
        },
        [priceInputValues, filteredProducts],
    );

    const handleDeleteItem = useCallback(productId => {
        // Remove item from Product_Array
        setInitialValue(prev => ({
            ...prev,
            Product_Array: prev.Product_Array.filter(
                item => item.Item_Id !== productId,
            ),
        }));

        // Clear the quantity
        setOrderQuantities(prev => {
            const newQuantities = { ...prev };
            delete newQuantities[productId];
            return newQuantities;
        });

        // Clear the edited price
        setEditedPrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[productId];
            return newPrices;
        });

        // Clear the selected UOM
        setSelectedUOMs(prev => {
            const newUOMs = { ...prev };
            delete newUOMs[productId];
            return newUOMs;
        });
    }, []);

    // Optimized total calculations using edited prices
    const calculateOrderTotal = useCallback(() => {
        return initialValue.Product_Array.reduce((sum, item) => {
            // Use edited price if available, otherwise use the original item rate
            const price = editedPrices[item.Item_Id] || item.Item_Rate;
            return sum + item.Bill_Qty * price;
        }, 0);
    }, [initialValue.Product_Array, editedPrices]);

    // Calculate total items in cart
    const totalItems = useMemo(
        () =>
            initialValue.Product_Array.reduce(
                (sum, item) => sum + Number(item.Bill_Qty),
                0,
            ),
        [initialValue.Product_Array],
    );

    // Memoize the order total calculation
    const orderTotal = useMemo(
        () => calculateOrderTotal(),
        [calculateOrderTotal],
    );

    const mutation = useMutation({
        mutationFn: createSaleOrder,
        onSuccess: data => {
            Alert.alert("Success", data.message, [
                {
                    text: "Okay",
                    onPress: () => navigation.goBack(),
                },
            ]);
        },
        onError: error => {
            Alert.alert("Error", error.message || "Failed to submit order");
        },
    });

    // Handle order submission
    const handleSubmitOrder = async () => {
        if (initialValue.Product_Array.length === 0) {
            Alert.alert(
                "Error",
                "Please add at least one product to the order",
            );
            return;
        }

        setIsSubmitting(true);
        mutation.mutate(
            { orderData: initialValue },
            {
                onSettled: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Sales Order"
                navigation={navigation}
                showRightIcon={true}
                rightIconName="shopping-bag"
                rightIconLibrary="FeatherIcon"
                badgeValue={totalItems}
                showBadge={true}
                onRightPress={() => setIsSummaryModalVisible(true)}
            />

            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.filterSection}>
                        <Text style={styles.label}>
                            Retailer Name:
                            <Text
                                style={{
                                    ...typography.h6(),
                                    color: customColors.accent2,
                                    fontWeight: "bold",
                                }}>
                                {" "}
                                {item.Retailer_Name}
                            </Text>
                        </Text>

                        <EnhancedDropdown
                            data={brandData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Brand"
                            value={selectedBrand}
                            onChange={handleBrandChange}
                        />

                        <EnhancedDropdown
                            data={proGroupData}
                            labelField="label"
                            valueField="value"
                            placeholder={
                                selectedBrand
                                    ? "Select Product Group"
                                    : "Select Brand First"
                            }
                            value={selectedGroup}
                            onChange={handleGroupChange}
                            // containerStyle={[
                            //     !selectedBrand && styles.disabledDropdown,
                            // ]}
                        />
                    </View>

                    {selectedBrand && selectedGroup && (
                        <View style={styles.productsContainer}>
                            <Text style={styles.sectionTitle}>
                                Products ({filteredProducts.length})
                            </Text>
                            {filteredProducts.map(product => (
                                <View
                                    key={product.Product_Id}
                                    style={styles.productItem}>
                                    <Text style={styles.productName}>
                                        {product.Product_Name}
                                        <Text
                                            style={{
                                                ...typography.caption(),
                                                color: customColors.accent2,
                                                fontWeight: "bold",
                                            }}>
                                            Availability: {product.CL_Qty}
                                        </Text>
                                    </Text>
                                    <View style={styles.quantityContainer}>
                                        <TextInput
                                            style={styles.quantityInput}
                                            keyboardType="numeric"
                                            value={
                                                orderQuantities[
                                                    product.Product_Id
                                                ] || ""
                                            }
                                            onChangeText={quantity =>
                                                handleQuantityChange(
                                                    product.Product_Id,
                                                    quantity,
                                                    product.Item_Rate,
                                                    product,
                                                )
                                            }
                                            placeholder="0"
                                            placeholderTextColor={
                                                customColors.grey
                                            }
                                        />

                                        <EnhancedDropdown
                                            data={uomData.map(uom => ({
                                                label: uom.Units,
                                                value: uom.Unit_Id,
                                            }))}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="UOM"
                                            value={
                                                selectedUOMs[
                                                    product.Product_Id
                                                ] || product.UOM_Id
                                            }
                                            onChange={item =>
                                                handleUOMChange(
                                                    product.Product_Id,
                                                    item.value,
                                                )
                                            }
                                            containerStyle={
                                                styles.uomDropdownContainer
                                            }
                                        />

                                        {/* <Dropdown
                                            style={styles.uomDropdown}
                                            data={uomData.map(uom => ({
                                                label: uom.Units,
                                                value: uom.Unit_Id,
                                            }))}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="UOM"
                                            value={
                                                selectedUOMs[
                                                    product.Product_Id
                                                ] || product.UOM_Id
                                            }
                                            onChange={item =>
                                                handleUOMChange(
                                                    product.Product_Id,
                                                    item.value,
                                                )
                                            }
                                            containerStyle={
                                                styles.uomDropdownContainer
                                            }
                                            placeholderStyle={
                                                styles.placeholderStyle
                                            }
                                            selectedTextStyle={
                                                styles.selectedTextStyle
                                            }
                                            itemTextStyle={styles.itemTextStyle}
                                        /> */}
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.currencySymbol}>
                                                ₹
                                            </Text>
                                            <TextInput
                                                style={styles.priceInput}
                                                keyboardType="numeric"
                                                value={
                                                    priceInputValues[
                                                        product.Product_Id
                                                    ] !== undefined
                                                        ? priceInputValues[
                                                              product.Product_Id
                                                          ]
                                                        : String(
                                                              editedPrices[
                                                                  product
                                                                      .Product_Id
                                                              ] ||
                                                                  product.Item_Rate,
                                                          )
                                                }
                                                onChangeText={price =>
                                                    handlePriceChange(
                                                        product.Product_Id,
                                                        price,
                                                    )
                                                }
                                                onFocus={() =>
                                                    handlePriceFocus(
                                                        product.Product_Id,
                                                        editedPrices[
                                                            product.Product_Id
                                                        ] || product.Item_Rate,
                                                    )
                                                }
                                                onBlur={() =>
                                                    handlePriceBlur(
                                                        product.Product_Id,
                                                    )
                                                }
                                                placeholder="0.00"
                                                selectTextOnFocus={true} // This will select all text when focused
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={isSummaryModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSummaryModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order Summary</Text>
                            <TouchableOpacity
                                onPress={() => setIsSummaryModalVisible(false)}
                                style={styles.closeButton}>
                                <AntDesign
                                    name="closesquareo"
                                    color="red"
                                    size={25}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.summaryList}>
                            {initialValue.Product_Array.map(item => {
                                const product = productData.find(
                                    p => p.Product_Id === item.Item_Id,
                                );
                                const uom = uomData.find(
                                    u => u.Unit_Id === item.UOM_Id,
                                );

                                return (
                                    <View
                                        key={item.Item_Id}
                                        style={styles.summaryItem}>
                                        <View style={styles.summaryItemDetails}>
                                            <Text
                                                style={styles.summaryItemName}>
                                                {product?.Product_Name}
                                            </Text>
                                            <Text style={styles.summaryItemQty}>
                                                {item.Bill_Qty} {uom?.Units}
                                            </Text>
                                        </View>
                                        <Text style={styles.summaryItemPrice}>
                                            ₹
                                            {(
                                                item.Bill_Qty * item.Item_Rate
                                            ).toFixed(2)}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() =>
                                                handleDeleteItem(item.Item_Id)
                                            }>
                                            <Icon
                                                name="delete"
                                                size={24}
                                                color="red"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.summaryFooter}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>
                                    Total Amount:
                                </Text>
                                <Text style={styles.totalAmount}>
                                    ₹{orderTotal.toFixed(2)}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    isSubmitting && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitOrder}
                                disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        Submit Order
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Sales;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        ...shadows.small,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.md,
    },
    filterSection: {
        marginBottom: spacing.lg,
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.md,
        ...shadows.small,
    },
    label: {
        ...typography.h6(),
        color: customColors.grey900,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    dropdown: {
        height: 48,
        backgroundColor: customColors.white,
        borderColor: customColors.grey300,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
        ...shadows.small,
    },
    disabledDropdown: {
        opacity: 0.5,
    },
    dropdownContainer: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    placeholderStyle: {
        ...typography.body1(),
        color: customColors.grey500,
    },
    selectedTextStyle: {
        ...typography.body1(),
        color: customColors.grey900,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    itemTextStyle: {
        ...typography.body1(),
        color: customColors.grey900,
    },
    productsContainer: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.md,
        ...shadows.small,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginBottom: spacing.sm,
    },
    productItem: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        paddingVertical: spacing.sm,
    },
    productName: {
        ...typography.h6(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    quantityInput: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 4,
        padding: spacing.xs,
        textAlign: "center",
        ...typography.body1(),
        color: customColors.grey900,
    },
    uomDropdown: {
        width: 120,
        height: 40,
        borderColor: customColors.grey300,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: spacing.sm,
        backgroundColor: customColors.white,
    },
    uomDropdownContainer: {
        width: "40%",
        color: customColors.grey900,
        borderRadius: 4,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 4,
        paddingHorizontal: spacing.xs,
        backgroundColor: customColors.white,
        minWidth: 75,
        height: 40,
    },
    currencySymbol: {
        ...typography.h6(),
        color: customColors.grey900,
        marginRight: 2,
    },
    priceInput: {
        flex: 1,
        textAlign: "center",
        ...typography.h6(),
        color: customColors.grey900,
        padding: 0,
        minWidth: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        maxHeight: "80%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.md,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    modalTitle: {
        ...typography.h4(),
        color: customColors.grey900,
    },
    closeButton: {
        padding: spacing.xs,
    },
    summaryList: {
        maxHeight: "60%",
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    summaryItemDetails: {
        flex: 1,
        marginRight: spacing.sm,
    },
    summaryItemName: {
        ...typography.body1(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
    },
    summaryItemQty: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    summaryItemPrice: {
        ...typography.body1(),
        fontWeight: "bold",
        marginLeft: spacing.md,
        color: customColors.grey900,
    },
    deleteButton: {
        padding: spacing.xs,
    },
    summaryFooter: {
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    totalLabel: {
        ...typography.h6(),
        color: customColors.grey900,
    },
    totalAmount: {
        ...typography.h5(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    submitButton: {
        backgroundColor: customColors.accent,
        borderRadius: 8,
        padding: spacing.md,
        alignItems: "center",
        marginTop: spacing.sm,
        ...shadows.small,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
});
