import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import { fetchRetailerClosingStock } from "../../Api/retailers";
import { customColors, typography, shadows } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SalesReturn = ({ route }) => {
    const { item, isEditMode } = route.params;
    console.log("ClosingStock Route Params:", item, isEditMode);
    const navigation = useNavigation();
    const [showSummaryModal, setShowSummaryModal] = React.useState(false);
    const [returnQuantities, setReturnQuantities] = React.useState({});
    const [expandedBrands, setExpandedBrands] = React.useState({});
    const [expiryDate, setExpiryDate] = React.useState(new Date());
    const [selectedReason, setSelectedReason] = React.useState('');
    const [showReasonModal, setShowReasonModal] = React.useState(false);
    const [userId, setUserId] = React.useState(null);

    React.useEffect(() => {
        const getUserId = async () => {
            try {
                const userID = await AsyncStorage.getItem("UserId");
                setUserId(userID);
            } catch (error) {
                console.error("Failed to get User_Id:", error);
            }
        };

        getUserId();
    }, []);

    // Effect to pre-populate form data in edit mode
    React.useEffect(() => {
        if (isEditMode && item.products && item.products.length > 0) {
            // Pre-populate return quantities
            const quantities = {};
            item.products.forEach(product => {
                quantities[product.productId] = product.returnQuantity.toString();
            });
            setReturnQuantities(quantities);

            // Set existing reason and expiry date
            setSelectedReason(item.reason);
            if (item.products[0]?.expireDate) {
                setExpiryDate(new Date(item.products[0].expireDate));
            }
        }
    }, [isEditMode, item]);

    const { data: retailersStock = [], isLoading: retailersStockLoading, error: retailersStockError} = useQuery({
        queryKey: ["closingStock", item.Retailer_Id || item.retailerId],
        queryFn: () => fetchRetailerClosingStock(item.Retailer_Id || item.retailerId),
        enabled: !!item.Retailer_Id || !!item.retailerId,
        select: data => {
            return data;
        },
    });

    console.log("Retailers Stock Data:", retailersStock);

    // Update quantity for a specific product
    const updateReturnQuantity = (productId, quantity) => {
        setReturnQuantities(prev => ({
            ...prev,
            [productId]: quantity
        }));
    };

    // Toggle brand accordion
    const toggleBrand = (brandId) => {
        setExpandedBrands(prev => ({
            ...prev,
            [brandId]: !prev[brandId]
        }));
    };

    // Get total items with return quantities
    const getTotalReturnItems = () => {
        return Object.values(returnQuantities).filter(qty => parseFloat(qty) > 0).length;
    };

    // Reason options
    const reasonOptions = ['Good', 'Damage', 'Bad'];

    // Calculate total return value
    const calculateTotalReturnValue = () => {
        let total = 0;
        Object.keys(returnQuantities).forEach(productId => {
            const quantity = parseFloat(returnQuantities[productId]) || 0;
            const product = retailersStock.flatMap(brand => brand.GroupedProductArray)
                .find(p => p.Product_Id.toString() === productId);
            if (product) {
                total += quantity * product.Product_Rate;
            }
        });
        return total.toFixed(2);
    };

    // Handle update button press - show summary modal
    const handleUpdatePress = () => {
        const hasReturns = Object.values(returnQuantities).some(qty => parseFloat(qty) > 0);
        
        if (!hasReturns) {
            Alert.alert("No Returns", "Please enter return quantities for at least one product.");
            return;
        }
        
        setShowSummaryModal(true);
    };

    // Handle final submit from summary modal
    const handleFinalSubmit = async () => {
        if (!selectedReason) {
            Alert.alert("Missing Information", "Please select a reason for the return.");
            return;
        }

        try {
            // Prepare the details array for API
            const details = Object.keys(returnQuantities)
                .filter(productId => parseFloat(returnQuantities[productId]) > 0)
                .map(productId => {
                    const product = retailersStock.flatMap(brand => brand.GroupedProductArray || [])
                        .find(p => p.Product_Id.toString() === productId);
                    
                    const baseDetail = {
                        productId: parseInt(productId),
                        batch: "", // Set to empty as not available in current data
                        expireDate: expiryDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
                        unitId: 1, // Default unit ID, adjust as needed
                        returnQuantity: parseFloat(returnQuantities[productId]),
                        itemRate: product?.Product_Rate || 0,
                        Reason: selectedReason
                    };

                    // In edit mode, include the existing product detail ID if available
                    if (isEditMode) {
                        const existingProduct = item.products?.find(p => p.productId === productId);
                        if (existingProduct) {
                            baseDetail.id = existingProduct.id;
                            baseDetail.salesReturnId = existingProduct.salesReturnId;
                        }
                    }

                    return baseDetail;
                });

            // Prepare the main request body
            const requestBody = {
                salesReturnDate: isEditMode ? item.salesReturnDate : new Date().toISOString().split('T')[0],
                retailerId: item.retailerId || item.Retailer_Id,
                branchId: item.branchId || item.Branch_Id,
                godownId: item.godownId || "",
                reason: selectedReason,
                createdBy: userId,
                details: details
            };

            // In edit mode, include the sales return ID
            if (isEditMode) {
                requestBody.id = item.id;
                requestBody.updatedBy = userId;
            }

            console.log("Sales Return Request Body:", requestBody);

            // Show confirmation dialog
            const confirmTitle = isEditMode ? "Confirm Update" : "Confirm Return";
            const confirmMessage = `Total return value: ₹${calculateTotalReturnValue()}\nExpiry Date: ${expiryDate.toDateString()}\nReason: ${selectedReason}\nProducts: ${details.length}\nAre you sure you want to ${isEditMode ? 'update' : 'process'} this return?`;
            
            Alert.alert(
                confirmTitle,
                confirmMessage,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Confirm", 
                        onPress: async () => {
                            try {
                                const url = API.salesReturnItems();
                                console.log("API URL:", url);
                                const method = isEditMode ? 'PUT' : 'POST';
                                console.log("HTTP Method:", method);

                                const response = await fetch(url, {
                                    method: method,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(requestBody)
                                });

                                const responseData = await response.json();
                                console.log("API Response:", responseData);

                                if (response.ok) {
                                    const successMessage = isEditMode 
                                        ? "Sales return has been updated successfully."
                                        : "Sales return has been processed successfully.";
                                    
                                    Alert.alert(
                                        "Success", 
                                        successMessage,
                                        [{
                                            text: "OK",
                                            onPress: () => {
                                                setShowSummaryModal(false);
                                                navigation.goBack();
                                            }
                                        }]
                                    );
                                } else {
                                    throw new Error(responseData.message || `Failed to ${isEditMode ? 'update' : 'process'} return`);
                                }
                            } catch (apiError) {
                                console.error('API Error:', apiError);
                                Alert.alert(
                                    "Error", 
                                    `Failed to ${isEditMode ? 'update' : 'process'} return: ${apiError.message}`
                                );
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error preparing return data:', error);
            Alert.alert(
                "Error", 
                "Failed to prepare return data. Please try again."
            );
        }
    };

    // Get return products for summary
    const getReturnProducts = () => {
        console.log("Return Quantities:", returnQuantities);
        console.log("Retailers Stock:", retailersStock);
        
        const returnProductIds = Object.keys(returnQuantities)
            .filter(productId => parseFloat(returnQuantities[productId]) > 0);
            
        console.log("Return Product IDs:", returnProductIds);
        
        return returnProductIds.map(productId => {
            const product = retailersStock.flatMap(brand => brand.GroupedProductArray || [])
                .find(p => p.Product_Id.toString() === productId);
            
            console.log(`Product ${productId}:`, product);
            
            return {
                productId,
                quantity: parseFloat(returnQuantities[productId]),
                productName: product?.Product_Name || 'Unknown Product',
                rate: product?.Product_Rate || 0,
                totalValue: parseFloat(returnQuantities[productId]) * (product?.Product_Rate || 0)
            };
        });
    };

    const renderProductItem = (product) => {
        const productId = product.Product_Id.toString();
        const currentQuantity = returnQuantities[productId] || '';
        const maxQuantity = product.totalQty || 0;

        return (
            <View key={product.Product_Id} style={styles.productItem}>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.Product_Name.trim()}
                    </Text>
                    <View style={styles.productDetails}>
                        <Text style={styles.productRate}>Rate: ₹{product.Product_Rate}</Text>
                        <Text style={styles.availableQty}>Available: {maxQuantity}</Text>
                    </View>
                    {product.lastDeliveryDate && (
                        <Text style={styles.lastDelivery}>
                            Last Delivery: {product.entryDate} ({product.entryDays} days ago)
                        </Text>
                    )}
                </View>
                
                <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Return Qty</Text>
                    <TextInput
                        style={styles.quantityInput}
                        value={currentQuantity}
                        onChangeText={(text) => {
                            // Allow only numbers and decimal point
                            const sanitized = text.replace(/[^0-9.]/g, '');
                            // Prevent multiple decimal points
                            const parts = sanitized.split('.');
                            if (parts.length > 2) return;
                            
                            const quantity = parseFloat(sanitized) || 0;
                            if (quantity <= maxQuantity) {
                                updateReturnQuantity(productId, sanitized);
                            }
                        }}
                        placeholder="0.0"
                        placeholderTextColor={customColors.textSecondary}
                        keyboardType="numeric"
                        maxLength={10}
                    />
                    {currentQuantity && parseFloat(currentQuantity) > 0 && (
                        <Text style={styles.returnValue}>
                            ₹{(parseFloat(currentQuantity) * product.Product_Rate).toFixed(2)}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const renderBrandSection = (brand) => {
        const hasProducts = brand.GroupedProductArray && brand.GroupedProductArray.length > 0;
        const brandId = brand.Brand_Id || 'unknown';
        const isExpanded = expandedBrands[brandId];
        
        if (!hasProducts) return null;

        return (
            <View key={brandId} style={styles.brandSection}>
                <TouchableOpacity 
                    style={styles.brandHeader} 
                    onPress={() => toggleBrand(brandId)}
                    activeOpacity={0.7}
                >
                    <View style={styles.brandHeaderContent}>
                        <View style={styles.brandInfo}>
                            <Text style={styles.brandName}>
                                {brand.Brand_Name || 'Unknown Brand'}
                            </Text>
                            <View style={styles.brandStats}>
                                <Text style={styles.brandStat}>
                                    Total Qty: {brand.totalQty}
                                </Text>
                                <Text style={styles.brandStat}>
                                    Value: ₹{brand.totalValue}
                                </Text>
                            </View>
                        </View>
                        <Icon 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={24} 
                            color={customColors.white} 
                        />
                    </View>
                </TouchableOpacity>
                
                {isExpanded && (
                    <View style={styles.productsContainer}>
                        {brand.GroupedProductArray.map(product => renderProductItem(product))}
                    </View>
                )}
            </View>
        );
    };

    const renderSummaryModal = () => {
        const returnProducts = getReturnProducts();
        console.log("Return Products in Modal:", returnProducts);
        
        return (
            <Modal
                visible={showSummaryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSummaryModal(false)}
            >
                <View style={styles.summaryModalOverlay}>
                    <View style={styles.summaryModalContainer}>
                        {/* Header */}
                        <View style={styles.summaryModalHeader}>
                            <Text style={styles.summaryModalTitle}>Return Summary</Text>
                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={() => setShowSummaryModal(false)}
                            >
                                <Icon name="close" size={24} color={customColors.grey700} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.summaryModalContent} showsVerticalScrollIndicator={false}>
                            {/* Products Summary */}
                            <Text style={styles.summaryProductsTitle}>Return Products ({returnProducts.length})</Text>
                            
                            {returnProducts.length === 0 ? (
                                <View style={styles.noProductsContainer}>
                                    <Text style={styles.noProductsText}>No products selected for return</Text>
                                </View>
                            ) : (
                                returnProducts.map((product, index) => (
                                    <View key={product.productId} style={styles.summaryProductItem}>
                                        <View style={styles.summaryProductInfo}>
                                            <Text style={styles.summaryProductName} numberOfLines={2}>
                                                {product.productName?.trim()}
                                            </Text>
                                            <View style={styles.summaryProductDetails}>
                                                <Text style={styles.summaryProductQty}>
                                                    Qty: {product.quantity}
                                                </Text>
                                                <Text style={styles.summaryProductValue}>
                                                    ₹{product.totalValue.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                            
                            {/* Total Value */}
                            <View style={styles.summaryTotalContainer}>
                                <Text style={styles.summaryTotalLabel}>Total Return Value:</Text>
                                <Text style={styles.summaryTotalValue}>₹{calculateTotalReturnValue()}</Text>
                            </View>
                            
                            {/* Expiry Date Picker */}
                            <View style={styles.summaryOptionRow}>
                                <Text style={styles.summaryOptionLabel}>Expiry Date</Text>
                                <DatePickerButton
                                    date={expiryDate}
                                    onDateChange={setExpiryDate}
                                    placeholder="Select Date"
                                    style={styles.summaryDatePickerButton}
                                />
                            </View>
                            
                            {/* Reason Selection */}
                            <View style={styles.summaryOptionRow}>
                                <Text style={styles.summaryOptionLabel}>Reason</Text>
                                <TouchableOpacity 
                                    style={styles.summaryReasonButton}
                                    onPress={() => setShowReasonModal(true)}
                                >
                                    <Text style={[
                                        styles.summaryReasonButtonText,
                                        !selectedReason && styles.summaryReasonPlaceholder
                                    ]}>
                                        {selectedReason || 'Select Reason'}
                                    </Text>
                                    <Icon name="expand-more" size={20} color={customColors.grey700} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                        
                        {/* Submit Button */}
                        <TouchableOpacity 
                            style={[
                                styles.submitButton,
                                returnProducts.length === 0 && styles.submitButtonDisabled
                            ]}
                            onPress={handleFinalSubmit}
                            activeOpacity={0.8}
                            disabled={returnProducts.length === 0}
                        >
                            <Text style={styles.submitButtonText}>Submit Return</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderReasonModal = () => {
        return (
            <Modal
                visible={showReasonModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReasonModal(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowReasonModal(false)}
                >
                    <View style={styles.reasonModal}>
                        <Text style={styles.reasonModalTitle}>Select Reason</Text>
                        {reasonOptions.map((reason) => (
                            <TouchableOpacity
                                key={reason}
                                style={[
                                    styles.reasonOption,
                                    selectedReason === reason && styles.selectedReasonOption
                                ]}
                                onPress={() => {
                                    setSelectedReason(reason);
                                    setShowReasonModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.reasonOptionText,
                                    selectedReason === reason && styles.selectedReasonText
                                ]}>
                                    {reason}
                                </Text>
                                {selectedReason === reason && (
                                    <Icon name="check" size={20} color={customColors.white} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    if (retailersStockLoading) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader
                    title={isEditMode ? "Edit Sales Return" : "Sales Return"}
                    navigation={navigation}
                />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading stock data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (retailersStockError) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader
                    title={isEditMode ? "Edit Sales Return" : "Sales Return"}
                    navigation={navigation}
                />
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={50} color={customColors.danger} />
                    <Text style={styles.errorText}>Failed to load stock data</Text>
                    <Text style={styles.errorSubText}>{retailersStockError.message}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title={
                    isEditMode 
                        ? (getTotalReturnItems() > 0 ? `Edit Return (${getTotalReturnItems()} items)` : "Edit Sales Return")
                        : (getTotalReturnItems() > 0 ? `Sales Return (${getTotalReturnItems()} items)` : "Sales Return")
                }
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName={isEditMode ? "save" : "update"}
                onRightPress={handleUpdatePress}
            />

            <ScrollView 
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {retailersStock.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Icon name="inventory-2" size={60} color={customColors.textSecondary} />
                        <Text style={styles.emptyTitle}>No Stock Data</Text>
                        <Text style={styles.emptySubtitle}>
                            This retailer has no stock available for return
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Brand Sections */}
                        {retailersStock.map(brand => renderBrandSection(brand))}
                    </>
                )}
            </ScrollView>
            
            {/* Summary Modal */}
            {renderSummaryModal()}
            
            {/* Reason Selection Modal */}
            {renderReasonModal()}
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
        marginBottom: 8,
    },
    brandStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    brandStat: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
    },
    productsContainer: {
        padding: 12,
    },
    productItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
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
    lastDelivery: {
        ...typography.caption(),
        color: customColors.grey700,
        fontStyle: 'italic',
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
    returnOptionsContainer: {
        backgroundColor: customColors.white,
        padding: 15,
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 8,
        ...shadows.small,
    },
    optionsTitle: {
        ...typography.h4(),
        color: customColors.grey900,
        marginBottom: 15,
    },
    optionRow: {
        marginBottom: 15,
    },
    optionLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 8,
    },
    datePickerButton: {
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 6,
        backgroundColor: customColors.background,
    },
    reasonButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: customColors.background,
    },
    reasonButtonText: {
        ...typography.body1(),
        color: customColors.grey900,
    },
    reasonPlaceholder: {
        color: customColors.grey700,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reasonModal: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 20,
        width: '80%',
        maxWidth: 300,
    },
    reasonModalTitle: {
        ...typography.h4(),
        color: customColors.grey900,
        marginBottom: 15,
        textAlign: 'center',
    },
    reasonOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginBottom: 8,
        backgroundColor: customColors.background,
    },
    selectedReasonOption: {
        backgroundColor: customColors.primary,
    },
    reasonOptionText: {
        ...typography.body1(),
        color: customColors.grey900,
    },
    selectedReasonText: {
        color: customColors.white,
        fontWeight: '600',
    },
    // Summary Modal Styles
    summaryModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    summaryModalContainer: {
        height: '85%',
        width: '100%',
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingTop: 10,
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
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    summaryProductsTitle: {
        ...typography.h4(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 15,
    },
    summaryProductItem: {
        backgroundColor: customColors.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    summaryProductInfo: {
        flex: 1,
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
        // backgroundColor: customColors.primary,
        borderRadius: 8,
        marginVertical: 20,
    },
    summaryTotalLabel: {
        ...typography.h4(),
        color: customColors.grey900,
        fontWeight: '600'
    },
    summaryTotalValue: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: '700',
    },
    summaryOptionRow: {
        marginBottom: 20,
    },
    summaryOptionLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: '600',
        marginBottom: 8,
    },
    summaryDatePickerButton: {
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 6,
        backgroundColor: customColors.background,
    },
    summaryReasonButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customColors.border,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: customColors.background,
    },
    summaryReasonButtonText: {
        ...typography.body1(),
        color: customColors.grey900,
    },
    summaryReasonPlaceholder: {
        color: customColors.grey700,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 8,
        margin: 20,
        alignItems: 'center',
        ...shadows.medium,
    },
    submitButtonText: {
        ...typography.h4(),
        color: customColors.white,
        fontWeight: '600',
    },
    submitButtonDisabled: {
        backgroundColor: customColors.grey700,
        opacity: 0.6,
    },
    noProductsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noProductsText: {
        ...typography.body1(),
        color: customColors.grey700,
        fontStyle: 'italic',
    },
});
