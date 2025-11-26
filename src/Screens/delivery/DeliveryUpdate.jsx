import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    ToastAndroid,
    Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { fetchUsers } from "../../Api/employee";
import { fetchDefaultAccountMaster } from "../../Api/receipt";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import LocationIndicator from "../../Components/LocationIndicator";

const DeliveryUpdate = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState(null);
    const [deliveryData, setDeliveryData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [companyId, setCompanyId] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const [callCenterId, setCallCenterId] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [filteredData, setFilteredData] = useState([]);

    const [showUpdateScreen, setShowUpdateScreen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState("0");
    const [partialAmount, setPartialAmount] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    // New states for enhanced features
    const [showProductModal, setShowProductModal] = useState(false);
    const [updatedProducts, setUpdatedProducts] = useState([]);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [hasProductChanges, setHasProductChanges] = useState(false);
    const [selectedCancelReason, setSelectedCancelReason] = useState("");

    const deliveryStatus = { 5: "Pending", 6: "Cancelled", 7: "Delivered" };
    const paymentStatus = { 0: "Pending", 3: "Completed" };
    const paymentMode = { 1: "Cash", 2: "G-Pay", 3: "Credit" };

    const cancelReasons = [
        "Shop Closed",
        "No Sale",
        "Customer Unavailable",
        "Payment Issue",
        "Customer Cancelled",
        "Stock Not Available",
        "Other"
    ];

    useEffect(() => {
        fetchDeliveryData();
    }, [selectedFromDate, selectedToDate]);

    const fetchDeliveryData = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            const companyId = await AsyncStorage.getItem("Company_Id");
            const branchId = await AsyncStorage.getItem("branchId");
            let parsedBranchId = branchId;

            if (typeof branchId === "string") {
                parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ''));
            } else {
                parsedBranchId = parseInt(branchId);
            }

            setCompanyId(companyId);
            setUserId(userId);
            setBranchId(parsedBranchId);

            const url = `${API.delivery()}${userId}&Fromdate=${fromDate}&Todate=${toDate}`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                setDeliveryData(result.data || []);
            } else {
                setDeliveryData([]);
            }
        } catch (error) {
            console.error("Error fetching delivery data:", error);
            setDeliveryData([]);
        }
    };

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const results = deliveryData.filter(item =>
            item.Retailer_Name?.toLowerCase().includes(query),
        );
        setFilteredData(results);
    }, [deliveryData, searchQuery]);

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const { data: users = [] } = useQuery({
        queryKey: ["users", companyId],
        queryFn: () => fetchUsers(companyId),
        enabled: !!companyId,
    });

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const openUpdateScreen = async item => {
        setSelectedDelivery(item);
        setSelectedPaymentMode(item.Payment_Mode?.toString() || "1");

        try {
            const storedProducts = await AsyncStorage.getItem(
                `updatedProducts_${item.Do_Id}`,
            );
            if (storedProducts) {
                const parsedProducts = JSON.parse(storedProducts);
                setUpdatedProducts(parsedProducts);
                // Check if stored products have changes
                setHasProductChanges(checkForProductChanges(parsedProducts, item.Products_List));
            } else {
                const originalProducts = item.Products_List ? [...item.Products_List] : [];
                setUpdatedProducts(originalProducts);
                setHasProductChanges(false); // No changes initially
            }
        } catch (error) {
            console.error("Error loading stored products:", error);
            const originalProducts = item.Products_List ? [...item.Products_List] : [];
            setUpdatedProducts(originalProducts);
            setHasProductChanges(false);
        }
        setShowUpdateScreen(true);
    };

    const checkForProductChanges = (updatedProducts, originalProducts) => {
        if (!originalProducts || !updatedProducts) return false;

        // Check if number of products is different
        if (updatedProducts.length !== originalProducts.length) return true;

        // Check each product for changes
        for (let i = 0; i < updatedProducts.length; i++) {
            const updated = updatedProducts[i];
            const original = originalProducts.find(p => p.Item_Id === updated.Item_Id);

            if (!original) return true; // Product not found in original

            // Check if quantity or other key values changed
            if (
                updated.Bill_Qty !== original.Bill_Qty ||
                updated.Total_Qty !== original.Total_Qty ||
                updated.Final_Amo !== original.Final_Amo
            ) {
                return true;
            }
        }

        return false;
    };

    // New function to handle product quantity updates
    const handleProductQuantityChange = (productIndex, newQuantity) => {
        const qty = Math.max(0, parseFloat(newQuantity) || 0);

        if (qty === 0) {
            Alert.alert(
                "Remove Product",
                "To remove this product completely, please use the delete button instead.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            // Reset the input to previous value (minimum 1)
                            setUpdatedProducts(prev => {
                                const updated = [...prev];
                                updated[productIndex] = {
                                    ...updated[productIndex],
                                    Bill_Qty: 1, // Reset to minimum quantity of 1
                                    Total_Qty: 1,
                                    Amount: 1 * updated[productIndex].Item_Rate,
                                    Final_Amo: 1 * updated[productIndex].Item_Rate,
                                    Taxable_Amount: 1 * updated[productIndex].Taxable_Rate,
                                };

                                AsyncStorage.setItem(
                                    `updatedProducts_${selectedDelivery.Do_Id}`,
                                    JSON.stringify(updated),
                                ).catch(error => console.error("Storage error:", error));

                                setHasProductChanges(checkForProductChanges(updated, selectedDelivery.Products_List));

                                return updated;
                            });
                        }
                    }
                ]
            );
            return; // Exit early, don't update with 0 quantity
        }

        setUpdatedProducts(prev => {
            const updated = [...prev];
            updated[productIndex] = {
                ...updated[productIndex],
                Bill_Qty: qty,
                Total_Qty: qty,
                Amount: qty * updated[productIndex].Item_Rate,
                Final_Amo: qty * updated[productIndex].Item_Rate,
                Taxable_Amount: qty * updated[productIndex].Taxable_Rate,
            };

            AsyncStorage.setItem(
                `updatedProducts_${selectedDelivery.Do_Id}`,
                JSON.stringify(updated),
            ).catch(error => console.error("Storage error:", error));

            setHasProductChanges(checkForProductChanges(updated, selectedDelivery.Products_List));
            // console.log("Updated products after quantity change:", updated);
            return updated;
        });
    };

    // New function to calculate updated totals
    const calculateUpdatedTotals = () => {
        if (updatedProducts.length === 0) {
            return {
                totalAmount: 0,
                totalTaxableAmount: 0,
                totalInvoiceValue: 0,
            };
        }

        const totalAmount = updatedProducts.reduce(
            (sum, product) => sum + (product.Final_Amo || 0),
            0,
        );
        const totalTaxableAmount = updatedProducts.reduce(
            (sum, product) => sum + (product.Taxable_Amount || 0),
            0,
        );

        return {
            totalAmount,
            totalTaxableAmount,
            totalInvoiceValue: totalAmount, // Add any additional calculations as needed
        };
    };

    // New function to handle delivery cancellation
    const handleCancelDelivery = async () => {
        if (!cancelReason.trim()) {
            Alert.alert("Error", "Please provide a reason for cancellation");
            return;
        }

        if (!selectedDelivery) return;
        setLoading(true);

        try {
            const visitEntrySuccess = await handleSubmitforVisitLog();
            if (!visitEntrySuccess) return;

            const transformedProducts =
                selectedDelivery.Products_List?.map(product => ({
                    DO_St_Id: product.DO_St_Id,
                    Do_Date: product.Do_Date,
                    Delivery_Order_Id: product.Delivery_Order_Id,
                    GoDown_Id: product.GoDown_Id,
                    S_No: product.S_No,
                    Item_Id: product.Item_Id,
                    Bill_Qty: product.Bill_Qty, // This will now use the updated quantity
                    Act_Qty: null,
                    Alt_Act_Qty: null,
                    Taxable_Rate: product.Taxable_Rate,
                    Item_Rate: product.Item_Rate,
                    Amount: product.Amount,
                    Free_Qty: product.Free_Qty,
                    Total_Qty: product.Total_Qty,
                    Taxble: product.Taxble,
                    HSN_Code: product.HSN_Code,
                    Unit_Id: product.Unit_Id,
                    Unit_Name: product.Unit_Name,
                    Act_unit_Id: null,
                    Alt_Act_Unit_Id: null,
                    Taxable_Amount: product.Taxable_Amount,
                    Tax_Rate: product.Tax_Rate,
                    Cgst: product.Cgst,
                    Cgst_Amo: product.Cgst_Amo,
                    Sgst: product.Sgst,
                    Sgst_Amo: product.Sgst_Amo,
                    Igst: product.Igst,
                    Igst_Amo: product.Igst_Amo,
                    Final_Amo: product.Final_Amo,
                    Created_on: product.Created_on,
                    Batch_Name: product.Batch_Name || null,
                })) || [];

            const updatePayload = {
                Do_Id: parseInt(selectedDelivery.Do_Id),
                Do_Date: selectedDelivery.Do_Date || new Date().toISOString(),
                Do_No: selectedDelivery.Do_No,
                Delivery_Person_Id: callCenterId || userId,
                Retailer_Id: parseInt(selectedDelivery.Retailer_Id),
                Branch_Id: parseInt(selectedDelivery.Branch_Id),
                Narration: `Delivery cancelled - Reason: ${cancelReason}`,
                Product_Array: transformedProducts,
                Delivery_Status: 6, // Cancelled status
                Payment_Status: 0, // Reset payment status
                Delivery_Time: new Date().toISOString(),
                Delivery_Location: "CANCELLED",
                Delivery_Latitude: location.latitude?.toString() || "0",
                Delivery_Longitude: location.longitude?.toString() || "0",
                Payment_Mode: null,
                Payment_Ref_No: `CANCELLED-${cancelReason}`,
                Altered_by: parseInt(userId),
                Altered_on: new Date().toISOString(),
                // Created_by: parseInt(userId),
                // Collected_By: selectedDelivery.Collected_By,
                // Collected_Status: selectedDelivery.Collected_Status,
            };


            const response = await fetch(API.deliveryPut(), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatePayload),
            });

            const result = await response.json();

            // console.log("Delivery cancellation response:", result);

            if (result.success) {
                Alert.alert("Success", result.message || "Delivery cancelled successfully");
                fetchDeliveryData();
            } else {
                Alert.alert(
                    "Error",
                    result.message || "Failed to cancel delivery",
                );
            }
        } catch (error) {
            console.error("Error cancelling delivery:", error);
            Alert.alert("Error", "An error occurred while cancelling delivery");
        } finally {
            setLoading(false);
            setShowCancelModal(false);
            setShowUpdateScreen(false);
            setCancelReason("");
        }
    };

    // Enhanced renderDeliveryItem with new action buttons
    const renderDeliveryItem = ({ item }) => (
        <View style={styles.deliveryItem}>
            <View style={styles.deliveryDetails}>
                <Text style={styles.amountText}>{item.Retailer_Name}</Text>
                <Text style={styles.invoiceNumber}>{item.Do_Inv_No}</Text>
                <Text style={styles.dateText}>
                    {formatDate(item.SalesDate)}
                </Text>
                <Text style={styles.amountText}>
                    ₹{item.Total_Invoice_value.toFixed(2)}
                </Text>
                <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Payment: </Text>
                    <Text
                        style={[
                            styles.statusValue,
                            {
                                color:
                                    paymentStatus[item.Payment_Status] ===
                                        "Completed"
                                        ? "green"
                                        : "orange",
                            },
                        ]}
                    >
                        {paymentStatus[item.Payment_Status] || "Pending"}
                    </Text>
                </View>
                <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Delivery: </Text>
                    <Text
                        style={[
                            styles.statusValue,
                            {
                                color:
                                    deliveryStatus[item.Delivery_Status] ===
                                        "Delivered"
                                        ? "green"
                                        : deliveryStatus[
                                            item.Delivery_Status
                                        ] === "Cancelled"
                                            ? "red"
                                            : "orange",
                            },
                        ]}
                    >
                        {deliveryStatus[item.Delivery_Status] || "Pending"}
                    </Text>
                </View>
                {/* Product count info */}
                <Text style={styles.productCountText}>
                    Products: {item.Products_List?.length || 0} items
                </Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.updateButton}
                    onPress={() => openUpdateScreen(item)}
                >
                    <FontAwesome
                        name="edit"
                        size={20}
                        color={customColors.pending}
                    />
                </TouchableOpacity>
                {item.Delivery_Status !== 7 &&
                    item.Delivery_Status !== 6 &&
                    item.Delivery_Status !== 8 && (
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setSelectedDelivery(item);
                                setShowCancelModal(true);
                            }}
                        >
                            <FontAwesome
                                name="times"
                                size={20}
                                color={customColors.error}
                            />
                        </TouchableOpacity>
                    )}
            </View>
        </View>
    );

    const handleRemoveProduct = productIndex => {
        Alert.alert(
            "Remove Product",
            "Are you sure you want to remove this product from the delivery?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setUpdatedProducts(prev => {
                            const updated = [...prev];
                            updated.splice(productIndex, 1);

                            AsyncStorage.setItem(
                                `updatedProducts_${selectedDelivery.Do_Id}`,
                                JSON.stringify(updated),
                            ).catch(error =>
                                console.error("Storage error:", error),
                            );

                            // Check for changes after removal
                            setHasProductChanges(checkForProductChanges(updated, selectedDelivery.Products_List));

                            return updated;
                        });
                    },
                },
            ],
        );
    };

    const handleResetProducts = () => {
        Alert.alert(
            "Reset Products",
            "This will restore all products to their original quantities. Are you sure?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Reset All",
                    style: "destructive",
                    onPress: () => {
                        const originalProducts = selectedDelivery.Products_List ?
                            [...selectedDelivery.Products_List] : [];

                        setUpdatedProducts(originalProducts);
                        setHasProductChanges(false); // No changes after reset

                        AsyncStorage.removeItem(
                            `updatedProducts_${selectedDelivery.Do_Id}`
                        ).catch(error => console.error("Reset storage error:", error));

                        Alert.alert("Success", "All products have been reset to original quantities");
                    },
                },
            ],
        );
    };

    // Product quantity modal
    const renderProductModal = () => (
        <Modal
            visible={showProductModal}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowProductModal(false)}
        >
            <SafeAreaView style={styles.productModalContainer}>
                <View style={styles.productModalHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowProductModal(false)}
                    >
                        <MaterialIcon
                            name="arrow-back"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Text style={styles.productModalHeaderText}>
                        Adjust Product Quantities
                    </Text>
                    {hasProductChanges && (
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetProducts}
                        >
                            <MaterialIcon
                                name="refresh"
                                size={24}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView style={styles.productModalContent}>
                    {updatedProducts.map((product, index) => (
                        <View key={index} style={styles.productItem}>
                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>
                                    {product.Product_Name}
                                </Text>
                                <Text style={styles.productDetails}>
                                    Rate: ₹{product.Item_Rate} /{" "}
                                    {product.Unit_Name}
                                </Text>
                                <Text style={styles.productDetails}>
                                    Original Qty:{" "}
                                    {selectedDelivery.Products_List[index]
                                        ?.Bill_Qty || 0}
                                </Text>
                            </View>
                            <View style={styles.quantityControls}>
                                <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={() => {
                                        // handleProductQuantityChange(
                                        //     index,
                                        //     Math.max(0, product.Bill_Qty - 1),
                                        // )
                                        const newQty = Math.max(1, product.Bill_Qty - 1); // Don't go below 1
                                        if (newQty === 1 && product.Bill_Qty === 1) {
                                            // If already at 1 and user tries to decrease, show alert
                                            Alert.alert(
                                                "Cannot Reduce Further",
                                                "Minimum quantity is 1. To remove this product, please use the delete button.",
                                                [{ text: "OK" }]
                                            );
                                        } else {
                                            handleProductQuantityChange(index, newQty);
                                        }
                                    }}
                                >
                                    <MaterialIcon
                                        name="remove"
                                        size={20}
                                        color={customColors.white}
                                    />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.quantityInput}
                                    value={product.Bill_Qty.toString()}
                                    onChangeText={text =>
                                        handleProductQuantityChange(index, text)
                                    }
                                    keyboardType="numeric"
                                    textAlign="center"
                                    selectTextOnFocus={true}
                                />
                                <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={() =>
                                        handleProductQuantityChange(
                                            index,
                                            product.Bill_Qty + 1,
                                        )
                                    }
                                >
                                    <MaterialIcon
                                        name="add"
                                        size={20}
                                        color={customColors.white}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeItemButton}
                                    onPress={() => handleRemoveProduct(index)}
                                >
                                    <MaterialIcon
                                        name="delete"
                                        size={20}
                                        color={customColors.white}
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.totalAmount}>
                                Total: ₹{(product.Final_Amo || 0).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.totalSection}>
                        <Text style={styles.grandTotalText}>
                            Updated Total: ₹
                            {calculateUpdatedTotals().totalInvoiceValue.toFixed(
                                2,
                            )}
                        </Text>
                        <Text style={styles.noteText}>
                            Changes will be applied when you update delivery
                            status
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    // Cancel delivery modal
    const renderCancelModal = () => (
        <Modal
            visible={showCancelModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowCancelModal(false)}
        >
            <View style={styles.cancelModalOverlay}>
                <View style={styles.cancelModalContent}>
                    <Text style={styles.cancelModalTitle}>Cancel Delivery</Text>
                    <Text style={styles.cancelModalSubtitle}>
                        Select a reason or enter a custom reason for cancellation
                    </Text>

                    {/* Predefined Reason Buttons */}
                    <Text style={styles.reasonSectionTitle}>Common Reasons:</Text>
                    <View style={styles.reasonButtonsContainer}>
                        {cancelReasons.map((reason, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.reasonButton,
                                    selectedCancelReason === reason && styles.selectedReasonButton
                                ]}
                                onPress={() => {
                                    setSelectedCancelReason(reason);
                                    if (reason === "Other") {
                                        setCancelReason("");
                                    } else {
                                        setCancelReason(reason);
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.reasonButtonText,
                                    selectedCancelReason === reason && styles.selectedReasonButtonText
                                ]}>
                                    {reason}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom Reason Input - Show when "Other" is selected or for additional details */}
                    <Text style={styles.customReasonLabel}>
                        {selectedCancelReason === "Other" ? "Enter custom reason:" : "Additional details (optional):"}
                    </Text>
                    <TextInput
                        style={styles.cancelReasonInput}
                        placeholder={
                            selectedCancelReason === "Other"
                                ? "Enter reason for cancellation..."
                                : "Add more details if needed..."
                        }
                        value={selectedCancelReason === "Other" ? cancelReason :
                            (cancelReason === selectedCancelReason ? "" : cancelReason)}
                        onChangeText={(text) => {
                            if (selectedCancelReason === "Other") {
                                setCancelReason(text);
                            } else {
                                // For additional details, combine with selected reason
                                setCancelReason(selectedCancelReason + (text ? ` - ${text}` : ""));
                            }
                        }}
                        multiline
                        numberOfLines={3}
                    />

                    <View style={styles.cancelModalButtons}>
                        <TouchableOpacity
                            style={[
                                styles.cancelModalButton,
                                styles.cancelModalButtonSecondary,
                            ]}
                            onPress={() => {
                                setShowCancelModal(false);
                                setCancelReason("");
                                setSelectedCancelReason("");
                            }}
                        >
                            <Text style={styles.cancelModalButtonTextSecondary}>
                                Keep Delivery
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.cancelModalButton,
                                styles.cancelModalButtonPrimary,
                                (!cancelReason.trim()) && styles.disabledButton
                            ]}
                            onPress={handleCancelDelivery}
                            disabled={loading || !cancelReason.trim()}
                        >
                            <Text style={styles.cancelModalButtonTextPrimary}>
                                {loading ? "Cancelling..." : "Cancel Delivery"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const matchCallCenterId = async () => {
        const callUser = users.find(
            user => user.Cost_Center_Id !== null && user.UserId === userId,
        );

        setCallCenterId(callUser ? callUser.Cost_Center_Id : userId);
    };

    useEffect(() => {
        matchCallCenterId();
    }, [users]);

    const {
        data: paymentOption = [],
    } = useQuery({
        queryKey: ["paymentOption"],
        queryFn: fetchDefaultAccountMaster,
        select: data => {
            if (!data) return [];
            return data;
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
            formData.append("Retailer_Id", selectedDelivery.Retailer_Id);
            formData.append("Latitude", finalLatitude.toString());
            formData.append("Longitude", finalLongitude.toString());
            formData.append("Narration", "The Sale delivery has been updated.");
            formData.append("EntryBy", userId);

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

    const handleUpdateDelivery = async (isDelivered, isPaid) => {
        if (!selectedDelivery) return;
        setLoading(true);

        try {
            const visitEntrySuccess = await handleSubmitforVisitLog();
            if (!visitEntrySuccess) return;

            const currentTotal =
                updatedProducts.length > 0
                    ? calculateUpdatedTotals().totalInvoiceValue
                    : selectedDelivery.Total_Invoice_value;

            let paymentRef = null;
            if (isPaid && selectedPaymentMode === "1" && partialAmount) {
                const paidAmount = parseFloat(partialAmount);
                if (
                    !isNaN(paidAmount) &&
                    paidAmount > 0 &&
                    paidAmount < currentTotal
                ) {
                    paymentRef = `CASH-PARTIAL-${paidAmount}`;
                }
            }

            if (isPaid && selectedPaymentMode === "2" && partialAmount) {
                const paidAmount = parseFloat(partialAmount);
                if (
                    !isNaN(paidAmount) &&
                    paidAmount > 0 &&
                    paidAmount < currentTotal
                ) {
                    paymentRef = `GPAY-PARTIAL-${paidAmount}`;
                }
            }

            const finalDeliveryStatus = isDelivered
                ? 7
                : selectedDelivery.Delivery_Status;
            const finalPaymentStatus = isPaid
                ? 3
                : selectedDelivery.Payment_Status;

            // Use updatedProducts instead of selectedDelivery.Products_List
            const productsToUse =
                updatedProducts.length > 0
                    ? updatedProducts
                    : selectedDelivery.Products_List;

            // console.log(
            //     "Using updated products for API:",
            //     JSON.stringify(productsToUse, null, 2),
            // );

            const transformedProducts =
                productsToUse?.map(product => ({
                    DO_St_Id: product.DO_St_Id,
                    Do_Date: product.Do_Date,
                    Delivery_Order_Id: product.Delivery_Order_Id,
                    GoDown_Id: product.GoDown_Id,
                    S_No: product.S_No,
                    Item_Id: product.Item_Id,
                    Bill_Qty: product.Bill_Qty, // This will now use the updated quantity
                    Act_Qty: null,
                    Alt_Act_Qty: null,
                    Taxable_Rate: product.Taxable_Rate,
                    Item_Rate: product.Item_Rate,
                    Amount: product.Amount,
                    Free_Qty: product.Free_Qty,
                    Total_Qty: product.Total_Qty,
                    Taxble: product.Taxble,
                    HSN_Code: product.HSN_Code,
                    Unit_Id: product.Unit_Id,
                    Unit_Name: product.Unit_Name,
                    Act_unit_Id: null,
                    Alt_Act_Unit_Id: null,
                    Taxable_Amount: product.Taxable_Amount,
                    Tax_Rate: product.Tax_Rate,
                    Cgst: product.Cgst,
                    Cgst_Amo: product.Cgst_Amo,
                    Sgst: product.Sgst,
                    Sgst_Amo: product.Sgst_Amo,
                    Igst: product.Igst,
                    Igst_Amo: product.Igst_Amo,
                    Final_Amo: product.Final_Amo,
                    Created_on: product.Created_on,
                    Batch_Name: product.Batch_Name || null,
                })) || [];

            // console.log(
            //     "Transformed Products with updated quantities:",
            //     JSON.stringify(transformedProducts, null, 2),
            // );

            const updatePayload = {
                Do_Id: selectedDelivery.Do_Id,
                Do_No: selectedDelivery.Do_No,
                Retailer_Id: selectedDelivery.Retailer_Id,
                Delivery_Time: isDelivered ? new Date().toISOString() : null,
                Delivery_Location: isDelivered ? "MDU" : null,
                Delivery_Latitude: location.latitude.toString() || "0",
                Delivery_Longitude: location.longitude.toString() || "0",
                Delivery_Person_Id: callCenterId || userId,
                Delivery_Status: finalDeliveryStatus,
                Payment_Status: finalPaymentStatus,
                Payment_Mode: selectedPaymentMode,
                Branch_Id: branchId,
                Payment_Ref_No: paymentRef
                    ? paymentRef
                    : selectedPaymentMode === "2"
                        ? "GPay"
                        : selectedPaymentMode === "1"
                            ? "CASH"
                            : "CREDIT",
                Altered_by: parseInt(userId),
                Altered_on: new Date().toISOString(),
                Product_Array: transformedProducts,
            };

            // console.log(
            //     "Final payload with updated products:",
            //     JSON.stringify(updatePayload, null, 2),
            // );

            const response = await fetch(API.deliveryPut(), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatePayload),
            });

            const result = await response.json();

            // console.log(
            //     "Delivery update response:",
            //     JSON.stringify(result, null, 2),
            // );

            if (result.success) {
                // Clear stored products after successful update
                if (
                    (selectedPaymentMode === "1" ||
                        selectedPaymentMode === "2") &&
                    isPaid
                ) {
                    const paymentAmount = partialAmount
                        ? parseFloat(partialAmount)
                        : parseFloat(currentTotal);

                    let debit_ledger_id = 0;
                    let debit_ledger_name = "";

                    if (selectedPaymentMode === "1") {
                        const cashOption = paymentOption.find(
                            option => option.Account_Name === "Cash Note Off",
                        );
                        if (cashOption) {
                            debit_ledger_id = cashOption.Acc_Id;
                            debit_ledger_name = cashOption.Account_Name;
                        }
                    }

                    if (selectedPaymentMode === "2") {
                        const gpayOption = paymentOption.find(
                            option =>
                                option.Account_Name === "Canara Bank (795956)",
                        );
                        if (gpayOption) {
                            debit_ledger_id = gpayOption.Acc_Id;
                            debit_ledger_name = gpayOption.Account_Name;
                        }
                    }

                    let credit_ledger_Id = selectedDelivery.Acc_Id;
                    let credit_ledger_name = selectedDelivery.Retailer_Name;

                    let transaction_type = "";

                    if (debit_ledger_name === "Cash Note Off") {
                        transaction_type = "Cash";
                    } else if (debit_ledger_name === "Canara Bank (795956)") {
                        transaction_type = "UPI";
                    }

                    if (
                        selectedDelivery.Acc_Id === "0" ||
                        selectedDelivery.Acc_Id === 0
                    ) {
                        credit_ledger_Id = 14;
                        credit_ledger_name = `${selectedDelivery.Retailer_Name} - (Sundry Creditors)`;
                    }

                    const receiptPostData = {
                        receipt_voucher_type_id: 10,
                        receipt_bill_type: 1,
                        remarks: "Sale delivery and payment collection",
                        status: 1,
                        credit_ledger: credit_ledger_Id,
                        credit_ledger_name: credit_ledger_name,
                        debit_ledger: debit_ledger_id,
                        debit_ledger_name: debit_ledger_name,
                        credit_amount: paymentAmount,
                        created_by: userId,
                        transaction_type: transaction_type,
                        receipt_date: new Date().toISOString().split("T")[0],
                        BillsDetails: [
                            {
                                bill_id: parseInt(selectedDelivery.Do_Id),
                                bill_name: selectedDelivery.Do_Inv_No,
                                bill_amount: parseFloat(currentTotal),
                                Credit_Amo: parseFloat(paymentAmount),
                            },
                        ],
                    };

                    const paymentResponse = await fetch(API.createReceipt(), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(receiptPostData),
                    });
                    const paymentResult = await paymentResponse.json();

                    if (paymentResult.success) {
                        Alert.alert(
                            "Success",
                            "Delivery status and payment updated successfully",
                        );
                    } else {
                        Alert.alert(
                            "Warning",
                            "Delivery updated but payment collection failed",
                        );
                    }
                } else {
                    Alert.alert(
                        "Success",
                        "Delivery status updated successfully",
                    );
                }

                fetchDeliveryData();
                AsyncStorage.removeItem(
                    `updatedProducts_${selectedDelivery.Do_Id}`,
                );
            } else {
                Alert.alert(
                    "Error",
                    result.message || "Failed to update delivery status",
                );
            }
        } catch (error) {
            console.error("Error updating delivery:", error);
            Alert.alert(
                "Error",
                "An error occurred while updating delivery status",
            );
        } finally {
            setLoading(false);
            setShowUpdateScreen(false);
            setPartialAmount("");
        }
    };

    const renderUpdateScreen = () => (
        <SafeAreaView style={styles.updateScreen} edges={["top", "bottom"]}>
            <View style={styles.updateHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowUpdateScreen(false)}
                >
                    <MaterialIcon
                        name="arrow-back"
                        size={24}
                        color={customColors.white}
                    />
                </TouchableOpacity>
                <Text style={styles.updateHeaderText}>
                    Update Delivery Status
                </Text>
            </View>

            <ScrollView
                style={styles.updateContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.updateContentContainer}
            >
                <View style={styles.updateCard}>
                    {selectedDelivery && (
                        <View style={styles.updateBody}>
                            <Text style={styles.updateInvoice}>
                                {selectedDelivery.Do_Inv_No}
                            </Text>
                            {updatedProducts.length > 0 ? (
                                <View>
                                    <Text
                                        style={[
                                            styles.updateAmount,
                                            {
                                                textDecorationLine:
                                                    "line-through",
                                                color: customColors.grey500,
                                            },
                                        ]}
                                    >
                                        Original: ₹
                                        {selectedDelivery.Total_Invoice_value.toFixed(
                                            2,
                                        )}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.updateAmount,
                                            {
                                                color: customColors.success,
                                                fontWeight: "bold",
                                            },
                                        ]}
                                    >
                                        Updated: ₹
                                        {calculateUpdatedTotals().totalInvoiceValue.toFixed(
                                            2,
                                        )}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.updateAmount}>
                                    Amount: ₹
                                    {selectedDelivery.Total_Invoice_value.toFixed(
                                        2,
                                    )}
                                </Text>
                            )}

                            {/* Product count and management */}
                            <View style={styles.productSection}>
                                <View style={styles.productSectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        Products ({updatedProducts.length})
                                        {hasProductChanges && <Text style={styles.changedIndicator}> (Edited)</Text>}
                                    </Text>
                                    <View style={styles.productActionButtons}>
                                        {hasProductChanges && (
                                            <TouchableOpacity
                                                style={styles.resetAllButton}
                                                onPress={handleResetProducts}
                                            >
                                                <MaterialIcon
                                                    name="refresh"
                                                    size={16}
                                                    color={customColors.white}
                                                />
                                                <Text style={styles.resetButtonText}>Reset</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={styles.manageProductsButton}
                                            onPress={() => setShowProductModal(true)}
                                        >
                                            <MaterialIcon
                                                name="edit"
                                                size={16}
                                                color={customColors.white}
                                            />
                                            <Text style={styles.manageProductsButtonText}>
                                                Manage
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.paymentModeSection}>
                                <Text style={styles.sectionTitle}>
                                    Payment Mode:
                                </Text>
                                <View style={styles.paymentOptions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.paymentOption,
                                            selectedPaymentMode === "3" &&
                                            styles.selectedPaymentOption,
                                        ]}
                                        onPress={() =>
                                            setSelectedPaymentMode("3")
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "3" &&
                                                styles.selectedPaymentOptionText,
                                            ]}
                                        >
                                            Credit
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.paymentOption,
                                            selectedPaymentMode === "1" &&
                                            styles.selectedPaymentOption,
                                        ]}
                                        onPress={() =>
                                            setSelectedPaymentMode("1")
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "1" &&
                                                styles.selectedPaymentOptionText,
                                            ]}
                                        >
                                            Cash
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.paymentOption,
                                            selectedPaymentMode === "2" &&
                                            styles.selectedPaymentOption,
                                        ]}
                                        onPress={() =>
                                            setSelectedPaymentMode("2")
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "2" &&
                                                styles.selectedPaymentOptionText,
                                            ]}
                                        >
                                            G-Pay
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {(selectedPaymentMode === "1" || selectedPaymentMode === "2") && (
                                <View style={styles.partialPaymentSection}>
                                    <Text style={styles.sectionTitle}>
                                        Enter Amount Received:
                                    </Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="Enter amount"
                                        keyboardType="numeric"
                                        value={partialAmount}
                                        onChangeText={setPartialAmount}
                                    />
                                    <Text style={styles.partialPaymentNote}>
                                        Leave empty for full payment (₹
                                        {calculateUpdatedTotals().totalInvoiceValue.toFixed(
                                            2,
                                        )}
                                        )
                                    </Text>
                                </View>
                            )}

                            <View style={styles.buttonGroup}>
                                {selectedPaymentMode === "3" ? (
                                    <TouchableOpacity
                                        style={[
                                            styles.updateActionButton,
                                            styles.deliveredButton,
                                        ]}
                                        onPress={() =>
                                            handleUpdateDelivery(true, false)
                                        }
                                        disabled={loading}
                                    >
                                        <Text style={styles.buttonText}>
                                            Delivered Only
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.updateActionButton,
                                            styles.deliveredPaidButton,
                                        ]}
                                        onPress={() =>
                                            handleUpdateDelivery(true, true)
                                        }
                                        disabled={loading}
                                    >
                                        <Text style={styles.buttonText}>
                                            Delivered & Paid
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Cancel delivery button */}
                                {selectedDelivery.Delivery_Status !== 7 &&
                                    selectedDelivery.Delivery_Status !== 6 &&
                                    selectedDelivery.Delivery_Status !== 8 && (
                                        <TouchableOpacity
                                            style={[
                                                styles.updateActionButton,
                                                styles.cancelButton,
                                            ]}
                                            onPress={() =>
                                                setShowCancelModal(true)
                                            }
                                            disabled={loading}
                                        >
                                            <Text style={styles.buttonText}>
                                                Cancel Delivery
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Delivery Update"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
            />

            <LocationIndicator
                onLocationUpdate={locationData => setLocation(locationData)}
                autoFetch={true}
                autoFetchOnMount={true}
                showComponent={false}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                toDate={selectedToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={true}
                title="Filter options"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                <View style={styles.searchInputContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Retailer Name..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Text style={styles.searchInputLabel}>
                        {filteredData.length === 0
                            ? "No results"
                            : `${filteredData.length} results`}
                    </Text>
                </View>

                <View style={styles.content}>
                    {filteredData.length > 0 ? (
                        <FlatList
                            data={filteredData}
                            renderItem={renderDeliveryItem}
                            keyExtractor={item => item.Delivery_Order_id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                        />
                    ) : (
                        <View style={styles.noDataContainer}>
                            <Text style={styles.noDataText}>
                                No delivery data available
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            {showUpdateScreen && renderUpdateScreen()}
            {renderProductModal()}
            {renderCancelModal()}
        </SafeAreaView>
    );
};

export default DeliveryUpdate;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: spacing.md,
    },
    listContent: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    searchInput: {
        width: "65%",
        height: 50,
        borderColor: customColors.grey300,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginVertical: 10,
        marginHorizontal: spacing.lg,
        backgroundColor: customColors.white,
        ...typography.body1(),
    },
    searchInputLabel: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    deliveryItem: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.md,
        marginHorizontal: spacing.xs,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    deliveryDetails: {
        flex: 1,
    },
    invoiceNumber: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    dateText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
    },
    amountText: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.sm,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    statusLabel: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    statusValue: {
        ...typography.body2(),
        fontWeight: "500",
    },
    productCountText: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xs,
    },
    actionButtons: {
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
    },
    updateButton: {
        justifyContent: "center",
        alignItems: "center",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.grey100,
    },
    cancelButton: {
        justifyContent: "center",
        alignItems: "center",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.error + "20",
    },
    noDataContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    noDataText: {
        ...typography.body1(),
        color: customColors.grey700,
        textAlign: "center",
    },
    updateScreen: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: customColors.primaryDark,
    },
    updateHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primaryDark,
    },
    backButton: {
        padding: spacing.xs,
    },
    updateHeaderText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginLeft: spacing.md,
        fontWeight: "600",
    },
    updateContent: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    updateContentContainer: {
        padding: spacing.md,
    },
    updateCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.medium,
    },
    updateBody: {
        paddingTop: spacing.sm,
    },
    updateInvoice: {
        ...typography.h6(),
        fontWeight: "600",
        marginBottom: spacing.sm,
        color: customColors.primary,
    },
    updateAmount: {
        ...typography.body1(),
        color: customColors.grey700,
        marginBottom: spacing.lg,
    },
    productSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    resetButton: {
        padding: spacing.xs,
        marginLeft: spacing.md,
        alignSelf: "flex-end"
    },
    productSectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
    },
    changedIndicator: {
        ...typography.caption(),
        color: customColors.warning,
        fontWeight: "600",
    },
    productActionButtons: {
        flexDirection: "row",
        gap: spacing.xs,
    },
    resetAllButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.warning,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
        gap: spacing.xs,
    },
    resetButtonText: {
        color: customColors.white,
        ...typography.caption(),
        fontWeight: "600",
    },
    manageProductsButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.secondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        gap: spacing.xs,
    },
    manageProductsButtonText: {
        color: customColors.white,
        ...typography.body2(),
        fontWeight: "600",
    },
    paymentModeSection: {
        marginVertical: spacing.md,
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "600",
        marginBottom: spacing.sm,
        color: customColors.primary,
    },
    paymentOptions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.lg,
    },
    paymentOption: {
        flex: 1,
        padding: spacing.sm,
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        marginHorizontal: spacing.xs,
    },
    selectedPaymentOption: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    paymentOptionText: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    selectedPaymentOptionText: {
        color: customColors.white,
    },
    partialPaymentSection: {
        marginVertical: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    amountInput: {
        height: 48,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        ...typography.body1(),
        marginVertical: spacing.sm,
    },
    partialPaymentNote: {
        ...typography.caption(),
        color: customColors.grey600,
        fontStyle: "italic",
    },
    buttonGroup: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    updateActionButton: {
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    deliveredButton: {
        backgroundColor: customColors.warning,
    },
    deliveredPaidButton: {
        backgroundColor: customColors.success,
    },
    buttonText: {
        color: customColors.white,
        fontWeight: "600",
        ...typography.body1(),
    },
    // Product Modal Styles
    productModalContainer: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    productModalHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primaryDark,
    },
    productModalHeaderText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginLeft: spacing.md,
        fontWeight: "600",
    },
    productModalContent: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: spacing.md,
    },
    productItem: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    productInfo: {
        marginBottom: spacing.md,
    },
    productName: {
        ...typography.subtitle2(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.xs,
    },
    productDetails: {
        ...typography.body2(),
        color: customColors.grey600,
        marginBottom: spacing.xs / 2,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    quantityButton: {
        backgroundColor: customColors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        marginHorizontal: spacing.md,
        minWidth: 80,
        textAlign: "center",
        height: 60,
        ...typography.body1(),
    },
    removeItemButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.error,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginLeft: spacing.md,
        borderRadius: 8,
        marginVertical: spacing.sm,
        gap: spacing.xs,
    },
    totalAmount: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.success,
        textAlign: "center",
    },
    totalSection: {
        backgroundColor: customColors.grey50,
        padding: spacing.md,
        borderRadius: 8,
        marginVertical: spacing.md,
        alignItems: "center",
    },
    grandTotalText: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.primary,
    },
    noteText: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
        marginTop: spacing.sm,
        fontStyle: "italic",
    },
    updateProductsButton: {
        backgroundColor: customColors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
        marginTop: spacing.md,
    },
    // Cancel Modal Styles
    cancelModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    cancelModalContent: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        width: "100%",
        maxWidth: 400,
    },
    cancelModalTitle: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.error,
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    cancelModalSubtitle: {
        ...typography.body1(),
        color: customColors.grey700,
        marginBottom: spacing.lg,
        textAlign: "center",
    },
    cancelReasonInput: {
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        padding: spacing.md,
        minHeight: 80,
        ...typography.body1(),
        textAlignVertical: "top",
        marginBottom: spacing.lg,
    },
    cancelModalButtons: {
        flexDirection: "row",
        gap: spacing.md,
    },
    cancelModalButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelModalButtonSecondary: {
        backgroundColor: customColors.grey200,
    },
    cancelModalButtonPrimary: {
        backgroundColor: customColors.error,
    },
    cancelModalButtonTextSecondary: {
        color: customColors.grey700,
        fontWeight: "600",
        ...typography.body1(),
    },
    cancelModalButtonTextPrimary: {
        color: customColors.white,
        fontWeight: "600",
        ...typography.body1(),
    },

    reasonSectionTitle: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
    },
    reasonButtonsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    reasonButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: customColors.grey300,
        backgroundColor: customColors.white,
        marginBottom: spacing.xs,
    },
    selectedReasonButton: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    reasonButtonText: {
        ...typography.body2(),
        color: customColors.grey700,
        textAlign: "center",
    },
    selectedReasonButtonText: {
        color: customColors.white,
        fontWeight: "600",
    },
    customReasonLabel: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    disabledButton: {
        opacity: 0.5,
    },
});
