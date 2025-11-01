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
import React, { useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { API } from "../../Config/Endpoint";
import { fetchCostCenter, fetchProducts } from "../../Api/product";
import { fetchRetailersName } from "../../Api/retailers";
import { customColors, typography } from "../../Config/helper";

const EditSaleOrder = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;

    const initialStockValue = {
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
    };

    const [uID, setUID] = useState();
    const [companyName, setCompanyName] = useState("");
    const [stockInputValue, setStockInputValue] = useState(initialStockValue);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedBrokerId, setSelectedBrokerId] = useState(null);
    const [selectedTransportId, setSelectedTransportId] = useState(null);
    const [editableProducts, setEditableProducts] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [showAddProducts, setShowAddProducts] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedRetailer, setSelectedRetailer] = useState(item.Retailer_Id);

    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedProductGroup, setSelectedProductGroup] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [newProductQuantities, setNewProductQuantities] = useState([]);

    useEffect(() => {
        const initialize = async () => {
            try {
                const userId = await AsyncStorage.getItem("Company_Id");
                setUID(userId);

                if (item.Products_List && item.Products_List.length > 0) {
                    const initialEditableProducts = item.Products_List.map(
                        product => ({
                            Item_Id: product.Item_Id.toString(),
                            Product_Name: product.Product_Name,
                            Bill_Qty: product.Bill_Qty.toString(),
                            Item_Rate: product.Item_Rate.toString(),
                            Amount: product.Amount,
                            isExisting: true,
                        }),
                    );
                    setEditableProducts(initialEditableProducts);
                    calculateTotal(initialEditableProducts);
                }
            } catch (err) {
                console.log(err);
            }
        };

        initialize();
    }, [item.Products_List]);

    useEffect(() => {
        // Initialize broker and transport from Staff_Involved_List
        if (item?.Staff_Involved_List && item.Staff_Involved_List.length > 0) {
            // Find broker from Staff_Involved_List
            const brokerFromList = item.Staff_Involved_List.find(
                staff => staff.EmpType === "Broker" || staff.Cost_Center_Type_Id === 3
            );

            // Find transport from Staff_Involved_List
            const transportFromList = item.Staff_Involved_List.find(
                staff => staff.EmpType === "Transport" || staff.Cost_Center_Type_Id === 2
            );

            if (brokerFromList) {
                // Convert to string for dropdown value
                setSelectedBrokerId(String(brokerFromList.Involved_Emp_Id));
            }

            if (transportFromList) {
                // Convert to string for dropdown value
                setSelectedTransportId(String(transportFromList.Involved_Emp_Id));
            }
        }
    }, [item?.Staff_Involved_List]);

    const {
        data: productQueryData = {
            productData: [],
            brandData: [],
            productGroupData: [],
        },
    } = useQuery({
        queryKey: ["product", uID],
        queryFn: () => fetchProducts(uID),
        enabled: !!uID,
        select: data => {
            if (!data)
                return {
                    productData: [],
                    brandData: [],
                    productGroupData: [],
                };

            // Get unique brands (filter out empty Brand_Name)
            const brands = Array.from(
                new Set(data.map(item => item.Brand_Name)),
            )
                .filter(brand => brand && brand.trim() !== "")
                .sort()
                .map(brand => ({
                    label: brand,
                    value: brand,
                }));

            // Get all product groups for reference (will be filtered later)
            const allProductGroups = Array.from(
                new Set(data.map(item => item.Pro_Group)),
            )
                .filter(group => group && group.trim() !== "")
                .sort()
                .map(group => ({
                    label: group,
                    value: group,
                }));

            return {
                productData: data || [],
                brandData: brands,
                productGroupData: allProductGroups,
            };
        },
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
                    So_Id: item.So_Id || "",
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
                    So_Id: item.So_Id || "",
                    Involved_Emp_Id: parseInt(selectedTransport.Cost_Center_Id),
                    EmpName: selectedTransport.Cost_Center_Name || "",
                    Cost_Center_Type_Id: selectedTransport.User_Type || 2,
                    EmpType: selectedTransport.UserTypeGet || "Transport"
                });
            }
        }

        setStockInputValue(prev => ({
            ...prev,
            Staff_Involved_List: staffInvolvedList
        }));
    }, [selectedBrokerId, selectedTransportId, brokersData, transportData, item.So_Id]);

    const handleRetailerChange = item => {
        setSelectedRetailer(item.value);

        // Update stockInputValue with new retailer details
        setStockInputValue(prev => ({
            ...prev,
            Retailer_Id: item.value,
            Retailer_Name: item.label,
        }));
    };

    const calculateTotal = products => {
        const newTotal = products.reduce((sum, product) => {
            const qty = parseFloat(product.Bill_Qty) || 0;
            const rate = parseFloat(product.Item_Rate) || 0;
            return sum + qty * rate;
        }, 0);
        setTotal(isNaN(newTotal) ? 0 : newTotal);
    };

    const handleProductUpdate = (index, field, value) => {
        const updatedProducts = [...editableProducts];
        updatedProducts[index] = {
            ...updatedProducts[index],
            [field]: value,
        };

        // Recalculate amount if qty or rate changed
        if (field === "Bill_Qty" || field === "Item_Rate") {
            const qty = parseFloat(updatedProducts[index].Bill_Qty) || 0;
            const rate = parseFloat(updatedProducts[index].Item_Rate) || 0;
            updatedProducts[index].Amount = qty * rate;
        }

        setEditableProducts(updatedProducts);
        calculateTotal(updatedProducts);
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

        if (productIndex !== -1) {
            updatedQuantities[productIndex][field] = value;
        } else {
            updatedQuantities.push({
                Item_Id: productId,
                Bill_Qty: field === "Bill_Qty" ? value : "0",
                Item_Rate: field === "Item_Rate" ? value : "0",
            });
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

        // Reset new product form
        setNewProductQuantities([]);
        setShowAddProducts(false);
        setSelectedBrand(null);
        setSelectedProductGroup(null);
    };

    // New state for filtered product groups based on selected brand
    const [filteredProductGroups, setFilteredProductGroups] = useState([]);

    // Function to get product groups for selected brand
    const getProductGroupsForBrand = brandName => {
        if (!brandName || !productQueryData.productData) return [];

        const groupsForBrand = Array.from(
            new Set(
                productQueryData.productData
                    .filter(product => product.Brand_Name === brandName)
                    .map(product => product.Pro_Group),
            ),
        )
            .filter(group => group && group.trim() !== "")
            .sort()
            .map(group => ({
                label: group,
                value: group,
            }));

        return groupsForBrand;
    };

    // Handle brand selection
    const handleBrandSelection = item => {
        setSelectedBrand(item.value);
        setSelectedProductGroup(null); // Reset product group
        setFilteredProducts([]); // Clear products
        setNewProductQuantities([]); // Clear quantities

        // Get product groups for this brand
        const groupsForBrand = getProductGroupsForBrand(item.value);
        setFilteredProductGroups(groupsForBrand);
    };

    // Handle product group selection
    const handleProductGroupSelection = item => {
        setSelectedProductGroup(item.value);
        setNewProductQuantities([]); // Clear quantities when changing group
    };

    // Update the useEffect for filtering products
    useEffect(() => {
        if (
            productQueryData?.productData &&
            showAddProducts &&
            selectedBrand &&
            selectedProductGroup
        ) {
            const existingProductIds = editableProducts.map(p => p.Item_Id);

            setFilteredProducts(
                productQueryData.productData.filter(product => {
                    const matchesBrand = product.Brand_Name === selectedBrand;
                    const matchesGroup =
                        product.Pro_Group === selectedProductGroup;
                    const notAlreadyAdded = !existingProductIds.includes(
                        product.Product_Id.toString(),
                    );

                    // const isActive = product.IsActive === 1; // Only show active products

                    return (
                        matchesBrand &&
                        matchesGroup &&
                        notAlreadyAdded
                        // && (isSMTraders ? isActive : true)
                    );
                }),
            );
        } else {
            setFilteredProducts([]);
        }
    }, [
        selectedBrand,
        selectedProductGroup,
        productQueryData?.productData,
        showAddProducts,
        editableProducts,
    ]);

    // Reset states when closing add products section
    const handleCloseAddProducts = () => {
        setShowAddProducts(false);
        setSelectedBrand(null);
        setSelectedProductGroup(null);
        setFilteredProductGroups([]);
        setFilteredProducts([]);
        setNewProductQuantities([]);
    };

    const handleSubmit = async () => {
        if (editableProducts.length <= 0) {
            Alert.alert("Error", "Please add at least one product.");
            return;
        }

        const orderProducts = editableProducts
            .filter(p => parseFloat(p.Bill_Qty) > 0)
            .map(p => ({
                Item_Id: p.Item_Id,
                Bill_Qty: p.Bill_Qty,
                Item_Rate: p.Item_Rate,
            }));

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
            // console.log(err);
            Alert.alert("Error", "Failed to update order");
        }
    };

    const handlePreview = () => {
        setModalVisible(true);
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

                    {!showAddProducts && (
                        <>
                            <Text style={styles.sectionTitle}>Order Items</Text>
                            {editableProducts.map((product, index) => (
                                <View key={index} style={styles.productRow}>
                                    <View style={styles.productInfo}>
                                        <Text
                                            style={styles.productName}
                                            numberOfLines={2}>
                                            {product.Product_Name}
                                        </Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>Qty</Text>
                                            <TextInput
                                                style={styles.quantityInput}
                                                value={product.Bill_Qty}
                                                onChangeText={text =>
                                                    handleProductUpdate(
                                                        index,
                                                        "Bill_Qty",
                                                        text,
                                                    )
                                                }
                                                keyboardType="numeric"
                                                placeholder="0"
                                            />
                                        </View>

                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>Rate</Text>
                                            <TextInput
                                                style={styles.rateInput}
                                                value={product.Item_Rate}
                                                onChangeText={text =>
                                                    handleProductUpdate(
                                                        index,
                                                        "Item_Rate",
                                                        text,
                                                    )
                                                }
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                            />
                                        </View>

                                        <View style={styles.amountContainer}>
                                            <Text style={styles.inputLabel}>
                                                Amount
                                            </Text>
                                            <Text style={styles.amountText}>
                                                ₹
                                                {(
                                                    (parseFloat(product.Bill_Qty) ||
                                                        0) *
                                                    (parseFloat(product.Item_Rate) || 0)
                                                ).toFixed(2)}
                                            </Text>
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
                            ))}
                        </>
                    )}

                    {/* Add New Products Section */}
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

                            <View style={styles.dropdownsContainer}>
                                {/* Brand Dropdown */}
                                <EnhancedDropdown
                                    data={productQueryData.brandData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Brand"
                                    value={selectedBrand}
                                    onChange={handleBrandSelection}
                                    containerStyle={styles.dropdown}
                                />

                                {/* Product Group Dropdown - Disabled until brand is selected */}
                                <EnhancedDropdown
                                    data={filteredProductGroups}
                                    labelField="label"
                                    valueField="value"
                                    placeholder={
                                        selectedBrand
                                            ? "Select Group"
                                            : "Brand First"
                                    }
                                    value={selectedProductGroup}
                                    onChange={handleProductGroupSelection}
                                    containerStyle={styles.dropdown}
                                    disable={!selectedBrand}
                                />
                            </View>

                            {/* Products List */}
                            {filteredProducts.length > 0 && (
                                <View style={styles.productsListContainer}>
                                    {/* Action Buttons */}
                                    {filteredProducts.length > 0 && (
                                        <View style={styles.addProductsActions}>
                                            <TouchableOpacity
                                                style={styles.cancelAddButton}
                                                onPress={handleCloseAddProducts}>
                                                <Text
                                                    style={styles.cancelAddButtonText}>
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.confirmAddButton}
                                                onPress={handleAddNewProducts}>
                                                <Text
                                                    style={styles.confirmAddButtonText}>
                                                    Add Selected
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <Text style={styles.productsListTitle}>
                                        Available Products (
                                        {filteredProducts.length})
                                    </Text>

                                    {filteredProducts.map((product, index) => {
                                        const existingQuantity =
                                            newProductQuantities.find(
                                                q =>
                                                    q.Item_Id ===
                                                    product.Product_Id.toString(),
                                            );

                                        return (
                                            <View
                                                key={index}
                                                style={styles.productRow}>
                                                <View
                                                    style={styles.productInfo}>
                                                    <Text
                                                        style={
                                                            styles.productName
                                                        }
                                                        numberOfLines={2}>
                                                        {product.Product_Name}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.productDetails
                                                        }>
                                                        {product.Units} •{" "}₹
                                                        {product.Item_Rate}
                                                    </Text>
                                                </View>

                                                <View style={styles.inputGroup}>
                                                    <View
                                                        style={
                                                            styles.inputContainer
                                                        }>
                                                        <Text
                                                            style={
                                                                styles.inputLabel
                                                            }>
                                                            Qty
                                                        </Text>
                                                        <TextInput
                                                            style={
                                                                styles.quantityInput
                                                            }
                                                            value={
                                                                existingQuantity?.Bill_Qty ||
                                                                ""
                                                            }
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

                                                    <View
                                                        style={
                                                            styles.inputContainer
                                                        }>
                                                        <Text
                                                            style={
                                                                styles.inputLabel
                                                            }>
                                                            Rate
                                                        </Text>
                                                        <TextInput
                                                            style={
                                                                styles.rateInput
                                                            }
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
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* No Products Message */}
                            {selectedBrand &&
                                selectedProductGroup &&
                                filteredProducts.length === 0 && (
                                    <View style={styles.noProductsContainer}>
                                        <Text style={styles.noProductsText}>
                                            No products available for the
                                            selected brand and group.
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

                {/* Preview Modal */}
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
                                        const qty = parseFloat(
                                            product.Bill_Qty,
                                        );
                                        const rate = parseFloat(
                                            product.Item_Rate,
                                        );
                                        const amount = qty * rate;

                                        return (
                                            <View
                                                key={index}
                                                style={styles.modalProductRow}>
                                                <Text
                                                    style={
                                                        styles.modalProductName
                                                    }
                                                    numberOfLines={2}>
                                                    {product.Product_Name}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.modalProductQty
                                                    }>
                                                    {qty}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.modalProductRate
                                                    }>
                                                    ₹{rate.toFixed(2)}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.modalProductAmount
                                                    }>
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

export default EditSaleOrder;

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
        marginTop: 16,
        marginBottom: 24,
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
    modalProductName: {
        ...typography.body2(),
        flex: 2,
        marginRight: 8,
    },
    modalProductQty: {
        ...typography.body2(),
        flex: 0.5,
        textAlign: "center",
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
        marginTop: 8,
    },
    productsListTitle: {
        ...typography.subtitle2(),
        fontWeight: "600",
        color: customColors.grey800,
        marginBottom: 12,
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
});
