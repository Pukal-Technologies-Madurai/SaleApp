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
    FlatList,
} from "react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";

import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { updateSaleInvoice } from "../../Api/sales";
import {
    fetchGoDownwiseStockValue,
    fetchProductsWithStockValue,
    fetchUOM,
} from "../../Api/product";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";

const InvoiceDetail = ({ route }) => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const { invoice } = route.params;

    const [uID, setUID] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alterReason, setAlterReason] = useState("");
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [isActiveGoDown, setIsActiveGoDown] = useState(0);

    // Add product modal state
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [proGroupData, setProGroupData] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [tempQuantities, setTempQuantities] = useState({});
    const [tempRates, setTempRates] = useState({});
    const [selectedUOMs, setSelectedUOMs] = useState({});

    // Initialize state from invoice data
    const [products, setProducts] = useState(
        invoice.Products_List?.map(p => ({
            ...p,
            Bill_Qty: parseFloat(p.Bill_Qty) || 0,
            Item_Rate: parseFloat(p.Item_Rate) || 0,
        })) || []
    );

    const [deliveryStatus, setDeliveryStatus] = useState(
        invoice.Delivery_Status || 0
    );
    const [paymentMode, setPaymentMode] = useState(invoice.Payment_Mode || 0);
    const [paymentStatus, setPaymentStatus] = useState(
        invoice.Payment_Status || 0
    );
    const [narration, setNarration] = useState(invoice.Narration || "");

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const activeGodown = await AsyncStorage.getItem("activeGodown");
                setUID(userId);
                const parsedGodown = parseInt(activeGodown, 10);
                setIsActiveGoDown(isNaN(parsedGodown) ? 0 : parsedGodown);
            } catch (err) {
                console.log("Error fetching user data:", err);
            }
        })();
    }, []);

    // Fetch godown stock
    const { data: goDownStockValueData = {}, isFetched: isGodownStockFetched } =
        useQuery({
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

    // Fetch products with stock
    const { data: productQueryData = { productData: [], brandData: [] } } =
        useQuery({
            queryKey: ["product", isActiveGoDown],
            queryFn: () => fetchProductsWithStockValue(),
            enabled: !!isActiveGoDown && isGodownStockFetched,
            staleTime: 0, // Always fetch fresh data
            select: data => {
                const brands = Array.from(
                    new Set(data.map(item => item.Brand_Name))
                )
                    .filter(brand => brand)
                    .sort()
                    .map(brand => ({
                        label: brand,
                        value: brand,
                    }));

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

    // Fetch UOM data
    const { data: uomData = [] } = useQuery({
        queryKey: ["uomData"],
        queryFn: () => fetchUOM(),
    });

    const productData = productQueryData.productData;
    const brandData = productQueryData.brandData;

    // Handle brand selection
    const handleBrandChange = item => {
        setSelectedBrand(item.value);
        setSelectedGroup(null);
        setFilteredProducts([]);

        const filteredByBrand = productData.filter(
            product => product.Brand_Name === item.value
        );

        const groups = Array.from(
            new Set(filteredByBrand.map(item => item.Pro_Group))
        )
            .filter(group => group)
            .sort()
            .map(group => ({
                label: group,
                value: group,
            }));

        setProGroupData(groups);
    };

    // Handle group selection
    const handleGroupChange = item => {
        setSelectedGroup(item.value);

        const filtered = productData.filter(
            product =>
                product.Brand_Name === selectedBrand &&
                product.Pro_Group === item.value &&
                product.CL_Qty > 0
        );

        // Exclude already added products
        const existingIds = products.map(p => p.Product_Id);
        const available = filtered.filter(
            p => !existingIds.includes(p.Product_Id)
        );

        setFilteredProducts(available);

        // Initialize temp values
        const initQty = {};
        const initRates = {};
        available.forEach(p => {
            initQty[p.Product_Id] = "";
            initRates[p.Product_Id] = p.Item_Rate;
        });
        setTempQuantities(initQty);
        setTempRates(initRates);
    };

    // Add selected products to invoice
    const handleAddProducts = () => {
        const newProducts = filteredProducts
            .filter(p => {
                const qty = parseFloat(tempQuantities[p.Product_Id]) || 0;
                return qty > 0;
            })
            .map(p => ({
                Product_Id: p.Product_Id,
                Item_Id: p.Product_Id,
                Product_Name: p.Product_Name,
                Bill_Qty: parseFloat(tempQuantities[p.Product_Id]) || 0,
                Item_Rate: parseFloat(tempRates[p.Product_Id]) || p.Item_Rate,
                GoDown_Id: isActiveGoDown,
                Unit_Id: selectedUOMs[p.Product_Id] || p.UOM_Id || 6,
            }));

        if (newProducts.length === 0) {
            Alert.alert("Info", "Please enter quantity for at least one product");
            return;
        }

        setProducts(prev => [...prev, ...newProducts]);
        setShowAddProductModal(false);
        setSelectedBrand(null);
        setSelectedGroup(null);
        setFilteredProducts([]);
        setTempQuantities({});
        setTempRates({});

        ToastAndroid.show(
            `${newProducts.length} product(s) added`,
            ToastAndroid.SHORT
        );
    };

    // Calculate totals
    const calculateTotals = useMemo(() => {
        const subtotal = products.reduce((sum, p) => {
            return sum + p.Bill_Qty * p.Item_Rate;
        }, 0);

        const roundOff = Math.round(subtotal) - subtotal;

        return {
            subtotal: subtotal.toFixed(2),
            roundOff: roundOff.toFixed(2),
            total: Math.round(subtotal),
        };
    }, [products]);

    // Update product quantity
    const updateQuantity = (productId, newQty) => {
        setProducts(prev =>
            prev.map(p =>
                p.Product_Id === productId
                    ? { ...p, Bill_Qty: Math.max(0, parseFloat(newQty) || 0) }
                    : p
            )
        );
    };

    // Update product rate
    const updateRate = (productId, newRate) => {
        setProducts(prev =>
            prev.map(p =>
                p.Product_Id === productId
                    ? { ...p, Item_Rate: Math.max(0, parseFloat(newRate) || 0) }
                    : p
            )
        );
    };

    // Remove product
    const removeProduct = productId => {
        Alert.alert(
            "Remove Product",
            "Are you sure you want to remove this product?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setProducts(prev =>
                            prev.filter(p => p.Product_Id !== productId)
                        );
                    },
                },
            ]
        );
    };

    // Mutation for updating invoice
    const mutation = useMutation({
        mutationFn: updateSaleInvoice,
        onSuccess: data => {
            queryClient.invalidateQueries(["saleInvoices"]);
            Alert.alert("Success", data.message || "Invoice updated!", [
                {
                    text: "Okay",
                    onPress: () => {
                        setShowReasonModal(false);
                        navigation.goBack();
                    },
                },
            ]);
        },
        onError: error => {
            Alert.alert("Error", error.message || "Failed to update invoice");
        },
    });

    // Handle submit
    const handleSubmit = () => {
        if (products.length === 0) {
            Alert.alert("Error", "At least one product is required");
            return;
        }

        if (!products.every(p => p.Item_Rate > 0)) {
            Alert.alert("Error", "Please enter valid prices for all products");
            return;
        }

        setShowReasonModal(true);
    };

    const confirmSubmit = () => {
        if (!alterReason.trim()) {
            Alert.alert("Error", "Please enter a reason for modification");
            return;
        }

        setIsSubmitting(true);

        const updateBody = {
            Do_Id: invoice.Do_Id,
            Do_Date: invoice.Do_Date,
            Retailer_Id: invoice.Retailer_Id,
            Branch_Id: invoice.Branch_Id,
            So_No: invoice.So_No,
            Voucher_Type: invoice.Voucher_Type || "0",
            Cancel_status: (deliveryStatus === 0 ? "0" : invoice.Cancel_status),
            Ref_Inv_Number: invoice.Ref_Inv_Number || "",
            Narration: narration,
            Altered_by: uID,
            GST_Inclusive: invoice.GST_Inclusive || 1,
            IS_IGST: invoice.IS_IGST || 0,
            Round_off: parseFloat(calculateTotals.roundOff),
            Product_Array: products.map(p => ({
                Item_Id: p.Item_Id || p.Product_Id,
                Bill_Qty: p.Bill_Qty,
                Item_Rate: p.Item_Rate,
                GoDown_Id: p.GoDown_Id || 1,
                Unit_Id: p.Unit_Id || 6,
            })),
            Expence_Array: invoice.Expence_Array || [],
            Staffs_Array: invoice.Staffs_Array || [],
            Stock_Item_Ledger_Name: invoice.Stock_Item_Ledger_Name || "",
            deliveryAddressDetails: {},
            shipingAddressDetails: {},
            Delivery_Status: deliveryStatus,
            Payment_Mode: paymentMode,
            Payment_Status: paymentStatus,
            Alter_Reason: alterReason,
            paymentDueDays: 0,
        };

        mutation.mutate(updateBody, {
            onSettled: () => setIsSubmitting(false),
        });
    };
    // 0, 5, 6, 7

    const getDeliveryStatusLabel = status => {
        const map = {
            1: "New",
            5: "Pending",
            7: "Delivered",
            6: "Returned",
            0: "Cancelled",
        };
        return map[status] || "Unknown";
    };

    const getPaymentStatusLabel = status => {
        const map = {
            0: "Pending",
            1: "Pending",
            3: "Completed",
        };
        return map[status] || "Unknown";
    };

    const getPaymentModeLabel = mode => {
        const map = {
            1: "Cash",
            2: "G-Pay",
            3: "Credit",
        };
        return map[mode] || "N/A";
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Edit Invoice" navigation={navigation} />

            <ScrollView style={styles.contentContainer}>
                {/* Invoice Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Invoice No:</Text>
                        <Text style={styles.infoValue}>
                            {invoice.Do_Inv_No}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(invoice.Do_Date).toLocaleDateString(
                                "en-GB"
                            )}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Customer:</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>
                            {invoice.Retailer_Name}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Branch:</Text>
                        <Text style={styles.infoValue}>
                            {invoice.Branch_Name}
                        </Text>
                    </View>
                </View>

                {/* Status Selection */}
                <View style={styles.statusCard}>
                    <Text style={styles.sectionTitle}>Status</Text>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Delivery:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.statusOptions}>
                            {[1, 5, 7, 6, 0].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusChip,
                                        deliveryStatus === status &&
                                            styles.statusChipActive,
                                    ]}
                                    onPress={() => setDeliveryStatus(status)}>
                                    <Text
                                        style={[
                                            styles.statusChipText,
                                            deliveryStatus === status &&
                                                styles.statusChipTextActive,
                                        ]}>
                                        {getDeliveryStatusLabel(status)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Payment:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.statusOptions}>
                            {[1, 3].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusChip,
                                        paymentStatus === status &&
                                            styles.statusChipActive,
                                    ]}
                                    onPress={() => setPaymentStatus(status)}>
                                    <Text
                                        style={[
                                            styles.statusChipText,
                                            paymentStatus === status &&
                                                styles.statusChipTextActive,
                                        ]}>
                                        {getPaymentStatusLabel(status)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Mode:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.statusOptions}>
                            {[1, 2, 3].map(mode => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.statusChip,
                                        paymentMode === mode &&
                                            styles.statusChipActive,
                                    ]}
                                    onPress={() => setPaymentMode(mode)}>
                                    <Text
                                        style={[
                                            styles.statusChipText,
                                            paymentMode === mode &&
                                                styles.statusChipTextActive,
                                        ]}>
                                        {getPaymentModeLabel(mode)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* Products Section */}
                <View style={styles.productsCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <TouchableOpacity
                            style={styles.addProductBtn}
                            onPress={() => setShowAddProductModal(true)}>
                            <MaterialIcons
                                name="add"
                                size={18}
                                color={customColors.white}
                            />
                            <Text style={styles.addProductBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {products.map((product, index) => {
                        // Look up current godown balance for this product
                        const balQty = goDownStockValueData[product.Product_Id] ?? null;
                        const isOutOfStock = balQty !== null && balQty === 0;
                        const isLowStock = balQty !== null && balQty > 0 && balQty < 5;

                        return (
                            <View
                                key={index}
                                style={[
                                    styles.productItem,
                                    isOutOfStock && { borderLeftWidth: 3, borderLeftColor: customColors.error },
                                ]}
                            >
                                <View style={styles.productHeader}>
                                    <Text style={styles.productName} numberOfLines={2}>
                                        {product.Product_Name}
                                    </Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        {/* Stock badge */}
                                        {balQty !== null && (
                                            <View
                                                style={[
                                                    styles.stockBadge,
                                                    {
                                                        backgroundColor:
                                                            isOutOfStock
                                                                ? customColors.error + "20"
                                                                : isLowStock
                                                                ? customColors.warning + "20"
                                                                : customColors.success + "20",
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.stockBadgeText,
                                                        {
                                                            color:
                                                                isOutOfStock
                                                                    ? customColors.error
                                                                    : isLowStock
                                                                    ? customColors.warning
                                                                    : customColors.success,
                                                        },
                                                    ]}
                                                >
                                                    {isOutOfStock ? "Out of Stock" : `Bal: ${balQty}`}
                                                </Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => removeProduct(product.Product_Id)}
                                            style={styles.removeBtn}
                                        >
                                            <MaterialIcons
                                                name="close"
                                                size={18}
                                                color={customColors.error}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.productFields}>
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Qty:</Text>
                                        <TextInput
                                            style={[
                                                styles.fieldInput,
                                                balQty !== null &&
                                                    parseFloat(product.Bill_Qty) > balQty && {
                                                        borderColor: customColors.error,
                                                        borderWidth: 1,
                                                    },
                                            ]}
                                            value={String(product.Bill_Qty)}
                                            onChangeText={val => {
                                                const qty = parseFloat(val) || 0;
                                                if (balQty !== null && qty > balQty) {
                                                    ToastAndroid.show(
                                                        `Only ${balQty} in stock`,
                                                        ToastAndroid.SHORT
                                                    );
                                                }
                                                updateQuantity(product.Product_Id, val);
                                            }}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Rate:</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={String(product.Item_Rate)}
                                            onChangeText={val =>
                                                updateRate(product.Product_Id, val)
                                            }
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Amount:</Text>
                                        <Text style={styles.amountText}>
                                            ₹
                                            {(
                                                product.Bill_Qty * product.Item_Rate
                                            ).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Narration */}
                <View style={styles.narrationCard}>
                    <Text style={styles.sectionTitle}>Narration</Text>
                    <TextInput
                        style={styles.narrationInput}
                        value={narration}
                        onChangeText={setNarration}
                        placeholder="Add notes..."
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Summary */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                        <Text style={styles.summaryValue}>
                            ₹{calculateTotals.subtotal}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Round Off:</Text>
                        <Text style={styles.summaryValue}>
                            ₹{calculateTotals.roundOff}
                        </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total:</Text>
                        <Text style={styles.totalValue}>
                            ₹{calculateTotals.total}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                        <ActivityIndicator color={customColors.white} />
                    ) : (
                        <>
                            <FeatherIcon
                                name="save"
                                size={20}
                                color={customColors.white}
                            />
                            <Text style={styles.submitButtonText}>
                                Update Invoice
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Add Product Modal */}
            <Modal
                visible={showAddProductModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddProductModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.addProductModalContent}>
                        <View style={styles.addProductHeader}>
                            <Text style={styles.modalTitle}>Add Products</Text>
                            <TouchableOpacity
                                onPress={() => setShowAddProductModal(false)}>
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={customColors.grey700}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Brand Dropdown */}
                        <View style={styles.dropdownRow}>
                            <EnhancedDropdown
                                data={brandData}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Brand"
                                value={selectedBrand}
                                onChange={handleBrandChange}
                                containerStyle={styles.dropdownContainer}
                            />
                        </View>

                        {/* Group Dropdown */}
                        {selectedBrand && (
                            <View style={styles.dropdownRow}>
                                <EnhancedDropdown
                                    data={proGroupData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Group"
                                    value={selectedGroup}
                                    onChange={handleGroupChange}
                                    containerStyle={styles.dropdownContainer}
                                />
                            </View>
                        )}

                        {/* Product List */}
                        {filteredProducts.length > 0 ? (
                            <FlatList
                                data={filteredProducts}
                                keyExtractor={item =>
                                    String(item.Product_Id)
                                }
                                style={styles.productList}
                                renderItem={({ item }) => {
                                    const balQty = item.CL_Qty ?? 0;
                                    const isLow = balQty > 0 && balQty < 5;
                                    return (
                                        <View style={styles.addProductItem}>
                                            <View style={styles.addProductInfo}>
                                                <Text
                                                    style={styles.addProductName}
                                                    numberOfLines={2}>
                                                    {item.Product_Name}
                                                </Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                                                    <View
                                                        style={[
                                                            styles.stockBadge,
                                                            {
                                                                backgroundColor: isLow
                                                                    ? customColors.warning + "20"
                                                                    : customColors.success + "20",
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.stockBadgeText,
                                                                {
                                                                    color: isLow
                                                                        ? customColors.warning
                                                                        : customColors.success,
                                                                },
                                                            ]}
                                                        >
                                                            Bal: {balQty}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.addProductStock}>
                                                        Rate: ₹{item.Item_Rate}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.addProductInputs}>
                                                <TextInput
                                                    style={styles.addProductQtyInput}
                                                    placeholder="Qty"
                                                    keyboardType="decimal-pad"
                                                    value={
                                                        tempQuantities[
                                                            item.Product_Id
                                                        ] || ""
                                                    }
                                                    onChangeText={val => {
                                                        const qty =
                                                            parseFloat(val) || 0;
                                                        if (qty > balQty) {
                                                            ToastAndroid.show(
                                                                `Only ${balQty} in stock`,
                                                                ToastAndroid.SHORT
                                                            );
                                                            return;
                                                        }
                                                        setTempQuantities(
                                                            prev => ({
                                                                ...prev,
                                                                [item.Product_Id]:
                                                                    val,
                                                            })
                                                        );
                                                    }}
                                                />
                                                <TextInput
                                                    style={styles.addProductRateInput}
                                                    placeholder="Rate"
                                                    keyboardType="decimal-pad"
                                                    value={String(
                                                        tempRates[item.Product_Id] ||
                                                            item.Item_Rate
                                                    )}
                                                    onChangeText={val =>
                                                        setTempRates(prev => ({
                                                            ...prev,
                                                            [item.Product_Id]: val,
                                                        }))
                                                    }
                                                />
                                            </View>
                                        </View>
                                    );
                                }}
                            />
                        ) : selectedGroup ? (
                            <View style={styles.emptyState}>
                                <MaterialIcons
                                    name="inventory"
                                    size={48}
                                    color={customColors.grey400}
                                />
                                <Text style={styles.emptyStateText}>
                                    No products available
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialIcons
                                    name="search"
                                    size={48}
                                    color={customColors.grey400}
                                />
                                <Text style={styles.emptyStateText}>
                                    Select brand and group to view products
                                </Text>
                            </View>
                        )}

                        {/* Add Button */}
                        {filteredProducts.length > 0 && (
                            <TouchableOpacity
                                style={styles.addSelectedBtn}
                                onPress={handleAddProducts}>
                                <MaterialIcons
                                    name="add-shopping-cart"
                                    size={20}
                                    color={customColors.white}
                                />
                                <Text style={styles.addSelectedBtnText}>
                                    Add Selected Products
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Reason Modal */}
            <Modal
                visible={showReasonModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReasonModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Reason for Modification
                        </Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={alterReason}
                            onChangeText={setAlterReason}
                            placeholder="Enter reason for changes..."
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setShowReasonModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.confirmBtn]}
                                onPress={confirmSubmit}
                                disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <ActivityIndicator
                                        color={customColors.white}
                                        size="small"
                                    />
                                ) : (
                                    <Text style={styles.confirmBtnText}>
                                        Confirm
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default InvoiceDetail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: spacing.md,
    },
    infoCard: {
        backgroundColor: customColors.grey50,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.small,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.xs,
    },
    infoLabel: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    infoValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
        flex: 1,
        textAlign: "right",
    },
    statusCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    sectionTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.sm,
    },
    statusRow: {
        marginBottom: spacing.sm,
    },
    statusLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
    },
    statusOptions: {
        flexDirection: "row",
    },
    statusChip: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        backgroundColor: customColors.grey100,
        marginRight: spacing.sm,
    },
    statusChipActive: {
        backgroundColor: customColors.primary,
    },
    statusChipText: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    statusChipTextActive: {
        color: customColors.white,
        fontWeight: "600",
    },
    productsCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productItem: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    stockBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    stockBadgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    productHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    productName: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
        flex: 1,
        marginRight: spacing.sm,
    },
    removeBtn: {
        padding: spacing.xs,
    },
    productFields: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fieldGroup: {
        flex: 1,
        marginRight: spacing.sm,
    },
    fieldLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: 2,
    },
    fieldInput: {
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        ...typography.body2(),
        color: customColors.grey900,
    },
    amountText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
        paddingVertical: spacing.xs,
    },
    narrationCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    narrationInput: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.sm,
        ...typography.body2(),
        color: customColors.grey900,
        textAlignVertical: "top",
        minHeight: 80,
    },
    summaryCard: {
        backgroundColor: customColors.grey50,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.small,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.xs,
    },
    summaryLabel: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    summaryValue: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: customColors.grey300,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
    },
    totalLabel: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    totalValue: {
        ...typography.subtitle1(),
        color: customColors.primary,
        fontWeight: "700",
    },
    submitContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        paddingVertical: spacing.md,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
        ...shadows.medium,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.lg,
        width: "100%",
        maxWidth: 400,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    reasonInput: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.md,
        ...typography.body2(),
        color: customColors.grey900,
        textAlignVertical: "top",
        minHeight: 100,
        marginBottom: spacing.md,
    },
    modalButtons: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelBtn: {
        backgroundColor: customColors.grey200,
    },
    cancelBtnText: {
        ...typography.button(),
        color: customColors.grey700,
    },
    confirmBtn: {
        backgroundColor: customColors.primary,
    },
    confirmBtnText: {
        ...typography.button(),
        color: customColors.white,
    },
    // Add Product styles
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    addProductBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 6,
        gap: 4,
    },
    addProductBtnText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    addProductModalContent: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.md,
        width: "100%",
        maxWidth: 500,
        maxHeight: "85%",
    },
    addProductHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    dropdownRow: {
        marginBottom: spacing.sm,
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
    },
    productList: {
        maxHeight: 350,
        marginBottom: spacing.md,
    },
    addProductItem: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
    },
    addProductInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    addProductName: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
    },
    addProductStock: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: 2,
    },
    addProductInputs: {
        flexDirection: "row",
        gap: spacing.xs,
    },
    addProductQtyInput: {
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        width: 60,
        ...typography.body2(),
        textAlign: "center",
    },
    addProductRateInput: {
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        width: 70,
        ...typography.body2(),
        textAlign: "center",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xl,
    },
    emptyStateText: {
        ...typography.body2(),
        color: customColors.grey500,
        marginTop: spacing.sm,
        textAlign: "center",
    },
    addSelectedBtn: {
        backgroundColor: customColors.primary,
        borderRadius: 10,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
    },
    addSelectedBtnText: {
        ...typography.button(),
        color: customColors.white,
    },
});
