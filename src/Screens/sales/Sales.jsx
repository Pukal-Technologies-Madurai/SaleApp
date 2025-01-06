import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    SafeAreaView,
    TextInput,
    Modal,
    Alert,
    ImageBackground,
    ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import AntDesign from "react-native-vector-icons/AntDesign";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";

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
        Product_Array: [],
    });

    const [productData, setProductData] = useState([]);
    const [brandData, setBrandData] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);

    const [proGroupData, setProGroupData] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [uomData, setUOMData] = useState([]);
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
                if (companyId && userId) {
                    setInitialValue(prev => ({
                        ...prev,
                        Company_Id: companyId,
                        Sales_Person_Id: userId,
                        Created_by: userId,
                        Sales_Person_Name: userName,
                        Branch_Id: branchId,
                    }));
                    await fetchProducts(companyId);
                    await fetchUOMData();
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    const fetchProducts = async id => {
        try {
            const response = await fetch(`${API.products}${id}`);
            const jsonData = await response.json();

            if (jsonData.success) {
                setProductData(jsonData.data);

                const brands = Array.from(
                    new Set(jsonData.data.map(item => item.Brand_Name)),
                )
                    .filter(brand => brand)
                    .sort()
                    .map(brand => ({
                        label: brand,
                        value: brand,
                    }));

                setBrandData(brands);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    const fetchUOMData = async () => {
        try {
            const response = await fetch(API.uom);
            const jsonData = await response.json();
            if (jsonData.data) {
                setUOMData(jsonData.data);
            }
        } catch (err) {
            console.error("Error fetching UOM data:", err);
        }
    };

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
        // console.log(initialValue)
        try {
            const response = await fetch(API.saleOrder, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(initialValue),
            });

            const data = await response.json();
            // console.log(data)
            if (data.success) {
                Alert.alert("Success", data.message, [
                    {
                        text: "Okay",
                        onPress: () => navigation.goBack(),
                    },
                ]);
            } else {
                throw new Error(data.message || "Failed to submit order");
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to submit order");
        } finally {
            setIsSubmitting(false);
            setIsSummaryModalVisible(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialIcons
                            name="arrow-back"
                            size={25}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>
                        Sales Dashboard
                    </Text>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => setIsSummaryModalVisible(true)}>
                        <Icon name="shopping-bag" color="white" size={25} />
                        {totalItems > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {totalItems}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.filterSection}>
                            <Text style={styles.label}>
                                Retailer Name:
                                <Text
                                    style={{
                                        color: "#FF0000",
                                        fontWeight: "bold",
                                    }}>
                                    {" "}
                                    {item.Retailer_Name}
                                </Text>
                            </Text>

                            <Dropdown
                                style={styles.dropdown}
                                data={brandData}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Brand"
                                value={selectedBrand}
                                search
                                searchPlaceholder="Search brand..."
                                onChange={handleBrandChange}
                                containerStyle={styles.dropdownContainer}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                iconStyle={styles.iconStyle}
                                itemTextStyle={styles.itemTextStyle}
                            />

                            <Dropdown
                                style={[
                                    styles.dropdown,
                                    !selectedBrand && styles.disabledDropdown,
                                ]}
                                data={proGroupData}
                                labelField="label"
                                valueField="value"
                                placeholder={
                                    selectedBrand
                                        ? "Select Product Group"
                                        : "Select Brand First"
                                }
                                value={selectedGroup}
                                search
                                searchPlaceholder="Search product group..."
                                onChange={handleGroupChange}
                                containerStyle={styles.dropdownContainer}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                iconStyle={styles.iconStyle}
                                itemTextStyle={styles.itemTextStyle}
                                disabled={!selectedBrand}
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

                                            <Dropdown
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
                                                itemTextStyle={
                                                    styles.itemTextStyle
                                                }
                                            />
                                            <View style={styles.priceContainer}>
                                                <Text
                                                    style={
                                                        styles.currencySymbol
                                                    }>
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
                                                                  product
                                                                      .Product_Id
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
                                                                product
                                                                    .Product_Id
                                                            ] ||
                                                                product.Item_Rate,
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
                                <Text style={styles.modalTitle}>
                                    Order Summary
                                </Text>
                                <TouchableOpacity
                                    onPress={() =>
                                        setIsSummaryModalVisible(false)
                                    }
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
                                            <View
                                                style={
                                                    styles.summaryItemDetails
                                                }>
                                                <Text
                                                    style={
                                                        styles.summaryItemName
                                                    }>
                                                    {product?.Product_Name}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.summaryItemQty
                                                    }>
                                                    {item.Bill_Qty} {uom?.Units}
                                                </Text>
                                            </View>
                                            <Text
                                                style={styles.summaryItemPrice}>
                                                ₹
                                                {(
                                                    item.Bill_Qty *
                                                    item.Item_Rate
                                                ).toFixed(2)}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() =>
                                                    handleDeleteItem(
                                                        item.Item_Id,
                                                    )
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
                                        isSubmitting &&
                                            styles.submitButtonDisabled,
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
            </ImageBackground>
        </SafeAreaView>
    );
};

export default Sales;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primary,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    cartButton: {
        position: "relative",
        padding: 8,
    },
    badge: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "#FF4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    badgeText: {
        ...typography.caption(),
        color: "white",
        fontWeight: "bold",
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    filterSection: {
        marginBottom: 20,
    },
    label: {
        ...typography.h6(),
        color: customColors.black,
        textAlign: "center",
        marginBottom: 10,
    },
    dropdown: {
        height: 50,
        backgroundColor: customColors.white,
        borderColor: customColors.lightGrey,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    disabledDropdown: {
        opacity: 0.5,
    },
    dropdownContainer: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ccc",
    },
    placeholderStyle: {
        ...typography.body1(),
        color: "#666",
    },
    selectedTextStyle: {
        ...typography.body1(),
        color: "#333",
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    itemTextStyle: {
        color: customColors.black,
        fontWeight: "400",
    },

    productsContainer: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 12,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        color: "#333",
        ...typography.h5(),
        fontWeight: "bold",
        marginBottom: 12,
    },
    productItem: {
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingVertical: 12,
    },
    productName: {
        ...typography.h6(),
        color: "#333",
        marginBottom: 8,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        color: customColors.black,
    },
    quantityInput: {
        width: 60,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        padding: 6,
        textAlign: "center",
        color: customColors.black,
    },
    uomDropdown: {
        width: 120,
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        marginRight: 10,
        backgroundColor: customColors.white,
        color: customColors.black,
    },
    uomDropdownContainer: {
        color: customColors.black,
        borderRadius: 4,
    },

    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        paddingHorizontal: 5,
        backgroundColor: customColors.white,
        minWidth: 75,
    },
    currencySymbol: {
        ...typography.h6(),
        color: "#333",
        marginRight: 2,
    },
    priceInput: {
        flex: 1,
        textAlign: "center",
        width: 40,
        height: 40,
        ...typography.h6(),
        color: "#333",
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
        padding: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    modalTitle: {
        ...typography.h4(),
        fontWeight: "bold",
    },
    closeButton: {
        padding: 8,
    },

    summaryList: {
        maxHeight: "60%",
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    summaryItemDetails: {
        flex: 1,
        marginRight: 10,
    },
    summaryItemName: {
        ...typography.body1(),
        color: "#333",
        marginBottom: 4,
    },
    summaryItemQty: {
        ...typography.body2(),
        color: "#666",
    },
    summaryItemPrice: {
        ...typography.body1(),
        fontWeight: "bold",
        marginLeft: 16,
    },
    deleteButton: {
        padding: 8,
    },
    summaryFooter: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    totalLabel: {
        ...typography.h6(),
        fontWeight: "600",
    },

    totalAmount: {
        ...typography.h5(),
        fontWeight: "bold",
        color: "#2196F3",
    },
    submitButton: {
        backgroundColor: "#4CAF50",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...typography.h6(),
        color: "white",
        fontWeight: "bold",
    },
});
