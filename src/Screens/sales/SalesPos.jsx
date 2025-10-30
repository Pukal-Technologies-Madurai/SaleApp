import { StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, Alert, FlatList } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import { customColors, typography } from "../../Config/helper";
import { fetchRetailers } from "../../Api/retailers";
import { fetchCostCenter, fetchPosOrderBranch, fetchProductsWithStockValue } from "../../Api/product";
import EnhancedDropdown from "../../Components/EnhancedDropdown";

const SalesPos = () => {
    const navigation = useNavigation();
    const [companyId, setCompanyId] = useState(null);
    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [showFilter, setShowFilter] = useState(false);

    // Modal states
    const [showRetailerModal, setShowRetailerModal] = useState(false);
    const [showBrokerModal, setShowBrokerModal] = useState(false);
    const [showTransportModal, setShowTransportModal] = useState(false);
    const [showCartModal, setShowCartModal] = useState(false);

    // Selected values
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [selectedTransport, setSelectedTransport] = useState(null);

    const [orderItems, setOrderItems] = useState({});

    // Search states
    const [retailerSearch, setRetailerSearch] = useState("");
    const [brokerSearch, setBrokerSearch] = useState("");
    const [transportSearch, setTransportSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                setCompanyId(companyId);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        })();
    }, []);

    const { data: retailerData = [], isLoading: retailerLoading, isError: retailerError } = useQuery({
        queryKey: ["retailers", companyId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId,
    });

    const { data: rawCostCenters = [], isLoading: costCenterLoading, isError: costCenterError } = useQuery({
        queryKey: ["costCenters"],
        queryFn: fetchCostCenter,
    });

    const { data: productData = [], isLoading: isProductLoading, isError: isProductError } = useQuery({
        queryKey: ["masterDataProducts"],
        queryFn: fetchProductsWithStockValue,
    });

    const { data: productBranch = [], isLoading: isBranchLoading, isError: isBranchError } = useQuery({
        queryKey: ["posOrderBranch"],
        queryFn: fetchPosOrderBranch,
    });

    const addToCart = useCallback((product) => {
        setOrderItems(prev => ({
            ...prev,
            [product.Product_Id]: {
                ...product,
                qty: (prev[product.Product_Id]?.qty || 0) + 1,
                rate: product.Item_Rate || product.Product_Rate || 0
            }
        }));
    }, []);

    const removeFromCart = useCallback((productId) => {
        setOrderItems(prev => {
            const newItems = { ...prev };
            delete newItems[productId];
            return newItems;
        });
    }, []);

    const updateCartItemQuantity = useCallback((productId, newQty) => {
        if (newQty <= 0) {
            removeFromCart(productId);
        } else {
            setOrderItems(prev => ({
                ...prev,
                [productId]: {
                    ...prev[productId],
                    qty: parseFloat(newQty) || 0
                }
            }));
        }
    }, [removeFromCart]);

    const updateQuantityInput = useCallback((productId, value) => {
        if (value === "" || value === "0") {
            removeFromCart(productId);
        } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
                updateCartItemQuantity(productId, numValue);
            }
        }
    }, [removeFromCart, updateCartItemQuantity]);

    const handleProceedToOrder = () => {
        if (!selectedRetailer) {
            Alert.alert("Please select a retailer first");
            return;
        }

        navigation.navigate("PosOrder", {
            item: selectedRetailer,
            preSelectedItems: orderItems,
            selectedBroker,
            selectedTransport
        });
    };

    const filteredProducts = useMemo(() => {
        if (!productData.length) return [];

        let activeProducts = productData.filter(product => product.IsActive === 1);

        if (selectedBrandId) {
            activeProducts = activeProducts.filter(product => product.Pos_Brand_Id === selectedBrandId);
        }

        if (productSearch) {
            activeProducts = activeProducts.filter(product =>
                product.Product_Name.toLowerCase().includes(productSearch.toLowerCase()) ||
                product.Short_Name.toLowerCase().includes(productSearch.toLowerCase())
            );
        }

        return activeProducts;
    }, [productData, selectedBrandId, productSearch]);

    const { totalAmount, orderCount, totalBags, totalWeight } = useMemo(() => {
        const items = Object.values(orderItems).filter(item => item.qty > 0 && item.rate > 0);

        // Total amount calculation: qty × packWeight × rate
        const total = items.reduce((sum, item) => {
            const product = productData.find(p => p.Product_Id === item.Product_Id);
            const packWeight = parseFloat(product?.PackGet || 0);
            const totalItemWeight = item.qty * packWeight;
            const itemTotal = totalItemWeight * item.rate;
            return sum + itemTotal;
        }, 0);

        // Total bags = sum of all quantities
        const bags = items.reduce((sum, item) => sum + item.qty, 0);

        // Total weight = sum of (qty × packWeight)
        const weight = items.reduce((sum, item) => {
            const product = productData.find(p => p.Product_Id === item.Product_Id);
            const packWeight = parseFloat(product?.PackGet || 0);
            return sum + (item.qty * packWeight);
        }, 0);

        return { totalAmount: total, orderCount: items.length, totalBags: bags, totalWeight: weight };
    }, [orderItems, productData]);

    const { brokersData, transportData } = useMemo(() => {
        const Broker_User_Type = 3;
        const Transport_User_Type = 2;

        const broker = rawCostCenters.filter(item => item.User_Type === Broker_User_Type);
        const transport = rawCostCenters.filter(item => item.User_Type === Transport_User_Type);

        return { brokersData: broker, transportData: transport };
    }, [rawCostCenters]);

    // Filter functions
    const filteredRetailers = useMemo(() => {
        if (!retailerSearch) return retailerData;
        return retailerData.filter(retailer =>
            retailer.Retailer_Name.toLowerCase().includes(retailerSearch.toLowerCase()) ||
            retailer.Mobile_No.includes(retailerSearch)
        );
    }, [retailerData, retailerSearch]);

    const filteredBrokers = useMemo(() => {
        if (!brokerSearch) return brokersData;
        return brokersData.filter(broker =>
            broker.Cost_Center_Name.toLowerCase().includes(brokerSearch.toLowerCase())
        );
    }, [brokersData, brokerSearch]);

    const filteredTransports = useMemo(() => {
        if (!transportSearch) return transportData;
        return transportData.filter(transport =>
            transport.Cost_Center_Name.toLowerCase().includes(transportSearch.toLowerCase())
        );
    }, [transportData, transportSearch]);

    // Modal components
    const renderRetailerModal = () => (
        <Modal
            visible={showRetailerModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowRetailerModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Retailer</Text>
                        <TouchableOpacity onPress={() => setShowRetailerModal(false)}>
                            <FeatherIcon name="x" size={24} color={customColors.black} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        placeholder="Search retailers..."
                        style={styles.modalSearchInput}
                        value={retailerSearch}
                        onChangeText={setRetailerSearch}
                    />

                    <FlatList
                        data={filteredRetailers}
                        keyExtractor={(item) => item.Retailer_Id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setSelectedRetailer(item);
                                    setShowRetailerModal(false);
                                    setRetailerSearch("");
                                }}
                            >
                                <Text style={styles.modalItemTitle}>{item.Retailer_Name}</Text>
                                <Text style={styles.modalItemSubtitle}>
                                    {item.Retailer_Code} • {item.Mobile_No || 'No mobile'}
                                </Text>
                                <Text style={styles.modalItemSubtitle}>{item.RouteGet} - {item.AreaGet}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.modalList}
                    />
                </View>
            </View>
        </Modal>
    );

    const renderBrokerModal = () => (
        <Modal
            visible={showBrokerModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowBrokerModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Broker</Text>
                        <TouchableOpacity onPress={() => setShowBrokerModal(false)}>
                            <FeatherIcon name="x" size={24} color={customColors.black} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        placeholder="Search brokers..."
                        style={styles.modalSearchInput}
                        value={brokerSearch}
                        onChangeText={setBrokerSearch}
                    />

                    <FlatList
                        data={filteredBrokers}
                        keyExtractor={(item) => item.Cost_Center_Id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setSelectedBroker(item);
                                    setShowBrokerModal(false);
                                    setBrokerSearch("");
                                }}
                            >
                                <Text style={styles.modalItemTitle}>{item.Cost_Center_Name}</Text>
                                <Text style={styles.modalItemSubtitle}>{item.UserTypeGet}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.modalList}
                    />
                </View>
            </View>
        </Modal>
    );

    const renderTransportModal = () => (
        <Modal
            visible={showTransportModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTransportModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Transport</Text>
                        <TouchableOpacity onPress={() => setShowTransportModal(false)}>
                            <FeatherIcon name="x" size={24} color={customColors.black} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        placeholder="Search transport..."
                        style={styles.modalSearchInput}
                        value={transportSearch}
                        onChangeText={setTransportSearch}
                    />

                    <FlatList
                        data={filteredTransports}
                        keyExtractor={(item) => item.Cost_Center_Id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setSelectedTransport(item);
                                    setShowTransportModal(false);
                                    setTransportSearch("");
                                }}
                            >
                                <Text style={styles.modalItemTitle}>{item.Cost_Center_Name}</Text>
                                <Text style={styles.modalItemSubtitle}>{item.UserTypeGet}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.modalList}
                    />
                </View>
            </View>
        </Modal>
    );

    const renderCartModal = () => (
        <Modal
            visible={showCartModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCartModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Cart Summary</Text>
                        <TouchableOpacity onPress={() => setShowCartModal(false)}>
                            <FeatherIcon name="x" size={24} color={customColors.black} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cartSummary}>
                        <View style={styles.cartSummaryRow}>
                            <Text style={styles.cartSummaryLabel}>Total Items:</Text>
                            <Text style={styles.cartSummaryValue}>{orderCount}</Text>
                        </View>
                        <View style={styles.cartSummaryRow}>
                            <Text style={styles.cartSummaryLabel}>Total Bags:</Text>
                            <Text style={styles.cartSummaryValue}>{totalBags}</Text>
                        </View>
                        <View style={styles.cartSummaryRow}>
                            <Text style={styles.cartSummaryLabel}>Total Weight:</Text>
                            <Text style={styles.cartSummaryValue}>{totalWeight.toFixed(2)} kg</Text>
                        </View>
                        <View style={styles.cartSummaryRow}>
                            <Text style={styles.cartSummaryLabel}>Total Amount:</Text>
                            <Text style={styles.cartSummaryValue}>₹{totalAmount.toFixed(2)}</Text>
                        </View>
                    </View>

                    <FlashList
                        data={Object.values(orderItems).filter(item => item.qty > 0)}
                        keyExtractor={(item) => item.Product_Id}
                        renderItem={({ item }) => {
                            const product = productData.find(p => p.Product_Id === item.Product_Id);
                            const packWeight = parseFloat(product?.PackGet || 0);
                            const totalItemWeight = item.qty * packWeight;
                            const itemTotal = totalItemWeight * item.rate;

                            return (
                                <View style={styles.cartItem}>
                                    <View style={styles.cartItemInfo}>
                                        <Text style={styles.cartItemName}>{item.Short_Name || item.Product_Name}</Text>
                                        <Text style={styles.cartItemDetails}>
                                            {item.qty} bags × {packWeight} kg = {totalItemWeight.toFixed(2)} kg
                                        </Text>
                                        <Text style={styles.cartItemRate}>Rate: ₹{item.rate}/kg</Text>
                                    </View>
                                    <View style={styles.cartItemActions}>
                                        <Text style={styles.cartItemTotal}>₹{itemTotal.toFixed(2)}</Text>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => removeFromCart(item.Product_Id)}
                                        >
                                            <FeatherIcon name="trash-2" size={16} color={customColors.white} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                        style={styles.cartList}
                    />

                    <TouchableOpacity
                        style={styles.proceedButton}
                        onPress={handleProceedToOrder}
                    >
                        <Text style={styles.proceedButtonText}>Proceed to Order</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderProductItem = ({ item }) => {
        const cartItem = orderItems[item.Product_Id];
        const isInCart = cartItem && cartItem.qty > 0;
        const ClQtyInBags = item.CL_Qty / (parseFloat(item.PackGet) || 1);

        return (
            <View style={styles.productCard}>
                <View style={styles.productMainInfo}>
                    <Text style={styles.productName}>{item.Short_Name || item.Product_Name}</Text>
                    <View style={styles.productMeta}>
                        <Text style={styles.productRate}>₹{item.Product_Rate}/kg</Text>
                        <Text style={[styles.productStock, ClQtyInBags === 0 && styles.outOfStock]}>
                            {ClQtyInBags === 0 ? "Out of Stock" : `${ClQtyInBags.toFixed(1)} Bags`}
                        </Text>
                    </View>
                </View>

                <View style={styles.quantitySection}>
                    <Text style={styles.bagsLabel}>Bags</Text>
                    <View style={styles.quantityControls}>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                                if (isInCart) {
                                    const newQty = Math.max(0, cartItem.qty - 1);
                                    updateCartItemQuantity(item.Product_Id, newQty);
                                }
                            }}
                            disabled={!isInCart}
                        >
                            <FeatherIcon
                                name="minus"
                                size={16}
                                color={isInCart ? customColors.white : customColors.grey400}
                            />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.quantityInput}
                            value={isInCart ? cartItem.qty.toString() : "0"}
                            onChangeText={(value) => updateQuantityInput(item.Product_Id, value)}
                            keyboardType="decimal-pad"
                            textAlign="center"
                            placeholder="0"
                            editable={isInCart}
                            selectTextOnFocus={true}
                        />

                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                                if (isInCart) {
                                    updateCartItemQuantity(item.Product_Id, cartItem.qty + 1);
                                } else {
                                    addToCart(item);
                                }
                            }}
                        >
                            <FeatherIcon name="plus" size={16} color={customColors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Sales Order"
                navigation={navigation}
                showRightIcon={orderCount > 0}
                rightIconName="shopping-cart"
                rightIconLibrary="FeatherIcon"
                showBadge={orderCount > 0}
                badgeValue={totalBags}
                onRightPress={() => setShowCartModal(true)}
            />

            <View style={styles.content}>
                <View style={styles.filteredSection}>
                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={() => setShowRetailerModal(!showRetailerModal)}
                    >
                        <TextInput
                            placeholder="Retailer / Mobile No."
                            style={styles.searchInput}
                            value={selectedRetailer ? selectedRetailer.Retailer_Name : ""}
                            editable={false}
                            pointerEvents="none"
                        />
                        <FeatherIcon name="chevron-down" size={20} color={customColors.grey600} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
                        <FeatherIcon name="filter" size={24} color={customColors.black} />
                    </TouchableOpacity>
                </View>

                {showFilter && (
                    <View style={styles.expandableFilters}>
                        <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={() => setShowBrokerModal(!showBrokerModal)}
                        >
                            <TextInput
                                placeholder="Broker"
                                style={styles.searchInput}
                                value={selectedBroker ? selectedBroker.Cost_Center_Name : ""}
                                editable={false}
                                pointerEvents="none"
                            />
                            <FeatherIcon name="chevron-down" size={20} color={customColors.grey600} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={() => setShowTransportModal(!showTransportModal)}
                        >
                            <TextInput
                                placeholder="Transport"
                                style={styles.searchInput}
                                value={selectedTransport ? selectedTransport.Cost_Center_Name : ""}
                                editable={false}
                                pointerEvents="none"
                            />
                            <FeatherIcon name="chevron-down" size={20} color={customColors.grey600} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.productContainer}>
                    <EnhancedDropdown
                        data={productBranch}
                        labelField="POS_Brand_Name"
                        valueField="POS_Brand_Id"
                        placeholder="Select Brand (All)"
                        value={selectedBrandId}
                        onChange={item => setSelectedBrandId(item?.POS_Brand_Id)}
                        searchPlaceholder="Search brands..."
                    />

                    <TextInput
                        placeholder="Product Search"
                        style={styles.productSearchInput}
                        value={productSearch}
                        onChangeText={setProductSearch}
                    />
                </View>

                <Text style={styles.productCountText}>Showing {filteredProducts.length} products</Text>

                <FlashList
                    data={filteredProducts}
                    keyExtractor={(item) => item.Product_Id}
                    renderItem={renderProductItem}
                    style={styles.productList}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {renderRetailerModal()}
            {renderBrokerModal()}
            {renderTransportModal()}
            {renderCartModal()}
        </SafeAreaView>
    )
}

