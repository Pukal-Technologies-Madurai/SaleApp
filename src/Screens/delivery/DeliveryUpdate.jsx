import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import AppHeader from "../../Components/AppHeader";

const DeliveryUpdate = () => {
    const navigation = useNavigation();
    const [deliveryData, setDeliveryData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [searchQuery, setSearchQuery] = useState("");
    const [filteredData, setFilteredData] = useState([]);

    const [showUpdateScreen, setShowUpdateScreen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState("0");
    const [partialAmount, setPartialAmount] = useState("");

    const deliveryStatus = { 5: "Pending", 7: "Delivered" };
    const paymentStatus = { 0: "Pending", 3: "Completed" };
    const paymentMode = { 1: "Cash", 2: "G-Pay", 3: "Credit" };

    useEffect(() => {
        fetchDeliveryData();
    }, [selectedFromDate, selectedToDate]);

    const fetchDeliveryData = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];

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

    const handleDateChange = (date, isFromDate) => {
        if (isFromDate) {
            setSelectedFromDate(date);
        } else {
            setSelectedToDate(date);
        }
    };

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const openUpdateScreen = item => {
        setSelectedDelivery(item);
        setSelectedPaymentMode(item.Payment_Mode?.toString() || "1");
        setShowUpdateScreen(true);
    };

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
                        ]}>
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
                                        : "orange",
                            },
                        ]}>
                        {deliveryStatus[item.Delivery_Status] || "Pending"}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.updateButton}
                onPress={() => openUpdateScreen(item)}>
                <FontAwesome
                    name="edit"
                    size={20}
                    color={customColors.pending}
                />
            </TouchableOpacity>
        </View>
    );

    const handleUpdateDelivery = async (isDelivered, isPaid) => {
        // console.log("isDelivered", isDelivered, isPaid, selectedDelivery);
        if (!selectedDelivery) return;
        setLoading(true);

        try {
            const userId = await AsyncStorage.getItem("UserId");
            // Use a reference for partial payment
            let paymentRef = null;
            // Handle partial payment for cash
            if (isPaid && selectedPaymentMode === "1" && partialAmount) {
                const paidAmount = parseFloat(partialAmount);
                if (
                    !isNaN(paidAmount) &&
                    paidAmount > 0 &&
                    paidAmount < selectedDelivery.Total_Invoice_value
                ) {
                    paymentRef = `CASH-PARTIAL-${paidAmount}`;
                }
            }
            const finalDeliveryStatus = isDelivered
                ? 7
                : selectedDelivery.Delivery_Status;
            const finalPaymentStatus = isPaid
                ? 3
                : selectedDelivery.Payment_Status;
            const updatePayload = {
                Do_Id: selectedDelivery.Do_Id,
                Do_No: selectedDelivery.Do_No,
                Delivery_Time: isDelivered ? new Date().toISOString() : null,
                Delivery_Location: isDelivered ? "MDU" : null, // Set to "MDU"
                Delivery_Latitude: 0, // Set to 0
                Delivery_Longitude: 0, // Set to 0
                Delivery_Person_Id: userId,
                Delivery_Status: finalDeliveryStatus,
                Payment_Status: finalPaymentStatus,
                Payment_Mode: selectedPaymentMode,
                Payment_Ref_No: paymentRef
                    ? paymentRef
                    : selectedPaymentMode === "2"
                      ? "GPay"
                      : selectedPaymentMode === "1"
                        ? "CASH"
                        : "CREDIT",
            };
            const response = await fetch(API.deliveryPut(), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatePayload),
            });
            const result = await response.json();

            // If delivery update is successful and it's either cash or G-Pay payment with "Delivery & Paid" status
            if (
                result.success &&
                (selectedPaymentMode === "1" || selectedPaymentMode === "2") &&
                isPaid
            ) {
                // Call payment collection API
                const paymentAmount = partialAmount
                    ? parseFloat(partialAmount)
                    : parseFloat(selectedDelivery.Total_Invoice_value);
                const paymentData = {
                    retailer_id: parseInt(selectedDelivery.Retailer_Id),
                    payed_by: "Owner",
                    collection_date: new Date().toISOString().split("T")[0],
                    collection_type:
                        selectedPaymentMode === "1" ? "CASH" : "UPI",
                    latitude: 0,
                    longitude: 0,
                    collected_by: userId,
                    created_by: userId,
                    voucher_id: 1,
                    narration: "Bill Receipt",
                    Collections: [
                        {
                            bill_id: parseInt(selectedDelivery.Do_Id),
                            bill_amount: parseFloat(
                                selectedDelivery.Total_Invoice_value,
                            ),
                            collected_amount: paymentAmount,
                            payment_status:
                                selectedPaymentMode === "1"
                                    ? "CREATED-CASH"
                                    : "CREATED-UPI",
                        },
                    ],
                };

                const paymentResponse = await fetch(API.paymentCollection(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(paymentData),
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
                fetchDeliveryData(); // Refresh data
            } else if (result.success) {
                Alert.alert("Success", "Delivery status updated successfully");
                fetchDeliveryData(); // Refresh data
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
        <View style={styles.updateScreen}>
            <View style={styles.updateHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowUpdateScreen(false)}>
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
                contentContainerStyle={styles.updateContentContainer}>
                <View style={styles.updateCard}>
                    {selectedDelivery && (
                        <View style={styles.updateBody}>
                            <Text style={styles.updateInvoice}>
                                {selectedDelivery.Do_Inv_No}
                            </Text>
                            <Text style={styles.updateAmount}>
                                Amount: ₹
                                {selectedDelivery.Total_Invoice_value.toFixed(
                                    2,
                                )}
                            </Text>

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
                                        }>
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "3" &&
                                                    styles.selectedPaymentOptionText,
                                            ]}>
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
                                        }>
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "1" &&
                                                    styles.selectedPaymentOptionText,
                                            ]}>
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
                                        }>
                                        <Text
                                            style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMode === "2" &&
                                                    styles.selectedPaymentOptionText,
                                            ]}>
                                            G-Pay
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {selectedPaymentMode === "1" && (
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
                                        {selectedDelivery.Total_Invoice_value.toFixed(
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
                                        disabled={loading}>
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
                                        disabled={loading}>
                                        <Text style={styles.buttonText}>
                                            Delivered & Paid
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Delivery Update" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="From"
                        date={selectedFromDate}
                        onDateChange={(_, date) => handleDateChange(date, true)}
                        containerStyle={styles.datePicker}
                    />
                    <DatePickerButton
                        title="To"
                        date={selectedToDate}
                        onDateChange={(_, date) =>
                            handleDateChange(date, false)
                        }
                        containerStyle={styles.datePicker}
                    />
                </View>

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
        </View>
    );
};

export default DeliveryUpdate;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        ...shadows.small,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    datePicker: {
        width: "48%",
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
        // paddingVertical: spacing.sm,
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
    updateButton: {
        justifyContent: "center",
        alignItems: "center",
        width: 40,
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
        backgroundColor: customColors.background,
    },
    updateHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primary,
        elevation: 4,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
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
});
