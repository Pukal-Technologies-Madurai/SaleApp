import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, FlatList } from "react-native";
import React, { useState, useMemo, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../Components/AppHeader";
import { customColors, typography, shadows } from "../../Config/helper";
import { fetchProductsWithStockValue } from "../../Api/product";
import { API } from "../../Config/Endpoint";

const SalesReturn = ({ route }) => {
    const { item, isEditMode } = route.params;

    console.log("SalesReturn Item:", item);
    console.log("isEditMode:", isEditMode);

    const navigation = useNavigation();
    const [expandedBrand, setExpandedBrand] = useState(null);
    const [expandedGroup, setExpandedGroup] = useState({});
    const [returnQuantities, setReturnQuantities] = useState({});
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedNarration, setSelectedNarration] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);

    // Narration options
    const narrationOptions = ["Good", "Damage", "Bad", "Expired"];

    // Get user info on mount
    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
            } catch (error) {
                console.error("Error getting user info:", error);
            }
        };
        getUserInfo();
    }, []);

    // Pre-populate data when in edit mode
    useEffect(() => {
        if (isEditMode && item?.Products_List?.length > 0) {
            // Pre-populate quantities from existing credit note
            // Use String() to ensure consistent key matching with Product_Id
            const quantities = {};
            item.Products_List.forEach(product => {
                const productId = String(product.Item_Id || product.Product_Id);
                if (productId) {
                    quantities[productId] = String(product.Bill_Qty || product.Total_Qty || 0);
                }
            });
            setReturnQuantities(quantities);

            // Pre-select narration if available
            if (item.Narration && narrationOptions.includes(item.Narration)) {
                setSelectedNarration(item.Narration);
            }
        }
    }, [isEditMode, item]);

    console.log("userId:", userId);

    const { data: productQueryData = { productData: [], brandData: [] }, isLoading, isError } =
        useQuery({
            queryKey: ["product"],
            queryFn: () => fetchProductsWithStockValue(),
            staleTime: 0,
            select: data => {
                // Filter only active products (IsActive === 1)
                const activeProducts = data.filter(product => product.IsActive === 1);

                const brands = Array.from(
                    new Set(activeProducts.map(item => item.Brand_Name)),
                )
                    .filter(brand => brand)
                    .sort()
                    .map(brand => ({
                        label: brand,
                        value: brand,
                    }));

                return {
                    productData: activeProducts,
                    brandData: brands,
                };
            },
        });

    const productData = productQueryData.productData;
    const brandData = productQueryData.brandData;

    // Group products by Brand_Name, then by Pro_Group
    const groupedData = useMemo(() => {
        const grouped = {};
        
        productData.forEach(product => {
            const brandName = product.Brand_Name || 'Unknown Brand';
            const proGroup = product.Pro_Group || 'Unknown Group';
            
            if (!grouped[brandName]) {
                grouped[brandName] = {
                    brandName,
                    groups: {},
                    totalProducts: 0,
                };
            }
            
            if (!grouped[brandName].groups[proGroup]) {
                grouped[brandName].groups[proGroup] = {
                    groupName: proGroup,
                    products: [],
                };
            }
            
            grouped[brandName].groups[proGroup].products.push(product);
            grouped[brandName].totalProducts++;
        });

        // Convert to array format
        return Object.values(grouped).map(brand => ({
            ...brand,
            groups: Object.values(brand.groups),
        }));
    }, [productData]);

    // Toggle brand accordion
    const toggleBrand = (brandName) => {
        setExpandedBrand(expandedBrand === brandName ? null : brandName);
    };

    // Toggle product group accordion within a brand
    const toggleGroup = (brandName, groupName) => {
        const key = `${brandName}-${groupName}`;
        setExpandedGroup(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Handle quantity change for a product (supports floating values)
    const handleQuantityChange = (productId, quantity) => {
        // Allow empty string, numbers, and decimal values
        if (quantity === '' || quantity === '.' || /^\d*\.?\d*$/.test(quantity)) {
            const key = String(productId);
            setReturnQuantities(prev => ({
                ...prev,
                [key]: quantity,
            }));
        }
    };

    // Get numeric quantity value
    const getNumericQuantity = (productId) => {
        const key = String(productId);
        const qty = returnQuantities[key];
        if (!qty || qty === '' || qty === '.') return 0;
        return parseFloat(qty) || 0;
    };

    // Calculate return value for a product
    const getReturnValue = (product) => {
        const qty = getNumericQuantity(product.Product_Id);
        return (qty * (product.Product_Rate || 0)).toFixed(2);
    };

    // Get total return value
    const getTotalReturnValue = () => {
        return productData.reduce((total, product) => {
            const qty = getNumericQuantity(product.Product_Id);
            return total + (qty * (product.Product_Rate || 0));
        }, 0).toFixed(2);
    };

    // Get products with return quantities > 0
    const getReturnProducts = () => {
        return productData.filter(product => getNumericQuantity(product.Product_Id) > 0);
    };

    // Handle update button press - show summary modal
    const handleUpdate = () => {
        const returnProducts = getReturnProducts();
        if (returnProducts.length === 0) {
            Alert.alert('No Products Selected', 'Please enter return quantity for at least one product.');
            return;
        }
        setShowSummaryModal(true);
    };

    // Handle final submit from summary modal
    const handleSubmit = async () => {
        if (!selectedNarration) {
            Alert.alert('Narration Required', 'Please select a narration reason.');
            return;
        }

        const returnProducts = getReturnProducts();
        
        // Build Product_Array for API (matching DeliveryUpdate structure)
        const Product_Array = returnProducts.map((product, index) => {
            const qty = getNumericQuantity(product.Product_Id);
            const itemRate = product.Product_Rate || 0;
            const amount = qty * itemRate;
            const gstP = product.Gst_P || 0;
            const cgstP = product.Cgst_P || gstP / 2;
            const sgstP = product.Sgst_P || gstP / 2;
            const igstP = product.Igst_P || 0;
            
            // Calculate tax amounts
            const taxableAmount = amount / (1 + gstP / 100);
            const cgstAmo = (taxableAmount * cgstP) / 100;
            const sgstAmo = (taxableAmount * sgstP) / 100;
            const igstAmo = (taxableAmount * igstP) / 100;

            return {
                S_No: index + 1,
                Item_Id: product.Product_Id,
                Bill_Qty: qty,
                Alt_Bill_Qty: 0,
                Act_Qty: qty,
                Alt_Act_Qty: 0,
                Item_Rate: itemRate,
                GoDown_Id: product.GoDown_Id || item?.GoDown_Id || 0,
                Amount: amount,
                Free_Qty: 0,
                Total_Qty: qty,
                Taxble: 1,
                Taxable_Rate: itemRate,
                HSN_Code: product.HSN_Code || '',
                Unit_Id: product.UOM_Id || '',
                Unit_Name: product.Units || '',
                Act_unit_Id: product.UOM_Id || '',
                Alt_Act_Unit_Id: product.UOM_Id || '',
                Taxable_Amount: taxableAmount,
                Tax_Rate: gstP,
                Cgst: cgstP,
                Cgst_Amo: cgstAmo,
                Sgst: sgstP,
                Sgst_Amo: sgstAmo,
                Igst: igstP,
                Igst_Amo: igstAmo,
                Final_Amo: amount,
                Batch_Name: '',
            };
        });

        // Build credit note payload based on create or update mode
        let creditNotePayload;
        let apiUrl;
        let httpMethod;

        if (isEditMode) {
            // Update payload (matching updateCreditNote API structure)
            creditNotePayload = {
                CR_Id: item?.CR_Id,
                Retailer_Id: parseInt(item?.Retailer_Id || 0),
                Branch_Id: parseInt(item?.Branch_Id || 1),
                Voucher_Type: 45,
                CR_Date: item?.CR_Date || new Date().toISOString(),
                Ref_Inv_Number: item?.Ref_Inv_Number || item?.CR_Inv_No || '',
                Ref_Inv_Date: item?.Ref_Inv_Date || new Date().toISOString(),
                Narration: selectedNarration,
                Altered_by: userId,
                GST_Inclusive: item?.GST_Inclusive ?? 1,
                IS_IGST: item?.IS_IGST ?? 0,
                Round_off: item?.Round_off || 0,
                Stock_Item_Ledger_Name: item?.Stock_Item_Ledger_Name || '',
                Cancel_status: 1,
                Product_Array: Product_Array,
                Expence_Array: [],
                Staffs_Array: [],
            };
            apiUrl = API.creditNote();
            httpMethod = "PUT";
        } else {
            // Create payload
            creditNotePayload = {
                Retailer_Id: parseInt(item?.Retailer_Id || item?.retailerId || 0),
                Branch_Id: parseInt(item?.Branch_Id || item?.branchId || 1),
                Voucher_Type: 45,
                Ref_Inv_Number: item?.Inv_No || item?.Do_Inv_No || '',
                Ref_Inv_Date: item?.Inv_Date || item?.Do_Date || new Date().toISOString(),
                Narration: selectedNarration,
                Created_by: userId,
                GST_Inclusive: item?.GST_Inclusive ?? 1,
                IS_IGST: item?.IS_IGST ?? 0,
                Round_off: 0,
                Stock_Item_Ledger_Name: item?.Stock_Item_Ledger_Name || '',
                Product_Array: Product_Array,
                Expence_Array: [],
                Staffs_Array: [],
            };
            apiUrl = API.creditNote();
            httpMethod = "POST";
        }

        console.log(`${isEditMode ? 'Update' : 'Create'} Credit Note Payload:`, JSON.stringify(creditNotePayload, null, 2));

        setIsSubmitting(true);
        try {
            const response = await fetch(apiUrl, {
                method: httpMethod,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(creditNotePayload),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setShowSummaryModal(false);
                Alert.alert('Success', isEditMode ? 'Credit note updated successfully!' : 'Credit note created successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', result.message || `Failed to ${isEditMode ? 'update' : 'create'} credit note`);
            }
        } catch (error) {
            console.error('Credit Note Error:', error);
            Alert.alert('Error', 'Failed to submit. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader title="Sales Return" navigation={navigation} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Render error state
    if (isError) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader title="Sales Return" navigation={navigation} />
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={48} color={customColors.error} />
                    <Text style={styles.errorText}>Failed to load products</Text>
                    <Text style={styles.errorSubText}>Please try again later</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Remove item from return list
    const removeReturnItem = (productId) => {
        const key = String(productId);
        setReturnQuantities(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
        
        // Close modal if no items left
        const remainingProducts = getReturnProducts().filter(p => String(p.Product_Id) !== key);
        if (remainingProducts.length === 0) {
            setShowSummaryModal(false);
        }
    };

    // Render summary item
    const renderSummaryItem = ({ item: product }) => (
        <View style={styles.summaryProductItem}>
            <View style={styles.summaryProductInfo}>
                <Text style={styles.summaryProductName} numberOfLines={2}>
                    {product.Product_Name}
                </Text>
                <View style={styles.summaryProductDetails}>
                    <Text style={styles.summaryProductQty}>
                        Qty: {getNumericQuantity(product.Product_Id)} × ₹{product.Product_Rate}
                    </Text>
                    <Text style={styles.summaryProductValue}>
                        ₹{getReturnValue(product)}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.removeItemButton}
                onPress={() => removeReturnItem(product.Product_Id)}
                disabled={isSubmitting}
            >
                <Icon name="delete" size={22} color={customColors.error} />
            </TouchableOpacity>
        </View>
    );


    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title={isEditMode ? "Edit Credit Note" : "Sales Return"}
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="check"
                onRightPress={handleUpdate}
            />

            <ScrollView 
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Brand Accordions */}
                {groupedData.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Icon name="inventory-2" size={64} color={customColors.grey700} />
                        <Text style={styles.emptyTitle}>No Active Products</Text>
                        <Text style={styles.emptySubtitle}>There are no active products available for return</Text>
                    </View>
                ) : (
                    groupedData.map((brand) => (
                        <View key={brand.brandName} style={styles.brandSection}>
                            {/* Brand Header */}
                            <TouchableOpacity
                                style={styles.brandHeader}
                                onPress={() => toggleBrand(brand.brandName)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.brandHeaderContent}>
                                    <View style={styles.brandInfo}>
                                        <Text style={styles.brandName}>{brand.brandName}</Text>
                                        <Text style={styles.brandStat}>
                                            {brand.groups.length} Groups | {brand.totalProducts} Products
                                        </Text>
                                    </View>
                                    <Icon
                                        name={expandedBrand === brand.brandName ? "expand-less" : "expand-more"}
                                        size={24}
                                        color={customColors.white}
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Brand Content - Product Groups */}
                            {expandedBrand === brand.brandName && (
                                <View style={styles.brandContent}>
                                    {brand.groups.map((group) => {
                                        const groupKey = `${brand.brandName}-${group.groupName}`;
                                        const isGroupExpanded = expandedGroup[groupKey];
                                        
                                        return (
                                            <View key={group.groupName} style={styles.groupSection}>
                                                {/* Group Header */}
                                                <TouchableOpacity
                                                    style={styles.groupHeader}
                                                    onPress={() => toggleGroup(brand.brandName, group.groupName)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={styles.groupHeaderContent}>
                                                        <Text style={styles.groupName}>{group.groupName}</Text>
                                                        <View style={styles.groupHeaderRight}>
                                                            <Text style={styles.groupProductCount}>
                                                                {group.products.length} items
                                                            </Text>
                                                            <Icon
                                                                name={isGroupExpanded ? "expand-less" : "expand-more"}
                                                                size={20}
                                                                color={customColors.grey700}
                                                            />
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {/* Group Content - Products */}
                                                {isGroupExpanded && (
                                                    <View style={styles.productsContainer}>
                                                        {group.products.map((product, productIndex) => (
                                                            <View
                                                                key={product.Product_Id}
                                                                style={[
                                                                    styles.productItem,
                                                                    productIndex === group.products.length - 1 && styles.lastProductItem
                                                                ]}
                                                            >
                                                                <View style={styles.productInfo}>
                                                                    <Text style={styles.productName} numberOfLines={2}>
                                                                        {product.Product_Name}
                                                                    </Text>
                                                                    <View style={styles.productDetails}>
                                                                        <Text style={styles.productRate}>
                                                                            ₹{product.Product_Rate || 0}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <View style={styles.quantityContainer}>
                                                                    <Text style={styles.quantityLabel}>Qty</Text>
                                                                    <TextInput
                                                                        style={styles.quantityInput}
                                                                        keyboardType="decimal-pad"
                                                                        value={returnQuantities[String(product.Product_Id)]?.toString() || ''}
                                                                        onChangeText={(text) => handleQuantityChange(product.Product_Id, text)}
                                                                        placeholder="0"
                                                                        placeholderTextColor={customColors.grey700}
                                                                    />
                                                                    {getNumericQuantity(product.Product_Id) > 0 && (
                                                                        <Text style={styles.returnValue}>
                                                                            ₹{getReturnValue(product)}
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Summary Modal */}
            <Modal
                visible={showSummaryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => !isSubmitting && setShowSummaryModal(false)}
            >
                <View style={styles.summaryModalOverlay}>
                    <View style={styles.summaryModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.summaryModalHeader}>
                            <Text style={styles.summaryModalTitle}>Return Summary</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => !isSubmitting && setShowSummaryModal(false)}
                                disabled={isSubmitting}
                            >
                                <Icon name="close" size={24} color={customColors.grey900} />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={styles.summaryModalContent}>
                            {/* Narration Selector */}
                            <View style={styles.narrationSection}>
                                <Text style={styles.narrationLabel}>Narration *</Text>
                                <View style={styles.narrationOptions}>
                                    {narrationOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={[
                                                styles.narrationChip,
                                                selectedNarration === option && styles.narrationChipSelected
                                            ]}
                                            onPress={() => setSelectedNarration(option)}
                                            disabled={isSubmitting}
                                        >
                                            <Text style={[
                                                styles.narrationChipText,
                                                selectedNarration === option && styles.narrationChipTextSelected
                                            ]}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <Text style={styles.summaryProductsTitle}>
                                Products ({getReturnProducts().length})
                            </Text>
                            
                            <FlatList
                                data={getReturnProducts()}
                                renderItem={renderSummaryItem}
                                keyExtractor={(item) => item.Product_Id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.summaryList}
                            />

                            {/* Total */}
                            <View style={styles.summaryTotalContainer}>
                                <Text style={styles.summaryTotalLabel}>Total Value</Text>
                                <Text style={styles.summaryTotalValue}>₹{getTotalReturnValue()}</Text>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!selectedNarration || isSubmitting) && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            activeOpacity={0.8}
                            disabled={!selectedNarration || isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={customColors.white} />
                            ) : (
                                <Text style={styles.submitButtonText}>{isEditMode ? 'Update Return' : 'Submit Return'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default SalesReturn;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customColors.background,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customColors.background,
        padding: 20,
    },
    errorText: {
        ...typography.h3(),
        color: customColors.error,
        marginTop: 10,
        textAlign: 'center',
    },
    errorSubText: {
        ...typography.body2(),
        color: customColors.grey700,
        marginTop: 5,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        ...typography.h2(),
        color: customColors.grey900,
        marginTop: 15,
    },
    emptySubtitle: {
        ...typography.body1(),
        color: customColors.grey700,
        textAlign: 'center',
        marginTop: 8,
    },
    // Brand Section
    brandSection: {
        marginHorizontal: 15,
        marginTop: 15,
        backgroundColor: customColors.white,
        borderRadius: 8,
        ...shadows.small,
        overflow: 'hidden',
    },
    brandHeader: {
        backgroundColor: customColors.primary,
        padding: 12,
    },
    brandHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandInfo: {
        flex: 1,
    },
    brandName: {
        ...typography.h4(),
        color: customColors.white,
        marginBottom: 4,
    },
    brandStat: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
    },
    brandContent: {
        backgroundColor: customColors.white,
    },
    // Group Section
    groupSection: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    groupHeader: {
        backgroundColor: customColors.background,
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    groupHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    groupName: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
    },
    groupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupProductCount: {
        ...typography.caption(),
        color: customColors.grey700,
        marginRight: 5,
    },
    // Products
    productsContainer: {
        padding: 12,
    },
    productItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    lastProductItem: {
        borderBottomWidth: 0,
    },
    productInfo: {
        flex: 1,
        paddingRight: 12,
    },
    productName: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 6,
        lineHeight: 20,
    },
    productDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    productRate: {
        ...typography.body2(),
        color: customColors.success,
        fontWeight: '600',
    },
    availableQty: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    quantityContainer: {
        alignItems: 'center',
        minWidth: 80,
    },
    quantityLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        marginBottom: 4,
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        minWidth: 70,
        textAlign: 'center',
        ...typography.body1(),
        color: customColors.grey900,
        backgroundColor: customColors.background,
    },
    returnValue: {
        ...typography.caption(),
        color: customColors.success,
        fontWeight: '600',
        marginTop: 4,
    },
    // Summary Modal Styles
    summaryModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    summaryModalContainer: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
    },
    summaryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    summaryModalTitle: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: '600',
    },
    closeButton: {
        padding: 5,
    },
    summaryModalContent: {
        paddingHorizontal: 20,
        paddingTop: 15,
        height: "65%",
    },
    summaryProductsTitle: {
        ...typography.h4(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 15,
    },
    summaryList: {
        paddingBottom: 10,
    },
    summaryProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    summaryProductInfo: {
        flex: 1,
    },
    removeItemButton: {
        padding: 8,
        marginLeft: 10,
    },
    summaryProductName: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 8,
        lineHeight: 20,
    },
    summaryProductDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryProductQty: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: '600',
    },
    summaryProductValue: {
        ...typography.body2(),
        color: customColors.success,
        fontWeight: '600',
    },
    summaryTotalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 12,
        backgroundColor: customColors.background,
        borderRadius: 8,
        marginTop: 10,
    },
    summaryTotalLabel: {
        ...typography.h4(),
        color: customColors.grey900,
        fontWeight: '600',
    },
    summaryTotalValue: {
        ...typography.h3(),
        color: customColors.success,
        fontWeight: '700',
    },
    // Narration Section
    narrationSection: {
        marginBottom: 20,
    },
    narrationLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 10,
    },
    narrationOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    narrationChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: customColors.background,
        borderWidth: 1,
        borderColor: customColors.border,
    },
    narrationChipSelected: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    narrationChipText: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: '500',
    },
    narrationChipTextSelected: {
        color: customColors.white,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        paddingVertical: 16,
        paddingHorizontal: 20,
        margin: 20,
        borderRadius: 8,
        alignItems: 'center',
        ...shadows.medium,
    },
    submitButtonDisabled: {
        backgroundColor: customColors.grey700,
        opacity: 0.6,
    },
    submitButtonText: {
        ...typography.h4(),
        color: customColors.white,
        fontWeight: '600',
    },
});
