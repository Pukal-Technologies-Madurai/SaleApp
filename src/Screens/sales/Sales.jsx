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
    Animated,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";

import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import LocationIndicator from "../../Components/LocationIndicator";
import { API } from "../../Config/Endpoint";
import { createSaleOrder } from "../../Api/sales";
import {
    fetchUOM,
    fetchProductsWithStockValue,
    fetchGoDownwiseStockValue,
} from "../../Api/product";
import {
    customColors,
    typography,
    shadows,
    spacing,
    borderRadius,
    iconSizes,
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
        invoiceCopyCount: 1,
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
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });
    const [isActiveGoDown, setIsActiveGoDown] = useState(0);
    const [showOutOfStock, setShowOutOfStock] = useState(false);
    const [isInvoiceCopyEditing, setIsInvoiceCopyEditing] = useState(false);
    const [editingRateItemId, setEditingRateItemId] = useState(null);
    const [editingRateValue, setEditingRateValue] = useState("");
    const [isProductSearchVisible, setIsProductSearchVisible] = useState(false);
    const [productSearchText, setProductSearchText] = useState("");
    const [isNarrationModalVisible, setIsNarrationModalVisible] =
        useState(false);
    const [pendingBillType, setPendingBillType] = useState("");

    // Add animation for refresh button
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Load user session data once on mount (company, user, branch - these don't change)
    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");
                const branchId = await AsyncStorage.getItem("branchId");
                const costCenterId = await AsyncStorage.getItem("costCenterId");
                const costCenterName =
                    await AsyncStorage.getItem("costCenterName");
                const costCategoryId =
                    await AsyncStorage.getItem("costCategoryId");
                const costCategoryName =
                    await AsyncStorage.getItem("costCategoryName");

                setUID(userId);

                if (companyId && userId) {
                    let parsedBranchId = branchId;

                    // Handle different formats: "[2]", "2", 2
                    if (typeof branchId === "string") {
                        parsedBranchId = parseInt(
                            branchId.replace(/[\[\]]/g, ""),
                        );
                    } else {
                        parsedBranchId = parseInt(branchId) || 1;
                    }

                    const update = {
                        Company_Id: companyId,
                        Sales_Person_Id: userId,
                        Created_by: userId,
                        Sales_Person_Name: userName,
                        Branch_Id: parsedBranchId,
                    };

                    // Only include Staff_Involved_List when cost-center data is available.
                    // If these keys are missing from AsyncStorage the values are null,
                    // which causes the backend to store a null-filled row — so we skip
                    // the list entirely in that case.
                    if (costCenterId && costCategoryId) {
                        update.Staff_Involved_List = [
                            {
                                Involved_Emp_Id: parseInt(costCenterId, 10),
                                EmpName: costCenterName,
                                Cost_Center_Type_Id: parseInt(
                                    costCategoryId,
                                    10,
                                ),
                                EmpType: costCategoryName,
                            },
                        ];
                    }

                    setInitialValue(prev => ({ ...prev, ...update }));
                }
            } catch (err) {
                console.log("Error fetching user data:", err);
            }
        })();
    }, []);

    // Re-check godown every time this screen comes into focus.
    // This handles the case where the user goes to MasterGodown to set a godown
    // and then comes back — the godown ID will be re-read from AsyncStorage.
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            (async () => {
                try {
                    const activeGodown =
                        await AsyncStorage.getItem("activeGodown");
                    const parsedGodown = parseInt(activeGodown, 10);
                    const godownId = isNaN(parsedGodown) ? 0 : parsedGodown;

                    if (!isActive) return;
                    setIsActiveGoDown(godownId);

                    if (godownId === 0) {
                        Alert.alert(
                            "Godown Not Set",
                            "Please set an active godown before creating a Sale Order.",
                            [
                                {
                                    text: "Set Godown",
                                    onPress: () =>
                                        navigation.navigate("MasterGodown", {
                                            fromSales: true,
                                        }),
                                },
                                {
                                    text: "Go Back",
                                    onPress: () => navigation.goBack(),
                                    style: "cancel",
                                },
                            ],
                            { cancelable: false },
                        );
                    }
                } catch (err) {
                    console.log("Error reading activeGodown:", err);
                }
            })();
            return () => {
                isActive = false;
            };
        }, [navigation]),
    );

    // IMPORTANT: Godown stock query MUST come first since product query depends on it
    const {
        data: goDownStockValueData = {},
        isFetched: isGodownStockFetched,
        refetch: refetchGodownStock,
        isRefetching: isGodownRefetching,
    } = useQuery({
        queryKey: ["goDownStockValue", isActiveGoDown],
        queryFn: () => fetchGoDownwiseStockValue(isActiveGoDown),
        enabled: !!isActiveGoDown,
        staleTime: 0, // Always fetch fresh data
        select: data => {
            const productStockMap = {};
            data.forEach(item => {
                productStockMap[item.Product_Id] = item.Bal_Qty;
            });
            return productStockMap;
        },
    });

    const { data: productQueryData = { productData: [], brandData: [] } } =
        useQuery({
            queryKey: ["product", isActiveGoDown],
            queryFn: () => fetchProductsWithStockValue(),
            enabled: !!isActiveGoDown && isGodownStockFetched, // Only run when active godown is set and stock data is fetched
            staleTime: 0, // Always fetch fresh data
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

                // Update product data with godown-specific stock quantities
                const updatedProductData = data.map(product => ({
                    ...product,
                    CL_Qty: goDownStockValueData[product.Product_Id] || 0,
                }));

                return {
                    productData: updatedProductData,
                    brandData: brands,
                };
            },
        });

    const productData = productQueryData.productData;
    const brandData = productQueryData.brandData;

    const searchedProducts = useMemo(() => {
        const search = productSearchText.trim().toLowerCase();
        if (!search) return [];

        let matchedProducts = productData.filter(product => {
            const name = (product.Product_Name || "").toLowerCase();
            const code = String(product.Product_Code || "").toLowerCase();
            const brand = (product.Brand_Name || "").toLowerCase();
            const group = (product.Pro_Group || "").toLowerCase();

            return (
                name.includes(search) ||
                code.includes(search) ||
                brand.includes(search) ||
                group.includes(search)
            );
        });

        if (!showOutOfStock) {
            matchedProducts = matchedProducts.filter(
                product => product.CL_Qty > 0,
            );
        }

        return matchedProducts.slice(0, 100);
    }, [productData, productSearchText, showOutOfStock]);

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
        let filtered = productData.filter(
            product =>
                product.Brand_Name === selectedBrand &&
                product.Pro_Group === item.value,
        );

        // Filter out out-of-stock products unless showOutOfStock is true
        if (!showOutOfStock) {
            filtered = filtered.filter(product => product.CL_Qty > 0);
        }

        setFilteredProducts(filtered);
    };

    // Handle out of stock toggle
    const handleOutOfStockToggle = () => {
        setShowOutOfStock(!showOutOfStock);

        // Re-apply filtering if brand and group are selected
        if (selectedBrand && selectedGroup) {
            let filtered = productData.filter(
                product =>
                    product.Brand_Name === selectedBrand &&
                    product.Pro_Group === selectedGroup,
            );

            // Filter out out-of-stock products unless showOutOfStock will be true
            if (showOutOfStock) {
                // This will be the opposite after toggle
                filtered = filtered.filter(product => product.CL_Qty > 0);
            }

            setFilteredProducts(filtered);
        }
    };

    const handleProductSearchSelect = useCallback(
        product => {
            if (!product?.Brand_Name || !product?.Pro_Group) {
                Alert.alert(
                    "Unable to Filter",
                    "Selected product has missing brand/group mapping.",
                );
                return;
            }

            setSelectedBrand(product.Brand_Name);
            setSelectedGroup(product.Pro_Group);

            const groups = Array.from(
                new Set(
                    productData
                        .filter(item => item.Brand_Name === product.Brand_Name)
                        .map(item => item.Pro_Group),
                ),
            )
                .filter(group => group)
                .sort()
                .map(group => ({
                    label: group,
                    value: group,
                }));
            setProGroupData(groups);

            let filtered = productData.filter(
                item =>
                    item.Brand_Name === product.Brand_Name &&
                    item.Pro_Group === product.Pro_Group,
            );

            if (!showOutOfStock) {
                filtered = filtered.filter(item => item.CL_Qty > 0);
            }

            setFilteredProducts(filtered);
            setIsProductSearchVisible(false);
            setProductSearchText("");
        },
        [productData, showOutOfStock],
    );

    const handleInvoiceCopyCountChange = useCallback(value => {
        const rawValue = typeof value === "number" ? String(value) : value;

        if (rawValue === "") {
            setInitialValue(prev => ({
                ...prev,
                invoiceCopyCount: "",
            }));
            return;
        }

        if (!/^\d+$/.test(rawValue)) return;

        const numericValue = Math.min(10, Math.max(1, parseInt(rawValue, 10)));

        setInitialValue(prev => ({
            ...prev,
            invoiceCopyCount: numericValue,
        }));
    }, []);

    const updateInvoiceCopyCountByStep = useCallback(step => {
        setInitialValue(prev => {
            const currentValue = parseInt(prev.invoiceCopyCount, 10) || 1;
            const nextValue = Math.min(10, Math.max(1, currentValue + step));
            return {
                ...prev,
                invoiceCopyCount: nextValue,
            };
        });
    }, []);

    // Handle stock refresh
    const handleStockRefresh = () => {
        if (isActiveGoDown) {
            // Scale animation when pressed
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();

            refetchGodownStock()
                .then(() => {
                    ToastAndroid.show(
                        "Stock updated successfully! 📦",
                        ToastAndroid.SHORT,
                    );
                })
                .catch(() => {
                    ToastAndroid.show(
                        "Failed to update stock. Please try again.",
                        ToastAndroid.SHORT,
                    );
                });
        }
    };

    // Animation effect for refresh button
    useEffect(() => {
        if (isGodownRefetching) {
            const rotation = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            );
            rotation.start();

            // Add subtle pulse effect during refresh
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]),
            );
            pulse.start();

            return () => {
                rotation.stop();
                pulse.stop();
                rotateAnim.setValue(0);
                scaleAnim.setValue(1);
            };
        } else {
            rotateAnim.setValue(0);
            scaleAnim.setValue(1);
        }
    }, [isGodownRefetching, rotateAnim, scaleAnim]);

    const handleQuantityChange = useCallback(
        (productId, quantity, rate, product) => {
            // Check if product has stock before allowing quantity change
            if (product.CL_Qty <= 0) {
                Alert.alert(
                    "Out of Stock",
                    `${product.Product_Name} is currently out of stock. Available quantity: ${product.CL_Qty}`,
                );
                return;
            }

            const newQuantity = Math.max(0, parseFloat(quantity) || 0);

            // Validate that ordered quantity doesn't exceed available stock
            if (newQuantity > product.CL_Qty) {
                Alert.alert(
                    "Insufficient Stock",
                    `Only ${product.CL_Qty} units available for ${product.Product_Name}`,
                );
                return;
            }

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
                        GoDown_Id: Number(isActiveGoDown), // Added GoDown_Id for backend
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
        [selectedUOMs, isActiveGoDown],
    );

    const handleQuantityInputChange = useCallback(
        (productId, value, rate, product) => {
            // Check if product has stock before allowing input
            if (product.CL_Qty <= 0 && value !== "") {
                return; // Prevent any input for out of stock items
            }

            // Allow empty value or valid decimal numbers
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                // Update display value immediately
                setOrderQuantities(prev => ({
                    ...prev,
                    [productId]: value,
                }));

                // Only update the product array if it's a valid number
                if (
                    value !== "" &&
                    !value.endsWith(".") &&
                    !isNaN(parseFloat(value)) &&
                    parseFloat(value) > 0
                ) {
                    handleQuantityChange(productId, value, rate, product);
                } else if (
                    value === "" ||
                    (parseFloat(value) === 0 && !value.endsWith("."))
                ) {
                    // Remove from product array if empty or zero
                    handleQuantityChange(productId, "0", rate, product);
                }
            }
        },
        [handleQuantityChange],
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
                            Bill_Qty: parseFloat(
                                orderQuantities[productId] || 0,
                            ),
                            Item_Rate:
                                editedPrices[productId] || product.Item_Rate,
                            UOM: uomId,
                            GoDown_Id: Number(isActiveGoDown),
                        });
                    }
                }

                return {
                    ...prev,
                    Product_Array: updatedProductArray,
                };
            });
        },
        [orderQuantities, filteredProducts, editedPrices, isActiveGoDown],
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
            if (
                price !== "" &&
                !price.endsWith(".") &&
                !isNaN(parseFloat(price))
            ) {
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
                        } else if (
                            orderQuantities[productId] &&
                            parseFloat(orderQuantities[productId]) > 0
                        ) {
                            const product = filteredProducts.find(
                                p => p.Product_Id === productId,
                            );
                            updatedProductArray.push({
                                Item_Id: productId,
                                Product_Id: productId,
                                Bill_Qty: parseFloat(
                                    orderQuantities[productId],
                                ),
                                Item_Rate: numericPrice,
                                UOM: selectedUOMs[productId] || product.UOM_Id,
                                GoDown_Id: Number(isActiveGoDown),
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
        [orderQuantities, filteredProducts, selectedUOMs, isActiveGoDown],
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

        const invoiceCopyCount =
            parseInt(initialValue.invoiceCopyCount, 10) || 1;
        if (invoiceCopyCount < 1) {
            Alert.alert("Error", "Invoice copy count must be at least 1");
            return;
        }

        if (
            !initialValue.Product_Array.every(product => product.Item_Rate > 0)
        ) {
            Alert.alert("Error", "Please enter valid prices for all products");
            return;
        }

        setIsSubmitting(true);

        const visitEntrySuccess = await handleSubmitforVisitLog();
        if (!visitEntrySuccess) {
            setIsSubmitting(false);
            return;
        }

        mutation.mutate(
            {
                orderData: {
                    ...initialValue,
                    invoiceCopyCount,
                },
            },
            {
                onSettled: () => setIsSubmitting(false),
            },
        );
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

                            {/* Stock Refresh Button */}
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={handleStockRefresh}
                                disabled={!isActiveGoDown || isGodownRefetching}
                                activeOpacity={0.8}
                            >
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotate: rotateAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [
                                                        "0deg",
                                                        "360deg",
                                                    ],
                                                }),
                                            },
                                            {
                                                scale: scaleAnim,
                                            },
                                        ],
                                    }}
                                >
                                    <FeatherIcon
                                        name="refresh-cw"
                                        size={iconSizes.md}
                                        color={
                                            !isActiveGoDown ||
                                            isGodownRefetching
                                                ? customColors.grey400
                                                : customColors.primary
                                        }
                                    />
                                </Animated.View>

                                {/* Loading indicator overlay */}
                                {isGodownRefetching && (
                                    <View style={styles.refreshLoadingOverlay}>
                                        <View
                                            style={styles.refreshLoadingDot}
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.invoiceCopyRow}>
                            <Text style={styles.invoiceCopyLabel}>
                                Invoice Copies
                            </Text>
                            <View style={styles.invoiceCopyActionsRow}>
                                {!isInvoiceCopyEditing ? (
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <TouchableOpacity
                                            style={styles.invoiceCopyChip}
                                            onPress={() =>
                                                setIsInvoiceCopyEditing(true)
                                            }
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={
                                                    styles.invoiceCopyChipText
                                                }
                                            >
                                                {initialValue.invoiceCopyCount ||
                                                    1}
                                            </Text>
                                            <FeatherIcon
                                                name="edit-2"
                                                size={iconSizes.xs}
                                                color={customColors.grey700}
                                            />
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            style={styles.narrationButton}
                                            onPress={() => {
                                                setPendingBillType(
                                                    initialValue.Narration ||
                                                        "",
                                                );
                                                setIsNarrationModalVisible(
                                                    true,
                                                );
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <FeatherIcon
                                                name="file-text"
                                                size={iconSizes.sm}
                                                color={customColors.primary}
                                            />
                                            <Text
                                                style={
                                                    styles.narrationButtonText
                                                }
                                            >
                                                {initialValue.Narration ||
                                                    "Bill Type"}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.groupActionButton}
                                            onPress={() =>
                                                setIsProductSearchVisible(true)
                                            }
                                            disabled={!isActiveGoDown}
                                            activeOpacity={0.8}
                                        >
                                            <FeatherIcon
                                                name="search"
                                                size={iconSizes.sm}
                                                color={
                                                    !isActiveGoDown
                                                        ? customColors.grey400
                                                        : customColors.primary
                                                }
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.invoiceCopyEditorRow}>
                                        <View style={styles.filterGroupInput}>
                                            <View
                                                style={
                                                    styles.invoiceCopyControl
                                                }
                                            >
                                                <TouchableOpacity
                                                    style={
                                                        styles.copyAdjustButton
                                                    }
                                                    onPress={() =>
                                                        updateInvoiceCopyCountByStep(
                                                            -1,
                                                        )
                                                    }
                                                    activeOpacity={0.7}
                                                >
                                                    <FeatherIcon
                                                        name="minus"
                                                        size={iconSizes.sm}
                                                        color={
                                                            customColors.grey800
                                                        }
                                                    />
                                                </TouchableOpacity>

                                                <TextInput
                                                    style={
                                                        styles.invoiceCopyInput
                                                    }
                                                    keyboardType="number-pad"
                                                    value={String(
                                                        initialValue.invoiceCopyCount ||
                                                            "",
                                                    )}
                                                    onChangeText={
                                                        handleInvoiceCopyCountChange
                                                    }
                                                    maxLength={2}
                                                    placeholder="1"
                                                    placeholderTextColor={
                                                        customColors.grey500
                                                    }
                                                    textAlign="center"
                                                    autoFocus
                                                />

                                                <TouchableOpacity
                                                    style={
                                                        styles.copyAdjustButton
                                                    }
                                                    onPress={() =>
                                                        updateInvoiceCopyCountByStep(
                                                            1,
                                                        )
                                                    }
                                                    activeOpacity={0.7}
                                                >
                                                    <FeatherIcon
                                                        name="plus"
                                                        size={iconSizes.sm}
                                                        color={
                                                            customColors.grey800
                                                        }
                                                    />
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.invoiceDoneButton}
                                                onPress={() =>
                                                    setIsInvoiceCopyEditing(
                                                        false,
                                                    )
                                                }
                                                activeOpacity={0.7}
                                            >
                                                <FeatherIcon
                                                    name="check"
                                                    size={iconSizes.sm}
                                                    color={customColors.white}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {selectedBrand && selectedGroup && (
                        <View style={styles.productsContainer}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionHeaderLeft}>
                                    <FeatherIcon
                                        name="package"
                                        size={iconSizes.md}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.sectionTitle}>
                                        Available Products (
                                        {filteredProducts.length})
                                    </Text>
                                </View>

                                {/* Out of stock toggle */}
                                <TouchableOpacity
                                    style={styles.outOfStockToggle}
                                    onPress={handleOutOfStockToggle}
                                    activeOpacity={0.7}
                                >
                                    <FeatherIcon
                                        name={
                                            showOutOfStock ? "eye" : "eye-off"
                                        }
                                        size={iconSizes.sm}
                                        color={
                                            showOutOfStock
                                                ? customColors.primary
                                                : customColors.grey500
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.outOfStockToggleText,
                                            {
                                                color: showOutOfStock
                                                    ? customColors.primary
                                                    : customColors.grey500,
                                            },
                                        ]}
                                    >
                                        Out of Stock
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {filteredProducts.map(product => {
                                const isOutOfStock = product.CL_Qty <= 0;
                                return (
                                    <View
                                        key={product.Product_Id}
                                        style={[
                                            styles.productCard,
                                            isOutOfStock &&
                                                styles.outOfStockCard,
                                        ]}
                                    >
                                        <View style={styles.productHeader}>
                                            <View style={styles.productInfo}>
                                                <Text
                                                    style={styles.productName}
                                                >
                                                    {product.Product_Name}
                                                </Text>
                                                <View
                                                    style={
                                                        styles.availabilityContainer
                                                    }
                                                >
                                                    <FeatherIcon
                                                        name="box"
                                                        size={iconSizes.xs}
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
                                                        ]}
                                                    >
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
                                                    style={[
                                                        styles.quantityInput,
                                                        isOutOfStock &&
                                                            styles.disabledInput,
                                                    ]}
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
                                                    placeholder={
                                                        isOutOfStock
                                                            ? "N/A"
                                                            : "0.0"
                                                    }
                                                    placeholderTextColor={
                                                        isOutOfStock
                                                            ? customColors.error
                                                            : customColors.grey
                                                    }
                                                    selectTextOnFocus={true}
                                                    editable={!isOutOfStock}
                                                    pointerEvents={
                                                        isOutOfStock
                                                            ? "none"
                                                            : "auto"
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
                                                    containerStyle={[
                                                        styles.uomDropdownContainer,
                                                    ]}
                                                    placeholderStyle={
                                                        styles.uomPlaceholderStyle
                                                    }
                                                    selectedTextStyle={
                                                        styles.uomSelectedTextStyle
                                                    }
                                                    itemTextStyle={
                                                        styles.uomItemTextStyle
                                                    }
                                                    disable={isOutOfStock}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>
                                                    Price
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.priceContainer,
                                                        isOutOfStock &&
                                                            styles.disabledInput,
                                                    ]}
                                                >
                                                    <Text
                                                        style={
                                                            styles.currencySymbol
                                                        }
                                                    >
                                                        ₹
                                                    </Text>
                                                    <TextInput
                                                        style={
                                                            styles.priceInput
                                                        }
                                                        keyboardType="numeric"
                                                        value={
                                                            priceInputValues[
                                                                product
                                                                    .Product_Id
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
                                                        editable={!isOutOfStock}
                                                        pointerEvents={
                                                            isOutOfStock
                                                                ? "none"
                                                                : "auto"
                                                        }
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={isProductSearchVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setIsProductSearchVisible(false);
                    setProductSearchText("");
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.searchModalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <FeatherIcon
                                    name="search"
                                    size={iconSizes.lg}
                                    color={customColors.primary}
                                />
                                <Text style={styles.modalTitle}>
                                    Product Search
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsProductSearchVisible(false);
                                    setProductSearchText("");
                                }}
                                style={styles.closeButton}
                            >
                                <FeatherIcon
                                    name="x"
                                    color={customColors.grey600}
                                    size={iconSizes.lg}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchInputContainer}>
                            <FeatherIcon
                                name="search"
                                size={iconSizes.sm}
                                color={customColors.grey500}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by product, code, brand, group"
                                placeholderTextColor={customColors.grey500}
                                value={productSearchText}
                                onChangeText={setProductSearchText}
                                autoFocus
                            />
                        </View>

                        <ScrollView
                            style={styles.searchResultsList}
                            keyboardShouldPersistTaps="handled"
                        >
                            {productSearchText.trim() === "" ? (
                                <Text style={styles.searchHintText}>
                                    Type product name, code, brand, or group.
                                </Text>
                            ) : searchedProducts.length === 0 ? (
                                <Text style={styles.searchHintText}>
                                    No matching products found.
                                </Text>
                            ) : (
                                searchedProducts.map(product => (
                                    <TouchableOpacity
                                        key={`search-${product.Product_Id}`}
                                        style={styles.searchResultItem}
                                        onPress={() =>
                                            handleProductSearchSelect(product)
                                        }
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.searchResultHeader}>
                                            <Text
                                                style={styles.searchResultName}
                                            >
                                                {product.Product_Name}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.searchResultStock,
                                                    {
                                                        color:
                                                            product.CL_Qty > 0
                                                                ? customColors.success
                                                                : customColors.error,
                                                    },
                                                ]}
                                            >
                                                Stock: {product.CL_Qty}
                                            </Text>
                                        </View>
                                        <Text style={styles.searchResultMeta}>
                                            {product.Brand_Name} -{" "}
                                            {product.Pro_Group}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isNarrationModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsNarrationModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.billTypeModalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <FeatherIcon
                                    name="file-text"
                                    size={iconSizes.lg}
                                    color={customColors.primary}
                                />
                                <Text style={styles.modalTitle}>
                                    Select Bill Type
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() =>
                                    setIsNarrationModalVisible(false)
                                }
                                style={styles.closeButton}
                            >
                                <FeatherIcon
                                    name="x"
                                    color={customColors.grey600}
                                    size={iconSizes.lg}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.billTypeOption}
                            onPress={() => setPendingBillType("Cash Bill")}
                            activeOpacity={0.75}
                        >
                            <View style={styles.billTypeOptionLeft}>
                                <FeatherIcon
                                    name={
                                        pendingBillType === "Cash Bill"
                                            ? "check-circle"
                                            : "circle"
                                    }
                                    size={iconSizes.md}
                                    color={
                                        pendingBillType === "Cash Bill"
                                            ? customColors.primary
                                            : customColors.grey500
                                    }
                                />
                                <Text style={styles.billTypeOptionText}>
                                    Cash Bill
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.billTypeOption}
                            onPress={() => setPendingBillType("Credit Bill")}
                            activeOpacity={0.75}
                        >
                            <View style={styles.billTypeOptionLeft}>
                                <FeatherIcon
                                    name={
                                        pendingBillType === "Credit Bill"
                                            ? "check-circle"
                                            : "circle"
                                    }
                                    size={iconSizes.md}
                                    color={
                                        pendingBillType === "Credit Bill"
                                            ? customColors.primary
                                            : customColors.grey500
                                    }
                                />
                                <Text style={styles.billTypeOptionText}>
                                    Credit Bill
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.billTypeSubmitButton}
                            onPress={() => {
                                if (!pendingBillType) {
                                    Alert.alert(
                                        "Select Bill Type",
                                        "Please choose Cash Bill or Credit Bill",
                                    );
                                    return;
                                }

                                setInitialValue(prev => ({
                                    ...prev,
                                    Narration: pendingBillType,
                                }));
                                setIsNarrationModalVisible(false);
                            }}
                            activeOpacity={0.8}
                        >
                            <FeatherIcon
                                name="check"
                                size={iconSizes.sm}
                                color={customColors.white}
                            />
                            <Text style={styles.billTypeSubmitText}>
                                Submit
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isSummaryModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSummaryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <FeatherIcon
                                    name="shopping-cart"
                                    size={iconSizes.lg}
                                    color={customColors.primary}
                                />
                                <Text style={styles.modalTitle}>
                                    Order Summary
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsSummaryModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <FeatherIcon
                                    name="x"
                                    color={customColors.grey600}
                                    size={iconSizes.lg}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.summaryList}
                            showsVerticalScrollIndicator={false}
                        >
                            {initialValue.Product_Array.length === 0 ? (
                                <View style={styles.emptyCartContainer}>
                                    <FeatherIcon
                                        name="shopping-bag"
                                        size={iconSizes.xxl}
                                        color={customColors.grey300}
                                    />
                                    <Text style={styles.emptyCartText}>
                                        No products added
                                    </Text>
                                    <Text style={styles.emptyCartSubtext}>
                                        Add products from the list to create an
                                        order
                                    </Text>
                                </View>
                            ) : (
                                initialValue.Product_Array.map(item => {
                                    const product = productData.find(
                                        p => p.Product_Id === item.Item_Id,
                                    );
                                    const uom = uomData.find(
                                        u => u.Unit_Id === item.UOM,
                                    );

                                    const isZeroRate = item.Item_Rate === 0;
                                    const isEditingThisRate =
                                        editingRateItemId === item.Item_Id;

                                    return (
                                        <View
                                            key={item.Item_Id}
                                            style={[
                                                styles.summaryItem,
                                                isZeroRate &&
                                                    styles.summaryItemWarning,
                                            ]}
                                        >
                                            <View
                                                style={
                                                    styles.summaryItemDetails
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.summaryItemName
                                                    }
                                                >
                                                    {product?.Product_Name}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.summaryItemQty
                                                    }
                                                >
                                                    {item.Bill_Qty} {uom?.Units}
                                                </Text>

                                                {isEditingThisRate ? (
                                                    <View
                                                        style={
                                                            styles.inlineRateEditor
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.currencySymbolSmall
                                                            }
                                                        >
                                                            ₹
                                                        </Text>
                                                        <TextInput
                                                            style={
                                                                styles.inlineRateInput
                                                            }
                                                            keyboardType="numeric"
                                                            value={
                                                                editingRateValue
                                                            }
                                                            onChangeText={
                                                                setEditingRateValue
                                                            }
                                                            placeholder="0.00"
                                                            placeholderTextColor={
                                                                customColors.grey400
                                                            }
                                                            autoFocus
                                                            selectTextOnFocus
                                                        />
                                                        <TouchableOpacity
                                                            style={
                                                                styles.inlineRateConfirmBtn
                                                            }
                                                            onPress={() => {
                                                                if (
                                                                    editingRateValue !==
                                                                        "" &&
                                                                    parseFloat(
                                                                        editingRateValue,
                                                                    ) > 0
                                                                ) {
                                                                    handlePriceChange(
                                                                        item.Item_Id,
                                                                        editingRateValue,
                                                                    );
                                                                }
                                                                setEditingRateItemId(
                                                                    null,
                                                                );
                                                                setEditingRateValue(
                                                                    "",
                                                                );
                                                            }}
                                                        >
                                                            <FeatherIcon
                                                                name="check"
                                                                size={
                                                                    iconSizes.sm
                                                                }
                                                                color={
                                                                    customColors.white
                                                                }
                                                            />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={
                                                                styles.inlineRateCancelBtn
                                                            }
                                                            onPress={() => {
                                                                setEditingRateItemId(
                                                                    null,
                                                                );
                                                                setEditingRateValue(
                                                                    "",
                                                                );
                                                            }}
                                                        >
                                                            <FeatherIcon
                                                                name="x"
                                                                size={
                                                                    iconSizes.sm
                                                                }
                                                                color={
                                                                    customColors.grey700
                                                                }
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={
                                                            styles.summaryItemRateRow
                                                        }
                                                        onPress={() => {
                                                            setEditingRateItemId(
                                                                item.Item_Id,
                                                            );
                                                            setEditingRateValue(
                                                                item.Item_Rate >
                                                                    0
                                                                    ? String(
                                                                          item.Item_Rate,
                                                                      )
                                                                    : "",
                                                            );
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        {isZeroRate && (
                                                            <FeatherIcon
                                                                name="alert-circle"
                                                                size={
                                                                    iconSizes.xs
                                                                }
                                                                color={
                                                                    customColors.error
                                                                }
                                                                style={{
                                                                    marginRight: 3,
                                                                }}
                                                            />
                                                        )}
                                                        <Text
                                                            style={[
                                                                styles.summaryItemRate,
                                                                isZeroRate && {
                                                                    color: customColors.error,
                                                                    fontWeight:
                                                                        "600",
                                                                },
                                                            ]}
                                                        >
                                                            {isZeroRate
                                                                ? "Tap to set price"
                                                                : `₹${item.Item_Rate} per unit`}
                                                        </Text>
                                                        <FeatherIcon
                                                            name="edit-2"
                                                            size={iconSizes.xs}
                                                            color={
                                                                isZeroRate
                                                                    ? customColors.error
                                                                    : customColors.grey500
                                                            }
                                                            style={{
                                                                marginLeft: 4,
                                                            }}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View
                                                style={styles.summaryItemRight}
                                            >
                                                <Text
                                                    style={[
                                                        styles.summaryItemPrice,
                                                        isZeroRate && {
                                                            color: customColors.error,
                                                        },
                                                    ]}
                                                >
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
                                                    }
                                                >
                                                    <FeatherIcon
                                                        name="trash-2"
                                                        size={iconSizes.md}
                                                        color={
                                                            customColors.white
                                                        }
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
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
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <View style={styles.submitButtonContent}>
                                        <FeatherIcon
                                            name="shopping-bag"
                                            size={iconSizes.md}
                                            color={customColors.white}
                                        />
                                        <Text style={styles.submitButtonText}>
                                            Submit Order
                                        </Text>
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
        borderRadius: borderRadius.lg,
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
    invoiceCopyRow: {
        marginTop: spacing.md,
        alignItems: "flex-start",
        gap: spacing.xs,
    },
    invoiceCopyActionsRow: {
        width: "100%",
        alignItems: "flex-start",
    },
    invoiceCopyLabel: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    invoiceCopyChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey100,
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    invoiceCopyChipText: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    invoiceCopyEditorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        flexWrap: "wrap",
    },
    filterGroupInput: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        flexWrap: "wrap",
    },
    invoiceCopyControl: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.white,
        overflow: "hidden",
    },
    copyAdjustButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.grey100,
    },
    invoiceCopyInput: {
        minWidth: 52,
        height: 36,
        paddingHorizontal: spacing.sm,
        ...typography.subtitle2(),
        color: customColors.grey900,
        backgroundColor: customColors.white,
    },
    invoiceDoneButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.primary,
    },
    refreshButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey300,
        ...shadows.small,
        position: "relative",
    },
    searchButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        ...shadows.small,
    },
    groupActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    narrationButton: {
        height: 36,
        paddingHorizontal: spacing.sm,
        borderRadius: 18,
        backgroundColor: customColors.white,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    narrationButtonText: {
        ...typography.caption(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    refreshLoadingOverlay: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: customColors.success,
        justifyContent: "center",
        alignItems: "center",
    },
    refreshLoadingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: customColors.white,
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
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.small,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    sectionHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginLeft: spacing.sm,
        fontWeight: "600",
    },
    outOfStockToggle: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        backgroundColor: customColors.grey100,
        gap: spacing.xs,
    },
    outOfStockToggleText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    productCard: {
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.md,
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
    // Out of stock styles
    outOfStockCard: {
        opacity: 0.6,
        backgroundColor: customColors.grey100,
    },
    disabledInput: {
        backgroundColor: customColors.grey200,
        color: customColors.grey500,
        opacity: 0.7,
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
    searchModalContent: {
        maxHeight: "85%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.md,
    },
    billTypeModalContent: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.md,
    },
    billTypeOption: {
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: customColors.white,
    },
    billTypeOptionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    billTypeOptionText: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    billTypeSubmitButton: {
        height: 44,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
        backgroundColor: customColors.primary,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.xs,
    },
    billTypeSubmitText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        backgroundColor: customColors.grey50,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        height: 44,
        marginLeft: spacing.xs,
        ...typography.body1(),
        color: customColors.grey900,
    },
    searchResultsList: {
        maxHeight: "75%",
    },
    searchHintText: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
        marginTop: spacing.lg,
    },
    searchResultItem: {
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.white,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    searchResultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: spacing.sm,
    },
    searchResultName: {
        flex: 1,
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    searchResultStock: {
        ...typography.caption(),
        fontWeight: "600",
    },
    searchResultMeta: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xs,
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
        borderRadius: borderRadius.md,
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
    summaryItemWarning: {
        borderColor: customColors.errorLight,
        backgroundColor: "#fff5f5",
    },
    summaryItemRateRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    summaryItemRate: {
        ...typography.caption(),
        color: customColors.grey600,
        fontStyle: "italic",
    },
    inlineRateEditor: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
        gap: spacing.xs,
    },
    currencySymbolSmall: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    inlineRateInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: customColors.primary,
        borderRadius: 4,
        paddingHorizontal: spacing.xs,
        ...typography.caption(),
        color: customColors.grey900,
        backgroundColor: customColors.white,
        minWidth: 60,
    },
    inlineRateConfirmBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    inlineRateCancelBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: customColors.grey200,
        justifyContent: "center",
        alignItems: "center",
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
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: "center",
        marginTop: spacing.md,
        ...shadows.medium,
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
    // Empty Cart Styles
    emptyCartContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.md,
    },
    emptyCartText: {
        ...typography.h6(),
        color: customColors.grey500,
        fontWeight: "600",
        marginTop: spacing.md,
    },
    emptyCartSubtext: {
        ...typography.caption(),
        color: customColors.grey400,
        textAlign: "center",
        marginTop: spacing.xs,
    },
});
