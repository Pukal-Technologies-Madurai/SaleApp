import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, SafeAreaView, TextInput, Modal, Alert } from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";

const Sales = ({ route, navigation }) => {
    const { Contact_Mobile, Reatailer_Name, Contact_Person } = route.params;

    const [productData, setProductData] = useState([]);
    const [allPacksData, setAllPacksData] = useState([]);
    const [brandData, setBrandData] = useState([]);
    const [packData, setPackData] = useState([]);
    const [proGroupData, setProGroupData] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedPack, setSelectedPack] = useState(null);
    const [orderQuantities, setOrderQuantities] = useState({});
    const [selectedGroup, setSelectedGroup] = useState(null);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [orderSummary, setOrderSummary] = useState([]);
    const [totalOrderValue, setTotalOrderValue] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                if (companyId) {
                    await fetchProducts(companyId);
                    await fetchAllPacks(companyId);
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    const fetchProducts = async (id) => {
        try {
            console.log(products)
            console.log(`${API.products}${id}`)
            const response = await fetch(`${API.products}${id}`);
            const jsonData = await response.json();

            if (jsonData.success) {
                setProductData(jsonData.data);
                // Extract unique brands
                const brands = Array.from(new Set(jsonData.data.map(item => item.Brand_Name)))
                    .map(brand => ({ label: brand, value: brand }));

                setBrandData(brands);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    const fetchAllPacks = async (id) => {
        try {
            const response = await fetch(`${API.productPacks}${id}`);
            const jsonData = await response.json();

            if (jsonData.success) {
                setAllPacksData(jsonData.data); // Store all packs for filtering later
            }
        } catch (err) {
            console.error("Error fetching product packs:", err);
        }
    };

    useEffect(() => {
        if (selectedBrand) {
            const filteredProducts = productData.filter(product => product.Brand_Name === selectedBrand);
            const uniquePackIds = Array.from(new Set(filteredProducts.map(product => product.Pack_Id)));
            const filteredPacks = allPacksData
                .filter(pack => uniquePackIds.includes(pack.Pack_Id))
                .map(pack => ({ label: pack.Pack, value: pack.Pack_Id }));

            setPackData(filteredPacks);
            setSelectedPack(null);
            setSelectedGroup(null);
            setProGroupData([]);
        } else {
            setPackData([]);
            setSelectedPack(null);
            setSelectedGroup(null);
            setProGroupData([]);
        }
    }, [selectedBrand, allPacksData, productData]);

    useEffect(() => {
        if (selectedBrand && selectedPack) {
            const filteredProducts = productData.filter(
                product => product.Brand_Name === selectedBrand && product.Pack_Id === selectedPack
            );
            const uniqueGroups = Array.from(new Set(filteredProducts.map(product => product.Pro_Group)));
            const groupOptions = uniqueGroups.map(group => ({ label: group, value: group }));

            setProGroupData(groupOptions);
            setSelectedGroup(null);
        } else {
            setProGroupData([]);
            setSelectedGroup(null);
        }
    }, [selectedBrand, selectedPack, productData]);

    const filteredProductData = useMemo(() => {
        return productData.filter((product) => {
            const matchesBrand = selectedBrand ? product.Brand_Name === selectedBrand : true;
            const matchesPack = selectedPack ? product.Pack_Id === selectedPack : true;
            const matchesGroup = selectedGroup ? product.Pro_Group === selectedGroup : true;
            return matchesBrand && matchesPack && matchesGroup;
        });
    }, [productData, selectedBrand, selectedPack, selectedGroup]);

    const handleQuantityChange = (productId, quantity) => {
        const newQuantity = Math.max(0, parseInt(quantity) || 0);
        setOrderQuantities(prev => ({
            ...prev,
            [productId]: newQuantity.toString()
        }));
    };

    const handleIncrementQuantity = (productId) => {
        const currentQuantity = parseInt(orderQuantities[productId] || "0");
        handleQuantityChange(productId, (currentQuantity + 1).toString());
    };

    const handleDecrementQuantity = (productId) => {
        const currentQuantity = parseInt(orderQuantities[productId] || "0");
        handleQuantityChange(productId, (Math.max(0, currentQuantity - 1)).toString());
    };

    const calculateOrderSummary = () => {
        const summary = filteredProductData
            .filter(product => orderQuantities[product.Product_Id] && orderQuantities[product.Product_Id] !== "0")
            .map(product => ({
                Product_Id: product.Product_Id,
                productName: product.Product_Name.trim(),
                quantity: parseInt(orderQuantities[product.Product_Id]),
                price: product.Item_Rate,
                total: parseInt(orderQuantities[product.Product_Id]) * product.Item_Rate
            }));

        const total = summary.reduce((acc, item) => acc + item.total, 0);

        setOrderSummary(summary);
        setTotalOrderValue(total);
        setIsModalVisible(true);
    };

    const saveOrderToDatabase = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const Sales_Person_Id = userId;
            const Created_by = userId;
            const Retailer_Id = 0;

            const Product_Array = orderSummary.map(item => ({
                Item_Id: item.Product_Id,
                Bill_Qty: item.quantity,
                Item_Rate: item.price,
            }));

            const orderData = {
                Retailer_Id,
                Sales_Person_Id,
                Created_by,
                Product_Array,
                Customer_Name: Reatailer_Name,
                Cust_Mobile: Contact_Mobile,
                Delivery_Address1: Contact_Person,
                Delivery_Address2: Contact_Person,
                Delivery_Address3: Contact_Person,
                City: "MDU",
                D_State: "TN",
                D_Pincode: 632001,
                D_Country: "IN",
                withoutRetailerID: true
            };

            console.log("Sending order data:", JSON.stringify(orderData, null, 2));

            const response = await fetch(`${API.saleOrder}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderData),
            });

            const result = await response.json();

            if (result.success) {
                Alert.alert("Success", "Order saved successfully!");
                setIsModalVisible(false);
                setOrderQuantities({});
            } else {
                Alert.alert("Error", `Failed to save order: ${result.message}`);
            }
        } catch (error) {
            console.error("Error saving order:", error);
            Alert.alert("Error", "An error occurred while saving the order.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.heading}>Sales Dashboard</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.label}>
                    Retailer Name: <Text style={styles.value}>{Reatailer_Name}</Text>
                </Text>

                <Text style={styles.label}>
                    Contact Person: <Text style={styles.value}>{Contact_Person || "N/A"}</Text>
                </Text>

                <Text style={styles.label}>
                    Contact Mobile: <Text style={styles.value}>{Contact_Mobile || "N/A"}</Text>
                </Text>

                <View style={styles.filterSection}>
                    <Text style={styles.label}>Select Brand</Text>
                    <Dropdown
                        style={styles.dropdown}
                        data={brandData}
                        labelField="label"
                        valueField="value"
                        placeholder="Choose a brand"
                        value={selectedBrand}
                        search
                        onChange={(item) => setSelectedBrand(item.value)}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                    />

                    <Text style={styles.label}>Select Pack</Text>
                    <Dropdown
                        style={styles.dropdown}
                        data={packData}
                        labelField="label"
                        valueField="value"
                        placeholder="Choose a pack"
                        value={selectedPack}
                        search
                        onChange={(item) => setSelectedPack(item.value)}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        disabled={!selectedBrand}
                    />

                    <Text style={styles.label}>Select Product Group</Text>
                    <Dropdown
                        style={styles.dropdown}
                        data={proGroupData}
                        labelField="label"
                        valueField="value"
                        placeholder="Choose a product group"
                        value={selectedGroup}
                        search
                        onChange={(item) => setSelectedGroup(item.value)}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        disabled={!selectedPack}
                    />
                </View>

                {selectedBrand && selectedPack && selectedGroup && (
                    <View style={styles.productSection}>
                        <View style={styles.productGrid}>
                            {filteredProductData.map((product, idx) => (
                                <View key={idx} style={styles.productCard}>
                                    <Image
                                        source={{ uri: product.productImageUrl || "https://via.placeholder.com/100" }}
                                        style={styles.productImage}
                                    />
                                    <Text style={styles.productName}>{product.Product_Name.trim()}</Text>
                                    <Text style={styles.itemRate}>₹ {product.Item_Rate}</Text>
                                    <View style={styles.orderSection}>
                                        <TouchableOpacity
                                            style={styles.quantityButton}
                                            onPress={() => handleDecrementQuantity(product.Product_Id)}
                                        >
                                            <Text style={styles.quantityButtonText}>-</Text>
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.quantityInput}
                                            keyboardType="numeric"
                                            value={orderQuantities[product.Product_Id] || "0"}
                                            onChangeText={(text) => handleQuantityChange(product.Product_Id, text)}
                                        />
                                        <TouchableOpacity
                                            style={styles.quantityButton}
                                            onPress={() => handleIncrementQuantity(product.Product_Id)}
                                        >
                                            <Text style={styles.quantityButtonText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.summaryButton}
                            onPress={calculateOrderSummary}
                        >
                            <Text style={styles.summaryButtonText}>View Order Summary</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Order Summary</Text>
                        <ScrollView>
                            {orderSummary.map((item, index) => (
                                <View key={index} style={styles.summaryItem}>
                                    <Text style={styles.summaryItemName}>{item.productName}</Text>
                                    <Text style={styles.summaryItemDetails}>
                                        Qty: {item.quantity} x ₹{item.price} = ₹{item.total}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                        <Text style={styles.totalOrderValue}>Total Order Value: ₹{totalOrderValue}</Text>
                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={saveOrderToDatabase}
                            >
                                <Text style={styles.modalButtonText}>Confirm Order</Text>
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
        // backgroundColor: customColors.background,
    },
    header: {
        backgroundColor: customColors.primary,
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 4,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: customColors.white,
        textAlign: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    label: {
        fontSize: 18,
        marginBottom: 8,
    },
    value: {
        fontWeight: 'bold',
    },
    filterSection: {
        marginBottom: 20,
    },
    label: {
        ...typography.caption(),
        color: customColors.text,
        marginBottom: 8,
    },
    dropdown: {
        height: 50,
        borderColor: customColors.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: customColors.white,
    },
    dropdownContainer: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    placeholderStyle: {
        ...typography.body1(),
        color: customColors.textSecondary,
    },
    selectedTextStyle: {
        ...typography.body1(),
        color: customColors.text,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    productSection: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: customColors.surface,
    },
    activeTab: {
        backgroundColor: customColors.primary,
    },
    tabText: {
        ...typography.button(),
        color: customColors.textSecondary,
    },
    activeTabText: {
        color: customColors.white,
    },
    pagerView: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
    groupTitle: {
        ...typography.h5(),
        color: customColors.text,
        marginBottom: 16,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCard: {
        width: '48%',
        marginBottom: 16,
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 12,
        elevation: 2,
    },
    productImage: {
        width: "100%",
        resizeMode: "cover",
        aspectRatio: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    productName: {
        ...typography.caption(),
        color: customColors.text,
        marginBottom: 4,
    },
    itemRate: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: 'bold',
    },
    orderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: customColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonText: {
        color: customColors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    quantityInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        marginHorizontal: 8,
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: customColors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    addButtonText: {
        color: customColors.white,
        ...typography.button(),
    },


    summaryButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
    },
    summaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    summaryItem: {
        marginBottom: 10,
    },
    summaryItemName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryItemDetails: {
        fontSize: 14,
    },
    totalOrderValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 15,
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f44336',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
    },
});