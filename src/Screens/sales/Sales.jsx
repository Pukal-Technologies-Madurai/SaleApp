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
import CheckBox from "@react-native-community/checkbox";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { API } from "../../Config/Endpoint";
import { createSaleOrder } from "../../Api/sales";
import { fetchUOM, fetchProducts } from "../../Api/product";
import {
    createLiveSales,
    fetchCreditLiveSale,
    fetchDebitLiveSale,
} from "../../Api/receipt";

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
    const [isLiveSale, setIsLiveSale] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [isDelivery, setIsDelivery] = useState(true);

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

            console.log(
                "Selected UOM for product:",
                productId,
                uomId,
                selectedUOMs[productId],
            );

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

    // Optimized queries for live sale ledger data
    const { data: debitLedgerData = [], isLoading: isDebitLoading } = useQuery({
        queryKey: ["debitLedgerData"],
        queryFn: fetchDebitLiveSale,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
    });

    const { data: creditLedgerData = [], isLoading: isCreditLoading } =
        useQuery({
            queryKey: ["creditLedgerData"],
            queryFn: fetchCreditLiveSale,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
        });

    // Memoized credit ledger information with validation
    const creditLedgerInfo = useMemo(() => {
        if (!creditLedgerData.length) {
            return { id: 0, name: "", isValid: false };
        }

        const matchedLedger = creditLedgerData.find(
            ledger => ledger.Account_name === item.Retailer_Name,
        );

        if (matchedLedger) {
            return {
                id: matchedLedger.Acc_Id,
                name: matchedLedger.Account_name,
                isValid: true,
            };
        }

        return { id: 0, name: "", isValid: false };
    }, [creditLedgerData, item.Retailer_Name]);

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

    const liveSaleMutation = useMutation({
        mutationFn: createLiveSales,
        onSuccess: data => {
            Alert.alert(
                "Live Sale Success",
                data.message || "Live sale completed successfully!",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setIsSummaryModalVisible(false);
                            navigation.goBack();
                        },
                    },
                ],
            );
        },
        onError: error => {
            Alert.alert(
                "Live Sale Error",
                error.message || "Failed to complete live sale",
            );
        },
    });

    const handleSubmitforVisitLog = async () => {
        const formData = new FormData();
        formData.append("Mode", 1);
        formData.append("Retailer_Id", item.Retailer_Id);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "The Sale order has been created.");
        formData.append("EntryBy", uID);

        try {
            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok`);
            }

            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                navigation.navigate("HomeScreen");
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

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

        let createPaymentReceipt = false;
        if (paymentMethod === "cash" || paymentMethod === "bank") {
            createPaymentReceipt = true;
        }

        if (isLiveSale) {
            // Validate credit ledger information before proceeding
            if (!creditLedgerInfo.isValid) {
                setIsSubmitting(false);
                Alert.alert(
                    "Account Information Required",
                    "Credit ledger information is not available for this retailer. Please contact your account manager to set up the account information before proceeding with live sales.",
                    [{ text: "OK" }],
                );
                return;
            }

            // Validate debit ledger information
            if (!debitLedgerData.length) {
                setIsSubmitting(false);
                Alert.alert(
                    "Account Configuration Error",
                    "Debit ledger information is not available. Please contact your account manager.",
                    [{ text: "OK" }],
                );
                return;
            }

            // Construct the proper request body for live sales
            const resBody = {
                Branch_Id: initialValue.Branch_Id,
                Narration: `Live sale order created with ${paymentMethod.toUpperCase()} and total amount ₹${orderTotal}`,
                Created_by: initialValue.Created_by,
                GST_Inclusive: 1,
                IS_IGST: 0,
                credit_ledger: 31,
                credit_ledger_name: "Cash Note Off",
                debit_ledger: debitLedgerData[0]?.Acc_Id, // creditLedgerInfo.id,
                debit_ledger_name: debitLedgerData[0]?.AC_Reason, //creditLedgerInfo.name,
                credit_amount: orderTotal,
                Staff_Involved_List: [],
                Product_Array: initialValue.Product_Array.map(product => ({
                    Item_Id: product.Item_Id,
                    Bill_Qty: product.Bill_Qty,
                    Item_Rate:
                        editedPrices[product.Item_Id] || product.Item_Rate,
                    UOM: product.UOM,
                    Units: product.Units,
                })),
                createReceipt: createPaymentReceipt,
            };

            console.log("Live Sale Request Body:", resBody);

            // Call live sales API
            liveSaleMutation.mutate(resBody, {
                onSettled: () => setIsSubmitting(false),
            });
            return;
        }

        handleSubmitforVisitLog();

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
                title={item.Retailer_Name}
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
                        <View style={styles.filterRow}>
                            <View style={styles.filterItem}>
                                <EnhancedDropdown
                                    data={brandData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Brand"
                                    value={selectedBrand}
                                    onChange={handleBrandChange}
                                    containerStyle={styles.compactDropdown}
                                />
                            </View>
                            <View style={styles.filterItem}>
                                <EnhancedDropdown
                                    data={proGroupData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder={
                                        selectedBrand
                                            ? "Select Group"
                                            : "Brand First"
                                    }
                                    value={selectedGroup}
                                    onChange={handleGroupChange}
                                    containerStyle={styles.compactDropdown}
                                />
                            </View>
                        </View>
                    </View>

                    {selectedBrand && selectedGroup && (
                        <View style={styles.productsContainer}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons
                                    name="inventory"
                                    size={20}
                                    color={customColors.primary}
                                />
                                <Text style={styles.sectionTitle}>
                                    Available Products (
                                    {filteredProducts.length})
                                </Text>
                            </View>

                            {filteredProducts.map(product => (
                                <View
                                    key={product.Product_Id}
                                    style={styles.productCard}>
                                    <View style={styles.productHeader}>
                                        <View style={styles.productInfo}>
                                            <Text style={styles.productName}>
                                                {product.Product_Name}
                                            </Text>
                                            <View
                                                style={
                                                    styles.availabilityContainer
                                                }>
                                                <MaterialIcons
                                                    name="inventory-2"
                                                    size={14}
                                                    color={
                                                        product.CL_Qty > 0
                                                            ? customColors.success
                                                            : customColors.error
                                                    }
                                                />
                                                <Text
                                                    style={[
                                                        styles.availabilityText,
                                                        {
                                                            color:
                                                                product.CL_Qty >
                                                                0
                                                                    ? customColors.success
                                                                    : customColors.error,
                                                        },
                                                    ]}>
                                                    Stock: {product.CL_Qty}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.basePrice}>
                                            ₹{product.Item_Rate}
                                        </Text>
                                    </View>

                                    <View style={styles.orderControls}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                Qty
                                            </Text>
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
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                Unit
                                            </Text>
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
                                                placeholderStyle={
                                                    styles.uomPlaceholderStyle
                                                }
                                                selectedTextStyle={
                                                    styles.uomSelectedTextStyle
                                                }
                                                itemTextStyle={
                                                    styles.uomItemTextStyle
                                                }
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                Price
                                            </Text>
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
                                                    selectTextOnFocus={true}
                                                />
                                            </View>
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
                            <View style={styles.modalTitleContainer}>
                                <MaterialIcons
                                    name="shopping-cart"
                                    size={24}
                                    color={customColors.primary}
                                />
                                <Text style={styles.modalTitle}>
                                    Order Summary
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsSummaryModalVisible(false)}
                                style={styles.closeButton}>
                                <MaterialIcons
                                    name="close"
                                    color={customColors.grey600}
                                    size={24}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.summaryList}
                            showsVerticalScrollIndicator={false}>
                            {initialValue.Product_Array.map(item => {
                                const product = productData.find(
                                    p => p.Product_Id === item.Item_Id,
                                );
                                const uom = uomData.find(
                                    u => u.Unit_Id === item.UOM,
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
                                            <Text
                                                style={styles.summaryItemRate}>
                                                ₹{item.Item_Rate} per unit
                                            </Text>
                                        </View>
                                        <View style={styles.summaryItemRight}>
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
                                                <MaterialIcons
                                                    name="delete-outline"
                                                    size={20}
                                                    color={customColors.error}
                                                />
                                            </TouchableOpacity>
                                        </View>
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

                            {/* Live Sale Toggle */}
                            <View style={styles.liveSaleContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.liveSaleToggle,
                                        (isCreditLoading ||
                                            isDebitLoading ||
                                            !creditLedgerInfo.isValid) &&
                                            styles.liveSaleToggleDisabled,
                                    ]}
                                    onPress={() => {
                                        if (isCreditLoading || isDebitLoading)
                                            return;

                                        if (!creditLedgerInfo.isValid) {
                                            Alert.alert(
                                                "Account Setup Required",
                                                "Live sale is not available for this retailer. Please contact your account manager to set up the account information.",
                                                [{ text: "OK" }],
                                            );
                                            return;
                                        }

                                        setIsLiveSale(!isLiveSale);
                                    }}
                                    disabled={
                                        isCreditLoading ||
                                        isDebitLoading ||
                                        !creditLedgerInfo.isValid
                                    }
                                    activeOpacity={0.7}>
                                    <View style={styles.liveSaleContent}>
                                        {isCreditLoading || isDebitLoading ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={customColors.grey500}
                                            />
                                        ) : (
                                            <MaterialIcons
                                                name={
                                                    creditLedgerInfo.isValid
                                                        ? "flash-on"
                                                        : "warning"
                                                }
                                                size={20}
                                                color={
                                                    !creditLedgerInfo.isValid
                                                        ? customColors.warning
                                                        : isLiveSale
                                                          ? customColors.success
                                                          : customColors.grey500
                                                }
                                            />
                                        )}
                                        <Text
                                            style={[
                                                styles.liveSaleText,
                                                {
                                                    color: !creditLedgerInfo.isValid
                                                        ? customColors.warning
                                                        : isLiveSale
                                                          ? customColors.success
                                                          : customColors.grey700,
                                                },
                                            ]}>
                                            Live Sale
                                        </Text>
                                        <Text
                                            style={styles.liveSaleDescription}>
                                            {isCreditLoading || isDebitLoading
                                                ? "Loading account info..."
                                                : !creditLedgerInfo.isValid
                                                  ? "Account setup required"
                                                  : "Complete sale instantly"}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.toggle,
                                            {
                                                backgroundColor:
                                                    !creditLedgerInfo.isValid
                                                        ? customColors.grey300
                                                        : isLiveSale
                                                          ? customColors.success
                                                          : customColors.grey300,
                                            },
                                        ]}>
                                        <View
                                            style={[
                                                styles.toggleCircle,
                                                {
                                                    marginLeft:
                                                        isLiveSale &&
                                                        creditLedgerInfo.isValid
                                                            ? 21
                                                            : 2,
                                                },
                                            ]}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Payment Method Selection (only show when Live Sale is enabled) */}
                            {isLiveSale && (
                                <View style={styles.paymentMethodContainer}>
                                    <Text style={styles.paymentMethodLabel}>
                                        Payment Method:
                                    </Text>
                                    <View style={styles.paymentMethodOptions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.paymentOption,
                                                paymentMethod === "cash" &&
                                                    styles.paymentOptionSelected,
                                            ]}
                                            onPress={() =>
                                                setPaymentMethod("cash")
                                            }>
                                            <Icon
                                                name="inr"
                                                size={20}
                                                color={
                                                    paymentMethod === "cash"
                                                        ? customColors.white
                                                        : customColors.grey600
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.paymentOptionText,
                                                    paymentMethod === "cash" &&
                                                        styles.paymentOptionTextSelected,
                                                ]}>
                                                Cash
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.paymentOption,
                                                paymentMethod === "bank" &&
                                                    styles.paymentOptionSelected,
                                            ]}
                                            onPress={() =>
                                                setPaymentMethod("bank")
                                            }>
                                            <MaterialIcons
                                                name="account-balance"
                                                size={20}
                                                color={
                                                    paymentMethod === "bank"
                                                        ? customColors.white
                                                        : customColors.grey600
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.paymentOptionText,
                                                    paymentMethod === "bank" &&
                                                        styles.paymentOptionTextSelected,
                                                ]}>
                                                Bank
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.paymentOption,
                                                paymentMethod === "credit" &&
                                                    styles.paymentOptionSelected,
                                            ]}
                                            onPress={() =>
                                                setPaymentMethod("credit")
                                            }>
                                            <MaterialIcons
                                                name="credit-card"
                                                size={20}
                                                color={
                                                    paymentMethod === "credit"
                                                        ? customColors.white
                                                        : customColors.grey600
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.paymentOptionText,
                                                    paymentMethod ===
                                                        "credit" &&
                                                        styles.paymentOptionTextSelected,
                                                ]}>
                                                Credit
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Delivery Option (show when Live Sale is enabled) */}
                            {isLiveSale && (
                                <View style={styles.deliveryContainer}>
                                    <CheckBox
                                        value={isDelivery}
                                        onValueChange={setIsDelivery}
                                        style={styles.deliveryCheckbox}
                                    />
                                    <Text style={styles.deliveryLabel}>
                                        Delivery Required
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    isSubmitting && styles.submitButtonDisabled,
                                    isLiveSale && styles.liveSaleButton,
                                ]}
                                onPress={handleSubmitOrder}
                                disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <View style={styles.submitButtonContent}>
                                        <MaterialIcons
                                            name={
                                                isLiveSale
                                                    ? "flash-on"
                                                    : "shopping-bag"
                                            }
                                            size={20}
                                            color={customColors.white}
                                        />
                                        <Text style={styles.submitButtonText}>
                                            {isLiveSale
                                                ? "Complete Live Sale"
                                                : "Submit Order"}
                                        </Text>
                                        {isLiveSale && (
                                            <Text
                                                style={
                                                    styles.submitButtonSubtext
                                                }>
                                                ({paymentMethod.toUpperCase()})
                                            </Text>
                                        )}
                                    </View>
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
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.small,
    },
    filterRow: {
        flexDirection: "row",
        gap: spacing.sm,
        alignItems: "center",
    },
    filterItem: {
        flex: 1,
    },
    compactDropdown: {
        marginBottom: 0,
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
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.small,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginLeft: spacing.sm,
        fontWeight: "600",
    },
    productCard: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.md,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    availabilityContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    availabilityText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    basePrice: {
        ...typography.subtitle2(),
        color: customColors.accent2,
        fontWeight: "500",
    },
    orderControls: {
        flexDirection: "row",
        gap: spacing.sm,
        alignItems: "flex-end",
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    productItem: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        paddingVertical: spacing.sm,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    quantityInput: {
        height: 40,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        padding: spacing.xs,
        textAlign: "center",
        ...typography.body1(),
        color: customColors.grey900,
        backgroundColor: customColors.white,
    },
    uomDropdownContainer: {
        borderRadius: 6,
    },
    uomPlaceholderStyle: {
        ...typography.label(),
        color: customColors.grey500,
    },
    uomSelectedTextStyle: {
        ...typography.label(),
        color: customColors.grey900,
        fontWeight: "500",
    },
    uomItemTextStyle: {
        ...typography.label(),
        color: customColors.grey900,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        paddingHorizontal: spacing.xs,
        backgroundColor: customColors.white,
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
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    modalTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    modalTitle: {
        ...typography.h4(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    closeButton: {
        padding: spacing.xs,
        borderRadius: 20,
        backgroundColor: customColors.grey100,
    },
    summaryList: {
        maxHeight: "50%",
        marginBottom: spacing.md,
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    summaryItemDetails: {
        flex: 1,
        marginRight: spacing.sm,
    },
    summaryItemName: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    summaryItemQty: {
        ...typography.caption(),
        color: customColors.grey700,
        marginBottom: 2,
    },
    summaryItemRate: {
        ...typography.caption(),
        color: customColors.grey600,
        fontStyle: "italic",
    },
    summaryItemRight: {
        alignItems: "flex-end",
        gap: spacing.xs,
    },
    summaryItemPrice: {
        ...typography.subtitle2(),
        fontWeight: "700",
        color: customColors.primary,
    },
    deleteButton: {
        padding: spacing.xs,
        borderRadius: 4,
        backgroundColor: customColors.errorLight,
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
        backgroundColor: customColors.primary,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: "center",
        marginTop: spacing.md,
        ...shadows.medium,
    },
    liveSaleButton: {
        backgroundColor: customColors.success,
    },
    submitButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    submitButtonSubtext: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
        marginLeft: spacing.xs,
    },
    // Live Sale Styles
    liveSaleContainer: {
        marginBottom: spacing.md,
        backgroundColor: customColors.grey50,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    liveSaleToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    liveSaleToggleDisabled: {
        opacity: 0.6,
    },
    liveSaleContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    liveSaleText: {
        ...typography.subtitle2(),
        fontWeight: "600",
    },
    liveSaleDescription: {
        ...typography.caption(),
        color: customColors.grey600,
        marginLeft: spacing.sm,
    },
    toggle: {
        width: 40,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
    },
    toggleCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: customColors.white,
    },
    deliveryContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey300,
        backgroundColor: customColors.grey50,
        borderRadius: 8,
    },
    deliveryCheckbox: {
        marginRight: spacing.sm,
        transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }], // Slightly larger checkbox
    },
    deliveryLabel: {
        ...typography.body1(),
        color: customColors.grey700,
        fontWeight: "500",
        flex: 1,
    },
    // Payment Method Styles
    paymentMethodContainer: {
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: customColors.success,
    },
    paymentMethodLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.sm,
    },
    paymentMethodOptions: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    paymentOption: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
        backgroundColor: customColors.white,
    },
    paymentOptionSelected: {
        backgroundColor: customColors.success,
        borderColor: customColors.success,
    },
    paymentOptionText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    paymentOptionTextSelected: {
        color: customColors.white,
        fontWeight: "600",
    },
});
