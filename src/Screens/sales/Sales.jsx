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
    ToastAndroid,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import LocationIndicator from "../../Components/LocationIndicator";
import { API } from "../../Config/Endpoint";
import { createSaleOrder } from "../../Api/sales";
import { fetchUOM, fetchProductsWithStockValue } from "../../Api/product";
import {
    createLiveSales,
    fetchCreditLiveSale,
    fetchDebitLiveSale,
} from "../../Api/receipt";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";

const Sales = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;

    const [initialValue, setInitialValue] = useState({
        Company_Id: "",
        Branch_Id: "",
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
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    // Add new state for partial amount
    const [partialAmount, setPartialAmount] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");
                const branchId = await AsyncStorage.getItem("branchId");
                setUID(userId);
                if (companyId && userId) {
                    let parsedBranchId = branchId;

                    // Handle different formats: "[2]", "2", 2
                    if (typeof branchId === "string") {
                        // Remove brackets if present and parse to integer
                        parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ''));
                    } else {
                        parsedBranchId = parseInt(branchId) || 1; // Default to 1 if invalid
                    }

                    setInitialValue(prev => ({
                        ...prev,
                        Company_Id: companyId,
                        Sales_Person_Id: userId,
                        Created_by: userId,
                        Sales_Person_Name: userName,
                        Branch_Id: parsedBranchId,
                    }));
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    const { data: productQueryData = { productData: [], brandData: [] } } =
        useQuery({
            queryKey: ["product"],
            queryFn: () => fetchProductsWithStockValue(),
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
            const newQuantity = Math.max(0, parseFloat(quantity) || 0);
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

    const handleQuantityInputChange = useCallback((productId, value, rate, product) => {
        // Allow empty value or valid decimal numbers
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            // Update display value immediately
            setOrderQuantities(prev => ({
                ...prev,
                [productId]: value,
            }));

            // Only update the product array if it's a valid number
            if (value !== "" && !value.endsWith('.') && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
                handleQuantityChange(productId, value, rate, product);
            } else if (value === "" || (parseFloat(value) === 0 && !value.endsWith('.'))) {
                // Remove from product array if empty or zero
                handleQuantityChange(productId, "0", rate, product);
            }
        }
    }, [handleQuantityChange]);

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
                            Bill_Qty: parseFloat(orderQuantities[productId] || 0),
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
            // Allow empty value or valid decimal numbers (including trailing dots)
            if (price === "" || /^\d*\.?\d*$/.test(price)) {
                // Update the display value immediately - preserves trailing dots
                setPriceInputValues(prev => ({
                    ...prev,
                    [productId]: price,
                }));
            }

            // Only update the actual price if it's a valid complete number
            if (price !== "" && !price.endsWith('.') && !isNaN(parseFloat(price))) {
                const numericPrice = parseFloat(price);
                if (numericPrice >= 0) {
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
                        } else if (orderQuantities[productId] && parseFloat(orderQuantities[productId]) > 0) {
                            const product = filteredProducts.find(
                                p => p.Product_Id === productId,
                            );
                            updatedProductArray.push({
                                Item_Id: productId,
                                Product_Id: productId,
                                Bill_Qty: parseFloat(orderQuantities[productId]),
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
        let finalLatitude = location.latitude;
        let finalLongitude = location.longitude;

        if (!location.latitude || !location.longitude) {
            finalLatitude = 9.9475;
            finalLongitude = 78.1454;
            ToastAndroid.show("Using default location", ToastAndroid.SHORT);
        }

        try {
            const formData = new FormData();
            formData.append("Mode", 1);
            formData.append("Retailer_Id", item.Retailer_Id);
            formData.append("Latitude", finalLatitude.toString());
            formData.append("Longitude", finalLongitude.toString());
            formData.append("Narration", "The Sale order has been created.");
            formData.append("EntryBy", uID);

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
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show(
                `Visit log error: ${err.message}`,
                ToastAndroid.LONG,
            );
            return false;
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

        if (
            !initialValue.Product_Array.every(product => product.Item_Rate > 0)
        ) {
            Alert.alert("Error", "Please enter valid prices for all products");
            return;
        }

        // Validate partial amount for cash/bank payments
        if (
            isLiveSale &&
            (paymentMethod === "cash" || paymentMethod === "bank")
        ) {
            if (!validatePartialAmount()) {
                return;
            }
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

            // Use partial amount if provided for cash/bank, otherwise use full amount
            const paymentAmount =
                paymentMethod === "cash" || paymentMethod === "bank"
                    ? parseFloat(partialAmount)
                    : orderTotal;

            // Construct the proper request body for live sales
            const resBody = {
                Branch_Id: initialValue.Branch_Id,
                Narration: `Live sale order created with ${paymentMethod.toUpperCase()} payment of ₹${paymentAmount} (Total: ₹${orderTotal})`,
                Created_by: initialValue.Created_by,
                GST_Inclusive: 1,
                IS_IGST: 0,
                credit_ledger: Number(creditLedgerInfo.id),
                credit_ledger_name: creditLedgerInfo.name,
                debit_ledger: debitLedgerData[0]?.Acc_Id,
                debit_ledger_name: debitLedgerData[0]?.AC_Reason,
                credit_amount: paymentAmount,
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

        const visitEntrySuccess = await handleSubmitforVisitLog();
        if (!visitEntrySuccess) return;

        mutation.mutate(
            { orderData: initialValue },
            {
                onSettled: () => setIsSubmitting(false),
            },
        );
    };

    // Add validation for partial amount
    const validatePartialAmount = () => {
        const amount = parseFloat(partialAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return false;
        }
        if (amount > orderTotal) {
            Alert.alert("Error", "Partial amount cannot exceed total amount");
            return false;
        }
        return true;
    };

    const handlePaymentMethodChange = method => {
        setPaymentMethod(method);
        if (method === "cash" || method === "bank") {
            // Set the full amount as default
            setPartialAmount(orderTotal.toString());
        } else {
            setPartialAmount("");
        }
    };

    // Add useEffect to update partial amount when orderTotal changes
    useEffect(() => {
        if (
            isLiveSale &&
            (paymentMethod === "cash" || paymentMethod === "bank")
        ) {
            setPartialAmount(orderTotal.toString());
        }
    }, [isLiveSale, paymentMethod, orderTotal]);

    // Update the TextInput handling
    const handleAmountFocus = () => {
        // When user focuses, select all text so they can easily replace it
        // This is handled by selectTextOnFocus prop
    };

    const handleAmountChange = value => {
        // Allow empty value or valid numbers
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setPartialAmount(value);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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

            <LocationIndicator
                onLocationUpdate={locationData => setLocation(locationData)}
                autoFetch={true}
                autoFetchOnMount={true}
                showComponent={false}
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
                                                keyboardType="decimal-pad"
                                                value={
                                                    orderQuantities[
                                                    product.Product_Id
                                                    ] || ""
                                                }
                                                onChangeText={quantity =>
                                                    handleQuantityInputChange(
                                                        product.Product_Id,
                                                        quantity,
                                                        product.Item_Rate,
                                                        product,
                                                    )
                                                }
                                                placeholder="0.0"
                                                placeholderTextColor={
                                                    customColors.grey
                                                }
                                                selectTextOnFocus={true}
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
                                                handlePaymentMethodChange(
                                                    "cash",
                                                )
                                            }>
                                            <Icon
                                                name="money"
                                                size={18}
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
                                                handlePaymentMethodChange(
                                                    "bank",
                                                )
                                            }>
                                            <MaterialIcons
                                                name="account-balance"
                                                size={18}
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
                                                handlePaymentMethodChange(
                                                    "credit",
                                                )
                                            }>
                                            <MaterialIcons
                                                name="credit-card"
                                                size={18}
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

                                    {/* Payment Amount Input (only for cash/bank) */}
                                    {(paymentMethod === "cash" ||
                                        paymentMethod === "bank") && (
                                            <View
                                                style={
                                                    styles.partialAmountContainer
                                                }>
                                                <Text
                                                    style={
                                                        styles.partialAmountLabel
                                                    }>
                                                    Payment Amount:
                                                </Text>
                                                <View
                                                    style={
                                                        styles.amountInputContainer
                                                    }>
                                                    <Text
                                                        style={
                                                            styles.currencySymbol
                                                        }>
                                                        ₹
                                                    </Text>
                                                    <TextInput
                                                        style={styles.amountInput}
                                                        value={partialAmount}
                                                        onChangeText={
                                                            handleAmountChange
                                                        }
                                                        onFocus={handleAmountFocus}
                                                        keyboardType="numeric"
                                                        placeholder={orderTotal.toString()}
                                                        placeholderTextColor={
                                                            customColors.grey400
                                                        }
                                                        selectTextOnFocus={true}
                                                        returnKeyType="done"
                                                    />
                                                    <Text
                                                        style={
                                                            styles.totalAmountText
                                                        }>
                                                        Total: ₹
                                                        {orderTotal.toFixed(2)}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={
                                                        styles.partialAmountHint
                                                    }>
                                                    {partialAmount &&
                                                        parseFloat(partialAmount) <
                                                        orderTotal
                                                        ? `Remaining: ₹${(orderTotal - parseFloat(partialAmount || 0)).toFixed(2)} (Credit)`
                                                        : "Amount auto-filled. Tap to modify for partial payment"}
                                                </Text>
                                            </View>
                                        )}
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
                                                ? `Complete Live Sale`
                                                : "Submit Order"}
                                        </Text>
                                        {isLiveSale &&
                                            (paymentMethod === "cash" ||
                                                paymentMethod === "bank") && (
                                                <Text
                                                    style={
                                                        styles.submitButtonSubtext
                                                    }>
                                                    ₹{partialAmount || "0"} (
                                                    {paymentMethod.toUpperCase()}
                                                    )
                                                </Text>
                                            )}
                                        {isLiveSale &&
                                            paymentMethod === "credit" && (
                                                <Text
                                                    style={
                                                        styles.submitButtonSubtext
                                                    }>
                                                    (CREDIT)
                                                </Text>
                                            )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Sales;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
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
        maxHeight: "90%",
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
    // Updated payment method styles
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
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    paymentOption: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
        backgroundColor: customColors.white,
        minHeight: 40,
    },
    paymentOptionSelected: {
        backgroundColor: customColors.success,
        borderColor: customColors.success,
    },
    paymentOptionText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    paymentOptionTextSelected: {
        color: customColors.white,
        fontWeight: "600",
    },

    // New partial amount styles
    partialAmountContainer: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    partialAmountLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    amountInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: customColors.grey300,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
    },
    currencySymbol: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginRight: spacing.xs,
    },
    amountInput: {
        flex: 1,
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        textAlign: "center",
        paddingVertical: spacing.sm,
        minHeight: 40,
    },
    totalAmountText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginLeft: spacing.xs,
    },
    partialAmountHint: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
        fontStyle: "italic",
        lineHeight: 16,
    },

    // Remove delivery styles (commented out or deleted)
    // deliveryContainer: { ... },
    // deliveryCheckbox: { ... },
    // deliveryLabel: { ... },
});
