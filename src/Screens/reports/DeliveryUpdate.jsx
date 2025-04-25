import {
    Alert,
    FlatList,
    ImageBackground,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";

const DeliveryUpdate = () => {
    const navigation = useNavigation();
    const [deliveryData, setDeliveryData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [modalVisible, setModalVisible] = useState(false);
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

    const openUpdateModal = item => {
        setSelectedDelivery(item);
        setSelectedPaymentMode(item.Payment_Mode?.toString() || "1");
        setModalVisible(true);
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
                onPress={() => openUpdateModal(item)}>
                <FontAwesome
                    name="edit"
                    size={20}
                    color={customColors.warning}
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
            setModalVisible(false);
            setPartialAmount("");
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Delivery Summary</Text>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="From"
                            date={selectedFromDate}
                            onDateChange={(_, date) =>
                                handleDateChange(date, true)
                            }
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

                    <View style={styles.content}>
                        {deliveryData.length > 0 ? (
                            <FlatList
                                data={deliveryData}
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
            </ImageBackground>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Update Delivery Status
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}>
                                <MaterialIcon
                                    name="close"
                                    size={24}
                                    color="#000"
                                />
                            </TouchableOpacity>
                        </View>

                        {selectedDelivery && (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalInvoice}>
                                    {selectedDelivery.Do_Inv_No}
                                </Text>
                                <Text style={styles.modalAmount}>
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
                                                    selectedPaymentMode ===
                                                        "3" &&
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
                                                    selectedPaymentMode ===
                                                        "1" &&
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
                                                    selectedPaymentMode ===
                                                        "2" &&
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
                                                handleUpdateDelivery(
                                                    true,
                                                    false,
                                                )
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
                </View>
            </Modal>
        </View>
    );
};

export default DeliveryUpdate;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headerText: {
        ...typography.h4(),
        color: customColors.white,
        marginLeft: 15,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    datePicker: {
        width: "48%",
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
        padding: 15,
    },
    listContent: {
        paddingVertical: 16,
    },
    deliveryItem: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 10,
        marginBottom: 12,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    deliveryDetails: {
        flex: 1,
    },
    invoiceNumber: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.grey,
        marginBottom: 4,
    },
    dateText: {
        ...typography.body1(),
        color: customColors.grey,
        marginBottom: 4,
    },
    amountText: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    statusLabel: {
        ...typography.body2(),
        color: customColors.grey,
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
    },
    noDataText: {
        ...typography.h6(),
        color: customColors.white,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        width: "90%",
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 12,
    },
    modalTitle: {
        ...typography.h5(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    modalBody: {
        paddingTop: 8,
    },
    modalInvoice: {
        ...typography.h6(),
        fontWeight: "bold",
        marginBottom: 8,
    },
    modalAmount: {
        ...typography.body1(),
        color: customColors.grey,
        marginBottom: 16,
    },
    paymentModeSection: {
        marginVertical: 16,
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "600",
        marginBottom: 8,
    },
    paymentOptions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    paymentOption: {
        flex: 1,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        marginHorizontal: 4,
    },
    selectedPaymentOption: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    paymentOptionText: {
        color: customColors.grey,
    },
    selectedPaymentOptionText: {
        color: customColors.white,
    },
    buttonGroup: {
        marginTop: 8,
    },
    updateActionButton: {
        padding: 14,
        borderRadius: 6,
        alignItems: "center",
        marginBottom: 10,
    },
    deliveredButton: {
        backgroundColor: "#f39c12", // Orange
    },
    paidButton: {
        backgroundColor: "#3498db", // Blue
    },
    deliveredPaidButton: {
        backgroundColor: "#2ecc71", // Green
    },
    buttonText: {
        color: customColors.white,
        fontWeight: "bold",
        ...typography.body1(),
    },
    partialPaymentSection: {
        marginVertical: 12,
        paddingTop: 4,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    amountInput: {
        height: 48,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        paddingHorizontal: 12,
        ...typography.h6(),
        marginVertical: 8,
    },
    partialPaymentNote: {
        ...typography.body2(),
        color: customColors.lightGrey,
        fontStyle: "italic",
    },
});
