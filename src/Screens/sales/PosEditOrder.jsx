import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { fetchRetailersName } from "../../Api/retailers";
import { customColors, typography } from "../../Config/helper";
import { fetchCostCenter, fetchPosOrderBranch, fetchProductsWithStockValue } from "../../Api/product";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";

const PosEditOrder = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;

    const initialStockValue = useMemo(() => ({
        So_Id: item.So_Id,
        Company_Id: item.Company_Id,
        ST_Date: new Date().toISOString().split("T")[0],
        Branch_Id: item.Branch_Id,
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Narration: item.Narration,
        Created_by: item.Created_by,
        VoucherType: item.VoucherType,
        Product_Array: item.Products_List,
        Sales_Person_Id: item.Sales_Person_Id,
        Staff_Involved_List: item.Staff_Involved_List || [],
    }), [item]);

    const [uID, setUID] = useState();
    const [isInitialized, setIsInitialized] = useState(false);
    const [stockInputValue, setStockInputValue] = useState(initialStockValue);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedBrokerId, setSelectedBrokerId] = useState(null);
    const [selectedTransportId, setSelectedTransportId] = useState(null);
    const [editableProducts, setEditableProducts] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [showAddProducts, setShowAddProducts] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedRetailer, setSelectedRetailer] = useState(item.Retailer_Id);

    // Change from brandData to POS Brand for SM TRADERS
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [newProductQuantities, setNewProductQuantities] = useState([]);

    const {
        data: productQueryData = {
            productData: [],
        },
    } = useQuery({
        queryKey: ["product", uID],
        queryFn: () => fetchProductsWithStockValue(),
        select: data => {
            return {
                productData: data || [],
            };
        },
    });

    const extractPackWeight = useCallback((productName) => {
        if (!productName) return 0;

        // Extract number before "KG" (case insensitive)
        const match = productName.match(/(\d+(?:\.\d+)?)\s*KG/i);
        return match ? parseFloat(match[1]) : 0;
    }, []);

    const calculateTotal = useCallback(products => {
        const newTotal = products.reduce((sum, product) => {
            const bags = parseFloat(product.Bill_Qty) || 0;
            const rate = parseFloat(product.Item_Rate) || 0;

            // First try to get PackGet from product data, then fallback to product name
            let packWeight = product.Pack_Weight || 0;

            if (packWeight === 0) {
                // Get the product data to access PackGet
                const masterProduct = productQueryData.productData.find(
                    p => p.Product_Id.toString() === product.Item_Id
                );

                if (masterProduct?.PackGet) {
                    packWeight = parseFloat(masterProduct.PackGet);
                } else {
                    packWeight = extractPackWeight(product.Product_Name);
                }
            }

            const totalWeight = bags * packWeight;
            const amount = totalWeight * rate;

            // console.log(`Calculate: ${product.Product_Name} - ${bags} bags × ${packWeight} kg × ₹${rate} = ₹${amount}`);
            return sum + amount;
        }, 0);
        setTotal(isNaN(newTotal) ? 0 : newTotal);
    }, [productQueryData.productData, extractPackWeight]);

    useEffect(() => {
        const initialize = async () => {
            try {
                const userId = await AsyncStorage.getItem("Company_Id");
                setUID(userId);

                if (!isInitialized &&
                    item.Products_List &&
                    item.Products_List.length > 0 &&
                    productQueryData?.productData &&
                    productQueryData.productData.length > 0) {

                    const initialEditableProducts = item.Products_List.map(product => {
                        const masterProduct = productQueryData.productData.find(
                            p => p.Product_Id.toString() === product.Item_Id.toString()
                        );

                        let packWeight = 0;
                        if (masterProduct?.PackGet) {
                            packWeight = parseFloat(masterProduct.PackGet);
                        } else {
                            const match = product.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i);
                            packWeight = match ? parseFloat(match[1]) : 1;
                        }

                        const totalKg = parseFloat(product.Bill_Qty) || 0;
                        const bags = packWeight > 0 ? (totalKg / packWeight) : totalKg;

                        return {
                            Item_Id: product.Item_Id.toString(),
                            Product_Name: product.Product_Name,
                            Product_Short_Name: product.Product_Short_Name,
                            Bill_Qty: bags.toString(),
                            Item_Rate: product.Item_Rate.toString(),
                            Amount: product.Amount,
                            isExisting: true,
                            Original_Bill_Qty: totalKg,
                            Pack_Weight: packWeight,
                        };
                    });

                    setEditableProducts(initialEditableProducts);
                    calculateTotal(initialEditableProducts);
                    setIsInitialized(true); // Mark as initialized
                }
            } catch (err) {
                console.error(err);
            }
        };

        initialize();
    }, [item.Products_List, productQueryData?.productData, isInitialized, calculateTotal]);

    useEffect(() => {
        // Initialize broker and transport from Staff_Involved_List
        if (item?.Staff_Involved_List && item.Staff_Involved_List.length > 0) {
            const brokerFromList = item.Staff_Involved_List.find(
                staff => staff.EmpType === "Broker" || staff.Cost_Center_Type_Id === 3
            );

            const transportFromList = item.Staff_Involved_List.find(
                staff => staff.EmpType === "Transport" || staff.Cost_Center_Type_Id === 2
            );

            if (brokerFromList) {
                setSelectedBrokerId(String(brokerFromList.Involved_Emp_Id));
            }

            if (transportFromList) {
                setSelectedTransportId(String(transportFromList.Involved_Emp_Id));
            }
        }
    }, [item?.Staff_Involved_List]);

    // Add POS Order Branch query for SM TRADERS dropdown
    const { data: branchDropdownData = [] } = useQuery({
        queryKey: ["posOrderBranch"],
        queryFn: fetchPosOrderBranch,
    });

    const { data: fetchRetailerName = [] } = useQuery({
        queryKey: ["retailerName"],
        queryFn: () => fetchRetailersName(),
        select: data => {
            return data.map(retailer => ({
                value: retailer.Retailer_Id,
                label: retailer.Retailer_Name,
            }));
        },
    });

    const { data: rawCostCenters = [] } = useQuery({
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

    // Update the handleProductUpdate function to include PackGet calculation
    const handleProductUpdate = (index, field, value) => {
        const updatedProducts = [...editableProducts];
        const currentProduct = updatedProducts[index];

        // Get pack weight from stored value or master data
        let packWeight = currentProduct.Pack_Weight || 0;

        if (packWeight === 0) {
            const masterProduct = productQueryData.productData.find(
                p => p.Product_Id.toString() === currentProduct.Item_Id
            );

            if (masterProduct?.PackGet) {
                packWeight = parseFloat(masterProduct.PackGet);
            } else {
                packWeight = extractPackWeight(currentProduct.Product_Name);
            }
        }

        // Update the field
        updatedProducts[index] = {
            ...updatedProducts[index],
            [field]: value,
            Pack_Weight: packWeight, // Always store pack weight
        };

        // Recalculate amount if quantity or rate changes
        if (field === "Bill_Qty" || field === "Item_Rate") {
            const bags = parseFloat(updatedProducts[index].Bill_Qty) || 0;
            const rate = parseFloat(updatedProducts[index].Item_Rate) || 0;
            const totalWeight = bags * packWeight;

            updatedProducts[index].Amount = totalWeight * rate;
            updatedProducts[index].Total_Weight = totalWeight;

            console.log(`Updated: ${bags} bags × ${packWeight} kg × ₹${rate} = ₹${totalWeight * rate}`);
        }

        setEditableProducts(updatedProducts);
        calculateTotal(updatedProducts);
    };

    useEffect(() => {
        const staffInvolvedList = [];

        if (selectedBrokerId && brokersData.length > 0) {
            const selectedBroker = brokersData.find(broker =>
                String(broker.Cost_Center_Id) === String(selectedBrokerId)
            );

            if (selectedBroker) {
                staffInvolvedList.push({
                    Id: "",
                    So_Id: item.So_Id || "",
                    Involved_Emp_Id: parseInt(selectedBroker.Cost_Center_Id),
                    EmpName: selectedBroker.Cost_Center_Name || "",
                    Cost_Center_Type_Id: selectedBroker.User_Type || 3,
                    EmpType: selectedBroker.UserTypeGet || "Broker"
                });
            }
        }

        if (selectedTransportId && transportData.length > 0) {
            const selectedTransport = transportData.find(transport =>
                String(transport.Cost_Center_Id) === String(selectedTransportId)
            );

            if (selectedTransport) {
                staffInvolvedList.push({
                    Id: "",
                    So_Id: item.So_Id || "",
                    Involved_Emp_Id: parseInt(selectedTransport.Cost_Center_Id),
                    EmpName: selectedTransport.Cost_Center_Name || "",
                    Cost_Center_Type_Id: selectedTransport.User_Type || 2,
                    EmpType: selectedTransport.UserTypeGet || "Transport"
                });
            }
        }

        setStockInputValue(prev => {
            const currentList = prev.Staff_Involved_List || [];
            const newListString = JSON.stringify(staffInvolvedList);
            const currentListString = JSON.stringify(currentList);

            if (newListString !== currentListString) {
                return {
                    ...prev,
                    Staff_Involved_List: staffInvolvedList
                };
            }
            return prev;
        });
    }, [selectedBrokerId, selectedTransportId, brokersData, transportData, item.So_Id]);

    const transformedBranchData = useMemo(() => {
        return branchDropdownData.map(brand => ({
            label: brand.POS_Brand_Name,
            value: String(brand.POS_Brand_Id), // Convert to string for consistency
            ...brand // Keep original data
        }));
    }, [branchDropdownData]);

    // Handle brand selection for SM TRADERS (POS_Brand_Id)
    const handleBrandSelection = useCallback((selectedItem) => {
        setSelectedBrand(String(selectedItem.value));
        setNewProductQuantities([]);
    }, []);

    // Update the useEffect for filtering products - SM TRADERS specific
    useEffect(() => {
        if (productQueryData?.productData && showAddProducts) {
            const existingProductIds = editableProducts.map(p => p.Item_Id);

            if (selectedBrand) {
                const filteredData = productQueryData.productData.filter(product => {
                    const isActive = product.IsActive === 1;
                    const notAlreadyAdded = !existingProductIds.includes(
                        product.Product_Id.toString(),
                    );
                    const matchesBrand = product.Pos_Brand_Id === parseInt(selectedBrand);

                    return isActive && notAlreadyAdded && matchesBrand;
                });

                setFilteredProducts(filteredData);
            } else {
                setFilteredProducts([]);
            }
        } else {
            setFilteredProducts([]);
        }
    }, [
        selectedBrand,
        productQueryData?.productData,
        showAddProducts,
        editableProducts,
    ]);

    // Reset states when closing add products section
    const handleCloseAddProducts = () => {
        setShowAddProducts(false);
        setSelectedBrand(null);
        setFilteredProducts([]);
        setNewProductQuantities([]);
    };

    const handleRetailerChange = item => {
        setSelectedRetailer(item.value);
        setStockInputValue(prev => ({
            ...prev,
            Retailer_Id: item.value,
            Retailer_Name: item.label,
        }));
    };

    const handleRemoveProduct = index => {
        Alert.alert(
            "Remove Product",
            "Are you sure you want to remove this product?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        const updatedProducts = editableProducts.filter(
                            (_, i) => i !== index,
                        );
                        setEditableProducts(updatedProducts);
                        calculateTotal(updatedProducts);
                    },
                },
            ],
        );
    };

    const handleNewProductQuantityChange = (productId, field, value) => {
        const updatedQuantities = [...newProductQuantities];
        const productIndex = updatedQuantities.findIndex(
            item => item.Item_Id === productId,
        );

        // Get the product data to access PackGet
        const productData = productQueryData.productData.find(
            p => p.Product_Id.toString() === productId
        );

        // First try to get PackGet from product data, then fallback to product name
        let packWeight = parseFloat(productData?.PackGet || 0);
        if (packWeight === 0 && productData?.Product_Name) {
            packWeight = extractPackWeight(productData.Product_Name);
        }

        if (productIndex !== -1) {
            updatedQuantities[productIndex][field] = value;

            // Calculate amount when bags or rate changes
            if (field === "Bill_Qty" || field === "Item_Rate") {
                const bags = parseFloat(updatedQuantities[productIndex].Bill_Qty) || 0;
                const rate = parseFloat(updatedQuantities[productIndex].Item_Rate) || parseFloat(productData?.Item_Rate) || 0;
                const totalWeight = bags * packWeight;
                updatedQuantities[productIndex].Amount = totalWeight * rate;
                updatedQuantities[productIndex].Total_Weight = totalWeight;
                updatedQuantities[productIndex].Pack_Weight = packWeight;
            }
        } else {
            const newQuantity = {
                Item_Id: productId,
                Bill_Qty: field === "Bill_Qty" ? value : "0",
                Item_Rate: field === "Item_Rate" ? value : (productData?.Item_Rate?.toString() || "0"),
                Pack_Weight: packWeight,
            };

            // Calculate initial amount
            const bags = parseFloat(newQuantity.Bill_Qty) || 0;
            const rate = parseFloat(newQuantity.Item_Rate) || 0;
            const totalWeight = bags * packWeight;
            newQuantity.Amount = totalWeight * rate;
            newQuantity.Total_Weight = totalWeight;

            updatedQuantities.push(newQuantity);
        }
        setNewProductQuantities(updatedQuantities);
    };

    const handleAddNewProducts = () => {
        const validNewProducts = newProductQuantities.filter(
            q => parseFloat(q.Bill_Qty) > 0,
        );

        if (validNewProducts.length === 0) {
            Alert.alert(
                "Error",
                "Please enter quantity for at least one product.",
            );
            return;
        }

        const newProducts = validNewProducts.map(newProd => {
            const productData = productQueryData.productData.find(
                p => p.Product_Id.toString() === newProd.Item_Id,
            );
            const qty = parseFloat(newProd.Bill_Qty) || 0;
            const rate =
                parseFloat(newProd.Item_Rate) ||
                parseFloat(productData?.Item_Rate) ||
                0;

            return {
                Item_Id: newProd.Item_Id,
                Product_Name: productData?.Product_Name || "Unknown Product",
                Bill_Qty: qty.toString(),
                Item_Rate: rate.toString(),
                Amount: qty * rate,
                isExisting: false,
            };
        });

        const updatedProducts = [...editableProducts, ...newProducts];
        setEditableProducts(updatedProducts);
        calculateTotal(updatedProducts);

        setNewProductQuantities([]);
        setShowAddProducts(false);
        setSelectedBrand(null);
    };

    const handleSubmit = async () => {
        if (editableProducts.length <= 0) {
            Alert.alert("Error", "Please add at least one product.");
            return;
        }

        const orderProducts = editableProducts
            .filter(p => parseFloat(p.Bill_Qty) > 0)
            .map(p => {
                // Get the product data to access PackGet
                const productData = productQueryData.productData.find(
                    prod => prod.Product_Id.toString() === p.Item_Id
                );
                const packWeight = parseFloat(productData?.PackGet || 0);
                const bags = parseFloat(p.Bill_Qty) || 0;
                const totalWeight = bags * packWeight;

                return {
                    Item_Id: p.Item_Id,
                    Bill_Qty: totalWeight, // Send total weight instead of bag count
                    Item_Rate: p.Item_Rate,
                    Bag_Count: bags, // Optional: send bag count separately
                    Pack_Weight: packWeight, // Optional: send pack weight
                };
            });

        if (orderProducts.length <= 0) {
            Alert.alert("Error", "Enter at least one product quantity.");
            return;
        }

        const orderDetails = {
            ...stockInputValue,
            Product_Array: orderProducts,
        };

        try {
            const response = await fetch(`${API.saleOrder()}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderDetails),
            });

            const data = await response.json();

            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                setModalVisible(false);
                navigation.navigate("HomeScreen");
            } else {
                Alert.alert("Error", data.message);
            }
        } catch (err) {
            Alert.alert("Error", "Failed to update order");
        }
    };

    const handlePreview = () => {
        setModalVisible(true);
    };

    const renderProductRow = (product, index) => {
        // Get pack weight with multiple fallbacks
        let packWeight = product.Pack_Weight || 0;

        if (packWeight === 0) {
            const masterProduct = productQueryData.productData.find(
                p => p.Product_Id.toString() === product.Item_Id
            );

            if (masterProduct?.PackGet) {
                packWeight = parseFloat(masterProduct.PackGet);
            } else {
                packWeight = extractPackWeight(product.Product_Name);
            }
        }

        const bags = parseFloat(product.Bill_Qty) || 0;
        const rate = parseFloat(product.Item_Rate) || 0;
        const totalWeight = bags * packWeight;
        const totalAmount = totalWeight * rate;

        return (
            <View key={index} style={styles.productRow}>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.Product_Short_Name || product.Product_Name}
                    </Text>

                    <View style={styles.productMetaRow}>
                        <Text style={styles.productPackInfo}>
                            Pack: {packWeight} kg/bag
                        </Text>
                        {product.Original_Bill_Qty && (
                            <Text style={styles.originalQtyInfo}>
                                Original: {product.Original_Bill_Qty} kg
                            </Text>
                        )}
                    </View>

                    {bags > 0 && (
                        <View style={styles.calculationInfo}>
                            <Text style={styles.calculationText}>
                                {bags} bags × {packWeight} kg = {totalWeight.toFixed(2)} kg
                            </Text>
                            <Text style={styles.calculationText}>
                                {totalWeight.toFixed(2)} kg × ₹{rate} = ₹{totalAmount.toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Bags</Text>
                        <TextInput
                            style={styles.quantityInput}
                            value={product.Bill_Qty}
                            onChangeText={text =>
                                handleProductUpdate(index, "Bill_Qty", text)
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Rate per kg</Text>
                        <TextInput
                            style={styles.rateInput}
                            value={product.Item_Rate}
                            onChangeText={text =>
                                handleProductUpdate(index, "Item_Rate", text)
                            }
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                        />
                    </View>

                    <View style={styles.amountContainer}>
                        <Text style={styles.inputLabel}>Total Amount</Text>
                        <Text style={styles.amountText}>
                            ₹{totalAmount.toFixed(2)}
                        </Text>
                        {totalWeight > 0 && (
                            <Text style={styles.weightText}>
                                ({totalWeight.toFixed(2)} kg)
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveProduct(index)}>
                        <Icon
                            name="delete"
                            size={20}
                            color={customColors.error}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Edit Order"
                navigation={navigation}
                showRightIcon={true}
                rightIconName="update"
                rightIconLibrary="MaterialCommunityIcons"
                onRightPress={handlePreview}
            />

            <View style={styles.contentContainer}>
                <View style={styles.retailerDropdownContainer}>
                    <EnhancedDropdown
                        data={fetchRetailerName}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Retailer"
                        value={selectedRetailer.toString()}
                        onChange={handleRetailerChange}
                        containerStyle={styles.retailerDropdown}
                    />
                </View>

                <View style={styles.headerSection}>
                    <TouchableOpacity
                        style={[styles.addButton, showFilter && { opacity: 1 }]}
                        onPress={() => setShowFilter(!showFilter)}
                    >
                        <Icon name="filter-list" size={20} color={customColors.white} />
                        <Text style={styles.addButtonText}>Filters</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.addButton, showAddProducts && { opacity: 0.6 }]}
                        onPress={() => setShowAddProducts(!showAddProducts)}
                        disabled={showAddProducts}
                    >
                        <Icon name="add" size={20} color={customColors.white} />
                        <Text style={styles.addButtonText}>Add Products</Text>
                    </TouchableOpacity>
                </View>

                {showFilter && (
                    <View style={styles.expandableFilters}>
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

                <ScrollView style={styles.productsContainer}>
                    {/* Existing Products */}
                    {!showAddProducts && (<>
                        <Text style={styles.sectionTitle}>Order Items ({editableProducts.length})</Text>
                        {editableProducts.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
                                    Loading order items...
                                </Text>
                            </View>
                        ) : (
                            editableProducts.map((product, index) => renderProductRow(product, index))
                        )}
                    </>
                    )}

                    {/* Add New Products Section - SM TRADERS Specific */}
                    {showAddProducts && (
                        <View style={styles.addProductsSection}>
                            <View style={styles.addProductsHeader}>
                                <Text style={styles.addProductsSectionTitle}>
                                    Add New Products
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeAddButton}
                                    onPress={handleCloseAddProducts}>
                                    <Icon
                                        name="close"
                                        size={20}
                                        color={customColors.grey600}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* SM TRADERS: Single Brand Dropdown */}
                            <View style={styles.smTradersContainer}>

                                <View style={styles.smTradersBrandContainer}>
                                    <EnhancedDropdown
                                        data={transformedBranchData}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Select Brand"
                                        value={selectedBrand}
                                        onChange={handleBrandSelection}
                                        containerStyle={styles.dropdown}
                                        searchPlaceholder="Search brands..."
                                    />
                                </View>

                                {selectedBrand && (
                                    <View style={styles.brandInfoContainer}>
                                        <Text style={styles.productCountText}>
                                            ({filteredProducts.length} products available)
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Products List - Only show when brand is selected */}
                            {selectedBrand && filteredProducts.length > 0 && (
                                <View style={styles.productsListContainer}>
                                    <View style={styles.addProductsActions}>
                                        <TouchableOpacity
                                            style={styles.cancelAddButton}
                                            onPress={handleCloseAddProducts}>
                                            <Text style={styles.cancelAddButtonText}>
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.confirmAddButton}
                                            onPress={handleAddNewProducts}>
                                            <Text style={styles.confirmAddButtonText}>
                                                Add Selected
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {filteredProducts.map((product, index) => {
                                        const existingQuantity = newProductQuantities.find(
                                            q => q.Item_Id === product.Product_Id.toString(),
                                        );

                                        // First try to get PackGet from product data, then fallback to product name
                                        let packWeight = parseFloat(product.PackGet || 0);
                                        if (packWeight === 0) {
                                            packWeight = extractPackWeight(product.Product_Name);
                                        }

                                        const bags = parseFloat(existingQuantity?.Bill_Qty || 0);
                                        const rate = parseFloat(existingQuantity?.Item_Rate || product.Item_Rate || 0);
                                        const totalWeight = bags * packWeight;
                                        const totalAmount = totalWeight * rate;

                                        return (
                                            <View key={index} style={styles.productRow}>
                                                <View style={styles.productInfo}>
                                                    <Text style={styles.productName} numberOfLines={2}>
                                                        {product.Short_Name || product.Product_Name}
                                                    </Text>
                                                    <Text style={styles.productDetails}>
                                                        <Text>{packWeight} {product.Units || 'kg'} per bag • Base: ₹{product.Item_Rate}</Text>
                                                        <Text style={styles.productSeparator}> • </Text>
                                                        <Text style={{ color: customColors.success }}>Stock: {product.CL_Qty}</Text>
                                                    </Text>

                                                    {/* Show calculation for new products */}
                                                    {/* {bags > 0 && (
                                                        <View style={styles.calculationBreakdown}>
                                                            <Text style={styles.calculationText}>
                                                                {bags} bags × {packWeight} kg = {totalWeight.toFixed(2)} kg
                                                            </Text>
                                                            <Text style={styles.calculationText}>
                                                                {totalWeight.toFixed(2)} kg × ₹{rate.toFixed(2)} = ₹{totalAmount.toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    )} */}
                                                </View>

                                                {/* Rest of the input section remains the same */}
                                                <View style={styles.inputGroup}>
                                                    <View style={styles.inputContainer}>
                                                        <Text style={styles.inputLabel}>Bags</Text>
                                                        <TextInput
                                                            style={styles.quantityInput}
                                                            value={existingQuantity?.Bill_Qty || ""}
                                                            onChangeText={text =>
                                                                handleNewProductQuantityChange(
                                                                    product.Product_Id.toString(),
                                                                    "Bill_Qty",
                                                                    text,
                                                                )
                                                            }
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                        />
                                                    </View>

                                                    <View style={styles.inputContainer}>
                                                        <Text style={styles.inputLabel}>Rate per kg</Text>
                                                        <TextInput
                                                            style={styles.rateInput}
                                                            value={
                                                                existingQuantity?.Item_Rate ||
                                                                product.Item_Rate.toString()
                                                            }
                                                            onChangeText={text =>
                                                                handleNewProductQuantityChange(
                                                                    product.Product_Id.toString(),
                                                                    "Item_Rate",
                                                                    text,
                                                                )
                                                            }
                                                            keyboardType="decimal-pad"
                                                            placeholder="0.00"
                                                        />
                                                    </View>

                                                    {totalAmount > 0 && (
                                                        <View style={styles.amountContainer}>
                                                            <Text style={styles.inputLabel}>Amount</Text>
                                                            <Text style={styles.amountText}>
                                                                ₹{totalAmount.toFixed(2)}
                                                            </Text>
                                                            <Text style={styles.weightText}>
                                                                ({totalWeight.toFixed(2)} kg)
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* No Products Messages */}
                            {selectedBrand && filteredProducts.length === 0 && (
                                <View style={styles.noProductsContainer}>
                                    <Text style={styles.noProductsText}>
                                        No active products available for the selected brand.
                                    </Text>
                                </View>
                            )}

                            {!selectedBrand && (
                                <View style={styles.noProductsContainer}>
                                    <Text style={styles.noProductsText}>
                                        Please select a brand to view active products.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                <View style={styles.footerSection}>
                    <Text style={styles.totalText}>
                        Total: ₹{total.toFixed(2)}
                    </Text>
                </View>

                {/* Modal remains the same... */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Order Summary</Text>
                            <Text style={styles.modalRetailerName}>
                                {stockInputValue.Retailer_Name}
                            </Text>

                            <ScrollView style={styles.modalProductsList}>
                                {editableProducts
                                    .filter(p => parseFloat(p.Bill_Qty) > 0)
                                    .map((product, index) => {
                                        // Get the product data to access PackGet
                                        const productData = productQueryData.productData.find(
                                            p => p.Product_Id.toString() === product.Item_Id
                                        );

                                        // First try to get PackGet from product data, then fallback to product name
                                        let packWeight = parseFloat(productData?.PackGet || 0);
                                        if (packWeight === 0 && productData?.Product_Name) {
                                            packWeight = extractPackWeight(productData.Product_Name);
                                        }

                                        const bags = parseFloat(product.Bill_Qty);
                                        const rate = parseFloat(product.Item_Rate);
                                        const totalWeight = bags * packWeight;
                                        const amount = totalWeight * rate;

                                        return (
                                            <View key={index} style={styles.modalProductRow}>
                                                <View style={styles.modalProductInfo}>
                                                    <Text style={styles.modalProductName} numberOfLines={2}>
                                                        {product.Product_Name}
                                                    </Text>
                                                    <Text style={styles.modalProductCalc}>
                                                        {bags} bags × {packWeight}kg = {totalWeight.toFixed(2)}kg
                                                    </Text>
                                                </View>
                                                <Text style={styles.modalProductRate}>
                                                    ₹{rate.toFixed(2)}/kg
                                                </Text>
                                                <Text style={styles.modalProductAmount}>
                                                    ₹{amount.toFixed(2)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                            </ScrollView>

                            <View style={styles.modalTotal}>
                                <Text style={styles.modalTotalText}>
                                    Total: ₹{total.toFixed(2)}
                                </Text>
                            </View>

                            <TextInput
                                style={styles.narrationInput}
                                placeholder="Narration (Optional)"
                                value={stockInputValue.Narration}
                                onChangeText={text =>
                                    setStockInputValue({
                                        ...stockInputValue,
                                        Narration: text,
                                    })
                                }
                                multiline
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalSubmitButton}
                                    onPress={handleSubmit}>
                                    <Text style={styles.modalSubmitText}>
                                        Update Order
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

export default PosEditOrder;

// Add these new styles to your existing StyleSheet:
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    retailerDropdownContainer: {
        padding: 16,
        paddingBottom: 0,
    },
    retailerDropdown: {
        marginBottom: 0,
    },
    headerSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    addButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    expandableFilters: {
        // marginTop: 6,
    },
    additionalFiltersRow: {
        flexDirection: "column",
        marginHorizontal: 16,
    },
    fullWidthFilter: {
        width: "100%",
    },
    productsContainer: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        ...typography.subtitle1(),
        fontWeight: "bold",
        marginBottom: 12,
        color: customColors.grey800,
    },
    productRow: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productInfo: {
        marginBottom: 12,
    },
    productName: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey900,
    },
    productMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    calculationInfo: {
        backgroundColor: customColors.primary + "10",
        borderRadius: 4,
        padding: 6,
        marginTop: 6,
        borderLeftWidth: 2,
        borderLeftColor: customColors.primary,
    },
    emptyStateContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        ...typography.body1(),
        color: customColors.grey600,
        fontStyle: 'italic',
    },
    inputGroup: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
    },
    inputContainer: {
        flex: 1,
    },
    inputLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        marginBottom: 4,
        fontWeight: "500",
    },
    quantityInput: {
        ...typography.body2(),
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        padding: 8,
        backgroundColor: customColors.white,
        textAlign: "center",
    },
    rateInput: {
        ...typography.body2(),
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        padding: 8,
        backgroundColor: customColors.white,
        textAlign: "right",
    },
    amountContainer: {
        flex: 1,
        alignItems: "flex-end",
    },
    amountText: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.primary,
        paddingVertical: 8,
    },
    removeButton: {
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    addProductsSection: {
        marginTop: 24,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 2,
        borderTopColor: customColors.primary,
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginHorizontal: 8,
        elevation: 4, // Android shadow
        shadowColor: customColors.primary, // iOS shadow
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: customColors.primary + "20", // 20% opacity
    },
    addProductsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    addProductsSectionTitle: {
        ...typography.subtitle1(),
        fontWeight: "bold",
        color: customColors.primary,
        marginBottom: 0,
    },
    dropdownsContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    dropdown: {
        flex: 1,
    },
    addProductsActions: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    cancelAddButton: {
        flex: 1,
        backgroundColor: customColors.grey200,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelAddButtonText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    confirmAddButton: {
        flex: 1,
        backgroundColor: customColors.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    confirmAddButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    footerSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.grey50,
    },
    totalText: {
        ...typography.h6(),
        fontWeight: "bold",
        textAlign: "right",
        color: customColors.primary,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        width: "100%",
        maxHeight: "90%",
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        ...typography.h5(),
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    modalRetailerName: {
        ...typography.body1(),
        textAlign: "center",
        marginBottom: 16,
        color: customColors.grey700,
    },
    modalProductsList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    modalProductRow: {
        flexDirection: "row",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    modalProductInfo: {
        flex: 2,
        marginRight: 8,
    },
    modalProductName: {
        ...typography.body2(),
        flex: 2,
        marginRight: 8,
    },
    modalProductCalc: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: 4,
    },
    modalProductRate: {
        ...typography.body2(),
        flex: 0.8,
        textAlign: "right",
    },
    modalProductAmount: {
        ...typography.body2(),
        flex: 0.8,
        textAlign: "right",
        fontWeight: "600",
    },
    modalTotal: {
        paddingVertical: 12,
        borderTopWidth: 2,
        borderTopColor: customColors.grey300,
    },
    modalTotalText: {
        ...typography.h6(),
        fontWeight: "bold",
        textAlign: "right",
        color: customColors.primary,
    },
    narrationInput: {
        ...typography.body2(),
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        minHeight: 60,
        textAlignVertical: "top",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: customColors.grey200,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    modalCancelText: {
        ...typography.body1(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    modalSubmitButton: {
        flex: 1,
        backgroundColor: customColors.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    modalSubmitText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    closeAddButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: customColors.grey100,
    },
    productsListContainer: {
        marginTop: 4,
    },
    productDetails: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: 2,
    },
    noProductsContainer: {
        padding: 20,
        alignItems: "center",
    },
    noProductsText: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        fontStyle: "italic",
    },
    smTradersContainer: {
        marginBottom: 16,
    },
    smTradersBrandContainer: {
        marginBottom: 12,
    },
    brandInfoContainer: {
        backgroundColor: customColors.primary + "10",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderLeftWidth: 3,
        borderLeftColor: customColors.primary,
    },
    productCountText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    productSeparator: {
        color: customColors.grey400,
    },
    calculationBreakdown: {
        backgroundColor: customColors.grey100,
        borderRadius: 4,
        padding: 6,
        marginTop: 4,
    },
    calculationText: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productPackInfo: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "500",
        marginTop: 4,
    },
    originalQtyInfo: {
        ...typography.caption(),
        color: customColors.grey500,
        fontStyle: "italic",
    },
    weightText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: 4,
        fontWeight: "500",
    },
})