export default SalesPos

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    filteredSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
    },
    expandableFilters: {
        width: "100%",
        flexDirection: "row",
        height: 50,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingBottom: 10,
        gap: 10,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey600,
        borderRadius: 5,
        paddingRight: 10,
        flex: 1,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        padding: 10,
    },
    productContainer: {
        padding: 10,
        gap: 10,
    },
    productSearchInput: {
        borderWidth: 1,
        borderColor: customColors.grey600,
        borderRadius: 5,
        padding: 10,
    },
    productCountText: {
        paddingHorizontal: 10,
        paddingBottom: 5,
        color: customColors.grey700,
        ...typography.body1(),
    },
    productList: {
        flex: 1,
        paddingHorizontal: 10,
    },
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productMainInfo: {
        marginBottom: 12,
    },
    productName: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.black,
        marginBottom: 8,
        lineHeight: 22,
    },
    productMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productRate: {
        ...typography.body1(),
        fontWeight: 'bold',
        color: customColors.primary,
        fontSize: 16,
    },
    productStock: {
        ...typography.body2(),
        color: customColors.success,
        fontWeight: '500',
    },
    outOfStock: {
        color: customColors.error,
    },
    quantitySection: {
        alignItems: 'center',
    },
    bagsLabel: {
        ...typography.caption(),
        fontWeight: '600',
        color: customColors.grey700,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.grey100,
        borderRadius: 25,
        padding: 4,
    },
    quantityButton: {
        backgroundColor: customColors.primary,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityInput: {
        ...typography.h6(),
        fontWeight: '600',
        color: customColors.black,
        textAlign: 'center',
        minWidth: 60,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: customColors.white,
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    modalTitle: {
        ...typography.h5(),
        fontWeight: 'bold',
        color: customColors.black,
    },
    modalSearchInput: {
        borderWidth: 1,
        borderColor: customColors.grey600,
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        ...typography.body1(),
    },
    modalList: {
        maxHeight: 400,
    },
    modalItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    modalItemTitle: {
        ...typography.body1(),
        fontWeight: 'bold',
        color: customColors.black,
        marginBottom: 4,
    },
    modalItemSubtitle: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: 2,
    },
    // Cart Modal styles
    cartSummary: {
        backgroundColor: customColors.primary + '10',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    cartSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    cartSummaryLabel: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: '500',
    },
    cartSummaryValue: {
        ...typography.body2(),
        fontWeight: 'bold',
        color: customColors.black,
    },
    cartList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    cartItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        alignItems: 'center',
    },
    cartItemInfo: {
        flex: 1,
        marginRight: 15,
    },
    cartItemName: {
        ...typography.body1(),
        fontWeight: 'bold',
        color: customColors.black,
        marginBottom: 4,
    },
    cartItemDetails: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: 2,
    },
    cartItemRate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    cartItemActions: {
        alignItems: 'flex-end',
    },
    cartItemTotal: {
        ...typography.body1(),
        fontWeight: 'bold',
        color: customColors.primary,
        marginBottom: 8,
    },
    deleteButton: {
        backgroundColor: customColors.error,
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    proceedButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    proceedButtonText: {
        ...typography.h6(),
        fontWeight: 'bold',
        color: customColors.white,
    },
})