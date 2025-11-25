import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchSaleOrder } from "../../Api/sales";
import { customColors, typography } from "../../Config/helper";

const PendingInvoice = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = React.useState(null);
    const [companyId, setCompanyId] = React.useState("");
    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedFromDate, setSelectedFromDate] = React.useState(() => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return firstOfMonth.toISOString().split("T")[0];
    });
    const [selectedToDate, setSelectedToDate] = React.useState(new Date().toISOString().split("T")[0]);
    const [selectedBranch, setSelectedBranch] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState("sales");

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate.toISOString().split("T")[0]);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate.toISOString().split("T")[0]);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    React.useEffect(() => {
        (async () => {
            const userId = await AsyncStorage.getItem("UserId");
            const Company_Id = await AsyncStorage.getItem("Company_Id");
            const branchId = await AsyncStorage.getItem("branchId");
            let parsedBranchId = branchId;

            if (typeof branchId === "string") {
                parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ''));
            } else {
                parsedBranchId = parseInt(branchId);
            }

            setUserId(userId);
            setCompanyId(Company_Id);
            setSelectedBranch(parsedBranchId)
        })();

    }, [selectedFromDate, selectedToDate, selectedBranch]);

    const { data: totalSales = [], isLoading: isLoadingTotalSales, refetch: refetchTotalSales } = useQuery({
        queryKey: ["totalSales", selectedFromDate, selectedToDate, selectedBranch, userId, companyId],
        queryFn: () => fetchSaleOrder({
            from: selectedFromDate,
            to: selectedToDate,
            company: companyId,
            userId: userId,
            branchId: selectedBranch,
        }),
        enabled: !!selectedFromDate && !!selectedToDate && !!companyId && !!userId && !!selectedBranch,
    });

    const pendingSalesOrders = totalSales.filter(
        item => item.OrderStatus === "pending",
    );

    const allPendingProducts = pendingSalesOrders.flatMap(order =>
        (order.Products_List || []).map(product => ({
            ...product,
            orderInfo: {
                So_Inv_No: order.So_Inv_No,
                Retailer_Name: order.Retailer_Name,
                Sales_Person_Name: order.Sales_Person_Name,
                So_Date: order.So_Date,
                S_Id: order.S_Id
            }
        }))
    );

    const completedSalesOrders = totalSales.filter(
        item => item.OrderStatus === "completed",
    );

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB");
    };

    const formatCurrency = amount => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const onRefresh = () => {
        refetchTotalSales();
    };

    const renderSalesOrderCard = (item) => (
        <TouchableOpacity key={item.S_Id} style={styles.card} disabled>
            <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>{item.So_Inv_No}</Text>
                <Text style={styles.amount}>{formatCurrency(item.Total_Invoice_value)}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Retailer:</Text>
                    <Text style={styles.value}>{item.Retailer_Name}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Sales Person:</Text>
                    <Text style={styles.value}>{item.Sales_Person_Name}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>{formatDate(item.So_Date)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Branch:</Text>
                    <Text style={styles.value}>{item.Branch_Name}</Text>
                </View>

                {item.Products_List && item.Products_List.length > 0 && (
                    <View style={styles.productsSection}>
                        <Text style={styles.productsHeader}>Products ({item.Products_List.length})</Text>
                        {item.Products_List.slice(0, 2).map((product, index) => (
                            <Text key={index} style={styles.productItem}>
                                • {product.Product_Name} (Qty: {product.Total_Qty} {product.UOM})
                            </Text>
                        ))}
                        {item.Products_List.length > 2 && (
                            <Text style={styles.moreProducts}>
                                +{item.Products_List.length - 2} more items
                            </Text>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, styles.pendingBadge]}>
                    <Text style={styles.statusText}>Pending Order</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderProductCard = (item, index) => {
        const calculatePendingQty = (product, orderData) => {
            const orderedQty = product.Total_Qty || 0;

            // Get the invoiced quantity from ConvertedInvoice
            const convertedInvoices = orderData.ConvertedInvoice || [];
            let invoicedQty = 0;

            convertedInvoices.forEach(invoice => {
                const invoicedProducts = invoice.InvoicedProducts || [];
                invoicedProducts.forEach(invoicedProduct => {
                    if (invoicedProduct.Item_Id === product.Item_Id) {
                        invoicedQty += invoicedProduct.Total_Qty || 0;
                    }
                });
            });

            return orderedQty - invoicedQty;
        };

        // Find the original order data to get ConvertedInvoice
        const originalOrder = pendingSalesOrders.find(order => order.S_Id === item.orderInfo.S_Id);
        const pendingQty = calculatePendingQty(item, originalOrder || {});

        return (
            <View key={`${item.orderInfo.S_Id}-${item.SO_St_Id}`} style={styles.productCard}>
                <View style={styles.productCardHeader}>
                    <View style={styles.productMainInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {item.Product_Name}
                        </Text>
                        <Text style={styles.productBrand}>Brand: {item.BrandGet}</Text>
                        <Text style={styles.productHSN}>HSN: {item.HSN_Code}</Text>
                        <Text style={styles.productTotalValue}>Amount: {formatCurrency(item.Final_Amo)}</Text>
                    </View>
                    <View style={styles.productPriceInfo}>
                        <Text style={styles.productRate}>{formatCurrency(item.Item_Rate)}</Text>
                        <Text style={styles.productQty}>Pending: {pendingQty}</Text>
                        <Text style={styles.productUOM}>{item.UOM}</Text>
                    </View>
                </View>

                <View style={styles.productOrderInfo}>
                    <View style={styles.orderInfoRow}>
                        <Text style={styles.orderInfoLabel}>Order:</Text>
                        <Text style={styles.orderInfoValue}>{item.orderInfo.So_Inv_No}</Text>
                    </View>
                    <View style={styles.orderInfoRow}>
                        <Text style={styles.orderInfoLabel}>Retailer:</Text>
                        <Text style={styles.orderInfoValue} numberOfLines={1}>{item.orderInfo.Retailer_Name}</Text>
                    </View>
                    <View style={styles.orderInfoRow}>
                        <Text style={styles.orderInfoLabel}>Date:</Text>
                        <Text style={styles.orderInfoValue}>{formatDate(item.orderInfo.So_Date)}</Text>
                    </View>
                    <View style={styles.orderInfoRow}>
                        <Text style={styles.orderInfoLabel}>Ordered:</Text>
                        <Text style={styles.orderInfoValue}>{item.Total_Qty} {item.UOM}</Text>
                    </View>
                    <View style={styles.orderInfoRow}>
                        <Text style={styles.orderInfoLabel}>Pending:</Text>
                        <Text style={[styles.orderInfoValue, styles.pendingQtyText]}>{pendingQty} {item.UOM}</Text>
                    </View>
                </View>
            </View>
        )
    };

    const renderEmptyState = (type) => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
                No pending {type === "sales" ? "sales orders" : "products"} found
            </Text>
            <Text style={styles.emptySubText}>
                {type === "sales"
                    ? "All sales orders have been converted to invoices"
                    : "All products have been delivered"
                }
            </Text>
        </View>
    );

    const totalProductsCount = allPendingProducts.length;
    const totalProductsValue = allPendingProducts.reduce((sum, product) => sum + parseFloat(product.Final_Amo || 0), 0);
    const totalSalesValue = pendingSalesOrders.reduce((sum, order) => sum + parseFloat(order.Total_Invoice_value || 0), 0);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Pending Details"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
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
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "sales" && styles.activeTab]}
                        onPress={() => setActiveTab("sales")}
                    >
                        <Text style={[styles.tabText, activeTab === "sales" && styles.activeTabText]}>
                            Sales Orders ({pendingSalesOrders.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "products" && styles.activeTab]}
                        onPress={() => setActiveTab("products")}
                    >
                        <Text style={[styles.tabText, activeTab === "products" && styles.activeTabText]}>
                            Products ({totalProductsCount})
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryNumber}>
                            {activeTab === "sales" ? pendingSalesOrders.length : totalProductsCount}
                        </Text>
                        <Text style={styles.summaryLabel}>
                            {activeTab === "sales" ? "Pending Orders" : "Products"}
                        </Text>
                    </View>
                    {activeTab !== "products" && (
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>
                                {formatCurrency(activeTab === "sales" ? totalSalesValue : totalProductsValue)}
                            </Text>
                            <Text style={styles.summaryLabel}>Total Value</Text>
                        </View>
                    )}

                    {activeTab === "products" && (
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>{pendingSalesOrders.length}</Text>
                            <Text style={styles.summaryLabel}>Orders</Text>
                        </View>
                    )}
                </View>

                <ScrollView
                    style={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingTotalSales}
                            onRefresh={onRefresh}
                            colors={[customColors.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === "sales" ? (
                        pendingSalesOrders.length > 0 ? (
                            pendingSalesOrders.map(renderSalesOrderCard)
                        ) : (
                            renderEmptyState("sales")
                        )
                    ) : (
                        allPendingProducts.length > 0 ? (
                            allPendingProducts.map(renderProductCard)
                        ) : (
                            renderEmptyState("products")
                        )
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}

export default PendingInvoice

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: customColors.grey300,
        margin: 16,
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: "center",
    },
    activeTab: {
        backgroundColor: customColors.primary,
    },
    tabText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.black,
    },
    activeTabText: {
        color: customColors.white,
    },
    summaryContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: customColors.grey100,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginHorizontal: 4,
    },
    summaryNumber: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
        marginBottom: 4,
    },
    summaryLabel: {
        ...typography.body2(),
        color: customColors.grey800,
        textAlign: "center",
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginVertical: 10,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
    },
    invoiceNumber: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primaryDark,
    },
    amount: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primaryDark,
    },
    cardBody: {
        padding: 16,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    label: {
        ...typography.body2(),
        color: customColors.grey700,
        width: 100,
        fontWeight: "500",
    },
    value: {
        ...typography.body2(),
        color: customColors.grey700,
        flex: 1,
        fontWeight: "400",
    },
    productsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: customColors.grey300,
    },
    productsHeader: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.primaryDark,
        marginBottom: 8,
    },
    productItem: {
        ...typography.body2(),
        color: customColors.grey700,
        marginBottom: 4,
        marginLeft: 8,
    },
    moreProducts: {
        ...typography.body2(),
        color: customColors.primary,
        fontStyle: "italic",
        marginLeft: 8,
    },
    cardFooter: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pendingBadge: {
        backgroundColor: customColors.warning + "20",
    },
    statusText: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.warning,
    },
    // Product Card Styles
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    productCardHeader: {
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
    },
    productMainInfo: {
        flex: 1,
        marginRight: 12,
    },
    productName: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        marginBottom: 4,
    },
    productBrand: {
        ...typography.body2(),
        color: customColors.primary,
        marginBottom: 2,
        fontWeight: "600",
    },
    productHSN: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    productTotalValue: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primaryDark,
    },
    productPriceInfo: {
        alignItems: "flex-end",
    },
    productRate: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    pendingQtyText: {
        color: customColors.warning,
        fontWeight: "bold",
    },
    productQty: {
        ...typography.body2(),
        color: customColors.warning,
        marginTop: 2,
    },
    productUOM: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productOrderInfo: {
        backgroundColor: customColors.grey100,
        padding: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    orderInfoRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    orderInfoLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        width: 60,
        fontWeight: "500",
    },
    orderInfoValue: {
        ...typography.caption(),
        color: customColors.grey700,
        flex: 1,
        fontWeight: "500",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey700,
        marginBottom: 8,
    },
    emptySubText: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        paddingHorizontal: 40,
    },
})