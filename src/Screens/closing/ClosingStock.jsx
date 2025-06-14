import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ToastAndroid,
    ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import { fetchRetailerClosingStock } from "../../Api/retailers";
import { customColors, typography, spacing } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";

const ClosingStock = ({ route }) => {
    const navigation = useNavigation();
    const { item, isEdit } = route.params;
    const [userId, setUserId] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [quantities, setQuantities] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
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

    const { data: brandsData = [] } = useQuery({
        queryKey: ["closingStock", item.Retailer_Id],
        queryFn: () => fetchRetailerClosingStock(item.Retailer_Id),
        enabled: !!item.Retailer_Id,
        select: data => {
            return data;
        },
    });

    // Initialize quantities from API data
    useEffect(() => {
        if (brandsData?.length) {
            const initialQuantities = {};
            brandsData.forEach(brand => {
                brand.GroupedProductArray.forEach(product => {
                    initialQuantities[product.Product_Id] =
                        product.estimatedQuantity?.toString() || "0";
                });
            });
            setQuantities(initialQuantities);
        }
    }, [brandsData]);

    // Calculate summary data
    const calculateSummary = () => {
        let totalQty = 0;
        let totalValue = 0;
        let latestVD = "";
        let latestED = "";

        if (!brandsData?.length)
            return { totalQty: 0, totalValue: "Rs. 0/-", vd: "-", ed: "-" };

        brandsData.forEach(brand => {
            brand.GroupedProductArray.forEach(product => {
                totalQty += product.estimatedQuantity || 0;
                totalValue += product.totalValue || 0;

                // Find the latest dates
                if (
                    product.lastDeliveryDate &&
                    (!latestVD ||
                        new Date(product.lastDeliveryDate) > new Date(latestVD))
                ) {
                    latestVD = product.lastDeliveryDate;
                }

                if (
                    product.lastclosingDate &&
                    (!latestED ||
                        new Date(product.lastclosingDate) > new Date(latestED))
                ) {
                    latestED = product.lastclosingDate;
                }
            });
        });

        // Format dates to DD/MM format
        const formatDate = dateString => {
            if (!dateString) return "-";
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        };

        return {
            totalQty,
            totalValue: `Rs. ${totalValue}/-`,
            vd: formatDate(latestVD),
            ed: formatDate(latestED),
        };
    };

    const summary = calculateSummary();

    const toggleGroup = groupId => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    // Add handler for quantity changes
    const handleQuantityChange = (productId, value) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: value,
        }));
    };

    // Prepare data for saving
    const prepareClosingStockData = () => {
        const closingStockValues = [];

        brandsData.forEach(brand => {
            brand.GroupedProductArray.forEach(product => {
                const newQty = parseInt(quantities[product.Product_Id]) || 0;
                const originalQty = product.estimatedQuantity || 0;

                // Only include items where quantity has actually changed
                if (newQty !== originalQty) {
                    closingStockValues.push({
                        Product_Id: product.Product_Id,
                        ST_Qty: newQty,
                        PR_Qty: originalQty,
                        LT_CL_Date: new Date().toISOString().split("T")[0],
                    });
                }
            });
        });

        return closingStockValues;
    };

    const VisitEntry = async () => {
        const formData = new FormData();
        formData.append("Mode", 1);
        formData.append("Retailer_Id", item.Retailer_Id);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "The stock entry has been updated.");
        formData.append("EntryBy", userId);

        try {
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
                navigation.navigate("HomeScreen");
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

    // Save function
    const saveClosingStock = async () => {
        VisitEntry();
        const closingStockValues = prepareClosingStockData();

        if (closingStockValues.length === 0) {
            ToastAndroid.show(
                "Please make at least one change to save",
                ToastAndroid.LONG,
            );
            setShowModal(false);
            return;
        }

        setIsSubmitting(true);
        try {
            // Format the request body according to backend expectations
            const currentDate = new Date().toISOString().split("T")[0];

            const stockInputValue = {
                Company_Id: parseInt(item.Company_Id) || 1,
                ST_Date: currentDate,
                Retailer_Id: parseInt(item.Retailer_Id),
                Retailer_Name: item.Retailer_Name || "",
                Narration: "",
                Created_by: parseInt(userId),
                ST_Id: isEdit && item.ST_Id ? parseInt(item.ST_Id) : "",
                Product_Stock_List: closingStockValues.map(item => ({
                    Product_Id: parseInt(item.Product_Id),
                    ST_Qty: parseInt(item.ST_Qty),
                    PR_Qty: parseInt(item.PR_Qty),
                    LT_CL_Date: item.LT_CL_Date,
                })),
            };

            console.log("stockInputValue:", stockInputValue);

            console.log(
                "Closing Stock Input Value:",
                JSON.stringify(stockInputValue, null, 2),
            );

            const response = await fetch(API.closingStock(), {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(stockInputValue),
            });

            // Parse the response body
            const responseText = await response.text();
            console.log("Response Text:", responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse response:", e);
            }

            if (response.ok) {
                if (data && data.success) {
                    ToastAndroid.show(
                        data.message || "Stock updated successfully",
                        ToastAndroid.LONG,
                    );
                    navigation.navigate("HomeScreen");
                } else {
                    ToastAndroid.show(
                        (data && data.message) ||
                            "Unknown response from server",
                        ToastAndroid.LONG,
                    );
                }
            } else {
                throw new Error(
                    `Server returned ${response.status}: ${data ? data.message : responseText}`,
                );
            }
        } catch (e) {
            console.error("Save Error:", e);
            ToastAndroid.show(
                "Failed to save closing stock: " + e.message,
                ToastAndroid.LONG,
            );
        } finally {
            setIsSubmitting(false);
            setShowModal(false);
        }

        console.log(
            `Sending ${closingStockValues.length} changed products out of ${brandsData.reduce((total, brand) => total + brand.GroupedProductArray.length, 0)} total products`,
        );
    };

    const renderProductItem = ({ item }) => {
        // Format dates to DD/MM format
        const formatDate = dateString => {
            if (!dateString) return "-";
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        };

        // Use estimatedQuantity as the default value
        const currentQty =
            quantities[item.Product_Id] !== undefined
                ? quantities[item.Product_Id]
                : item.estimatedQuantity?.toString() || "0";

        return (
            <View style={styles.productRow}>
                <Text style={styles.productName} numberOfLines={3}>
                    {item.Product_Name}
                </Text>
                <Text style={styles.dateText}>
                    {formatDate(item.lastclosingDate)}
                </Text>
                <Text style={styles.dateText}>
                    {formatDate(item.lastDeliveryDate)}
                </Text>
                <TextInput
                    style={styles.quantityInput}
                    value={currentQty}
                    onChangeText={value =>
                        handleQuantityChange(item.Product_Id, value)
                    }
                    keyboardType="numeric"
                    selectTextOnFocus={true}
                />
            </View>
        );
    };

    const renderGroupHeader = brand => {
        const isExpanded = expandedGroups[brand.Brand_Id];
        const productCount = brand.GroupedProductArray.length;

        return (
            <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(brand.Brand_Id)}>
                <Text style={styles.expandIcon}>{isExpanded ? "−" : "+"}</Text>
                <Text style={styles.groupTitle}>
                    {brand.Brand_Name} ({productCount})
                </Text>
                <Text
                    style={{
                        flex: 1,
                        textAlign: "right",
                        marginRight: spacing.md,
                        ...typography.caption(),
                        color: customColors.primaryDark,
                        fontWeight: "bold",
                    }}>
                    ₹ {brand.totalValue}
                </Text>
            </TouchableOpacity>
        );
    };

    // Stock summary for the modal
    const renderStockSummary = () => {
        const updatedProducts = [];

        brandsData.forEach(brand => {
            brand.GroupedProductArray.forEach(product => {
                const currentQty =
                    parseInt(quantities[product.Product_Id]) || 0;
                const originalQty = product.estimatedQuantity || 0;

                // Only show products with changed quantities
                if (currentQty !== originalQty) {
                    updatedProducts.push({
                        ...product,
                        brand: brand.Brand_Name,
                        currentQty,
                        originalQty,
                    });
                }
            });
        });

        if (updatedProducts.length === 0) {
            return (
                <Text style={styles.modalMessage}>
                    No changes detected. Save anyway?
                </Text>
            );
        }

        return (
            <ScrollView style={styles.summaryScroll}>
                <Text style={styles.modalTitle}>Review Changes</Text>
                {updatedProducts.map(product => (
                    <View key={product.Product_Id} style={styles.summaryItem}>
                        <Text style={styles.summaryItemBrand}>
                            {product.brand}
                        </Text>
                        <Text style={styles.summaryItemName}>
                            {product.Product_Name}
                        </Text>
                        <View style={styles.quantityChange}>
                            <Text style={styles.oldQuantity}>
                                {product.originalQty}
                            </Text>
                            <Text style={styles.arrowIcon}>→</Text>
                            <Text style={styles.newQuantity}>
                                {product.currentQty}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Closing Stock"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="AntDesign"
                rightIconName="save"
                onRightPress={() => setShowModal(true)}
            />

            {/* Summary Header */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>QTY</Text>
                    <Text style={styles.summaryLabel}>STOCK VALUE</Text>
                    <Text style={styles.summaryLabel}>ED</Text>
                    <Text style={styles.summaryLabel}>VD</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryValue}>{summary.totalQty}</Text>
                    <Text style={styles.summaryValue}>
                        {summary.totalValue}
                    </Text>
                    <Text style={styles.summaryValue}>{summary.vd}</Text>
                    <Text style={styles.summaryValue}>{summary.ed}</Text>
                </View>
            </View>

            {/* Product List Header */}
            <View style={styles.listHeader}>
                <Text style={{ flex: 4.5, ...styles.headerText }}>ITEM</Text>
                <Text style={styles.headerText}>VD</Text>
                <Text style={styles.headerText}>ED</Text>
                <Text style={styles.headerText}>QTY</Text>
            </View>

            {/* Product Groups */}
            <FlatList
                data={brandsData}
                keyExtractor={item => item.Brand_Id.toString()}
                renderItem={({ item }) => (
                    <View>
                        {renderGroupHeader(item)}
                        {expandedGroups[item.Brand_Id] && (
                            <FlatList
                                data={item.GroupedProductArray}
                                keyExtractor={product =>
                                    product.Product_Id.toString()
                                }
                                renderItem={renderProductItem}
                            />
                        )}
                    </View>
                )}
                style={styles.productList}
            />

            {/* Confirmation Modal */}
            <Modal
                visible={showModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {renderStockSummary()}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                ]}
                                onPress={() => setShowModal(false)}
                                disabled={isSubmitting}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveClosingStock}
                                disabled={isSubmitting}>
                                <Text style={styles.buttonText}>
                                    {isSubmitting ? "Saving..." : "Save"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ClosingStock;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    summaryContainer: {
        backgroundColor: customColors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey400,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.xs,
    },
    summaryLabel: {
        ...typography.overline(),
        color: customColors.primary,
        flex: 1,
        textAlign: "center",
    },
    summaryValue: {
        ...typography.caption(),
        color: customColors.primaryDark,
        fontWeight: "bold",
        flex: 1,
        textAlign: "center",
    },
    listHeader: {
        flexDirection: "row",
        backgroundColor: customColors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey400,
    },
    headerText: {
        ...typography.caption(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        flex: 1,
        textAlign: "center",
    },
    groupHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey400,
    },
    expandIcon: {
        ...typography.caption(),
        fontWeight: "900",
        marginRight: spacing.sm,
        color: customColors.primary,
    },
    groupTitle: {
        ...typography.caption(),
        fontWeight: "bold",
        color: customColors.primaryLight,
    },
    productRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey400,
    },
    productName: {
        flex: 1,
        ...typography.overline(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        paddingRight: spacing.sm,
    },
    dateText: {
        flex: 0.5,
        ...typography.caption(),
        color: customColors.primaryDark,
        textAlign: "center",
    },
    quantityInput: {
        flex: 0.5,
        ...typography.caption(),
        fontWeight: "bold",
        color: customColors.primary,
        textAlign: "center",
        backgroundColor: customColors.grey200,
        borderWidth: 1,
        borderColor: customColors.grey400,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.xs,
        minWidth: 40,
    },
    productList: {
        flex: 1,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    modalContent: {
        width: "90%",
        backgroundColor: customColors.white,
        borderRadius: spacing.xs,
        padding: spacing.md,
        maxHeight: "80%",
    },
    modalTitle: {
        ...typography.body1(),
        marginBottom: spacing.sm,
        color: customColors.primary,
        textAlign: "center",
    },
    modalMessage: {
        ...typography.body2(),
        color: customColors.primaryDark,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: spacing.xs,
        alignItems: "center",
        marginHorizontal: spacing.sm,
    },
    cancelButton: {
        backgroundColor: customColors.accent2,
    },
    saveButton: {
        backgroundColor: customColors.primaryDark,
    },
    buttonText: {
        color: customColors.white,
        ...typography.button(),
        fontWeight: "600",
    },
    summaryScroll: {
        maxHeight: 300,
    },
    summaryItem: {
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey600,
    },
    summaryItemBrand: {
        ...typography.caption(),
        color: customColors.primary,
    },
    summaryItemName: {
        ...typography.body2(),
        color: customColors.primaryDark,
        marginBottom: spacing.xs,
    },
    quantityChange: {
        flexDirection: "row",
        alignItems: "center",
    },
    oldQuantity: {
        ...typography.caption(),
        fontWeight: "bold",
        color: customColors.primaryLight,
        marginRight: spacing.sm,
    },
    arrowIcon: {
        ...typography.caption(),
        fontWeight: "bold",
        color: customColors.black,
        marginRight: spacing.sm,
    },
    newQuantity: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "bold",
    },
});
