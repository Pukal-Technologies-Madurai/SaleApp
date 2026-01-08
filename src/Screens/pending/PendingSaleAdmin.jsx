import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchPendingSalesList } from "../../Api/delivery";
import { customColors, typography } from "../../Config/helper";

const PendingSaleAdmin = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = React.useState(false);

    const toYMD = d => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [selectedFromDate, setSelectedFromDate] = React.useState(() => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return toYMD(firstOfMonth);
    });

    const [selectedToDate, setSelectedToDate] = React.useState(() => {
        if (passedDate) {
            return passedDate;
        }
        return new Date().toISOString().split("T")[0];
    });

    const [activeTab, setActiveTab] = React.useState("sales");

    const { data: pendingSales = [], isLoading: isLoadingPendingSales } =
        useQuery({
            queryKey: [
                "pendingSalesOrder",
                selectedFromDate,
                selectedToDate,
                selectedBranch || "",
            ],
            queryFn: () =>
                fetchPendingSalesList(
                    selectedFromDate,
                    selectedToDate,
                    selectedBranch || "",
                ),
            enabled: !!selectedFromDate && !!selectedToDate,
            select: data => {
                return data.filter(item => item.isConverted !== 2);
            },
        });

    // Process all items from all sales for the items tab
    const allItems = React.useMemo(() => {
        const items = [];
        pendingSales.forEach(sale => {
            if (sale.Products_List && Array.isArray(sale.Products_List)) {
                sale.Products_List.forEach(product => {
                    items.push({
                        ...product,
                        So_Inv_No: sale.So_Inv_No,
                        So_Date: sale.So_Date,
                        Retailer_Name: sale.Retailer_Name,
                        Sales_Person_Name: sale.Sales_Person_Name,
                        So_Id: sale.So_Id
                    });
                });
            }
        });
        return items;
    }, [pendingSales]);

    // console.log("Pending Sales Data:", pendingSales.length);

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

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB");
    };

    const formatCurrency = amount => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const SummaryCard = () => (
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <Icon
                            name="shopping-cart"
                            size={18}
                            color={customColors.primary}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {pendingSales.length}
                        </Text>
                        <Text style={styles.summaryLabel}>Sales</Text>
                    </View>
                </View>

                <View style={styles.summaryVerticalDivider} />

                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <Icon
                            name="trending-down"
                            size={18}
                            color={customColors.info}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {formatCurrency(
                                pendingSales.reduce(
                                    (sum, item) =>
                                        sum +
                                        parseFloat(
                                            item.Total_Invoice_value || 0,
                                        ),
                                    0,
                                ),
                            )}
                        </Text>
                        <Text style={styles.summaryLabel}>S.Value</Text>
                    </View>
                </View>
            </View>

            {/* <View style={styles.summaryHorizontalDivider} /> */}
        </View>
    );

    const TabView = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === "sales" && styles.activeTab]}
                onPress={() => setActiveTab("sales")}
            >
                <Icon
                    name="shopping-cart"
                    size={18}
                    color={
                        activeTab === "sales"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "sales" && styles.activeTabText,
                    ]}
                >
                    Sales ({pendingSales.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.tab, activeTab === "items" && styles.activeTab]}
                onPress={() => setActiveTab("items")}
            >
                <Icon
                    name="inventory"
                    size={18}
                    color={
                        activeTab === "items"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "items" && styles.activeTabText,
                    ]}
                >
                    Items ({allItems.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    const SalesItem = ({ item }) => (
        <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>{item.So_Inv_No}</Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Total_Invoice_value)}
                </Text>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Icon
                        name="date-range"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{formatDate(item.So_Date)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="store"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value} numberOfLines={2}>
                        {item.Retailer_Name}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="person"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{item.Sales_Person_Name}</Text>
                </View>

                {item.Narration && (
                    <View style={styles.infoRow}>
                        <Icon
                            name="note"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value} numberOfLines={1}>
                            {item.Narration}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    const ItemCard = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.productName} numberOfLines={2}>
                    {item.Product_Name}
                </Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Final_Amo)}
                </Text>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Icon
                        name="inventory"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>
                        Qty: {item.Total_Qty} {item.UOM}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="local-offer"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>
                        Rate: {formatCurrency(item.Item_Rate)}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="receipt"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value} numberOfLines={1}>
                        {item.So_Inv_No}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="store"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value} numberOfLines={1}>
                        {item.Retailer_Name}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="person"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{item.Sales_Person_Name}</Text>
                </View>

                {item.BrandGet && (
                    <View style={styles.infoRow}>
                        <Icon
                            name="label"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value}>{item.BrandGet}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const isLoading = isLoadingPendingSales;

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            );
        }

        if (activeTab === "sales") {
            if (pendingSales.length === 0) {
                return (
                    <View style={styles.emptyContainer}>
                        <Icon name="shopping-cart" size={80} color={customColors.grey400} />
                        <Text style={styles.emptyTitle}>No Pending Sales</Text>
                        <Text style={styles.emptyMessage}>
                            No pending sales found for the selected date range.
                        </Text>
                    </View>
                );
            }

            return (
                <FlashList
                    data={pendingSales}
                    renderItem={({ item }) => <SalesItem item={item} />}
                    keyExtractor={item => item.So_Id.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            );
        }

        if (activeTab === "items") {
            if (allItems.length === 0) {
                return (
                    <View style={styles.emptyContainer}>
                        <Icon name="inventory" size={80} color={customColors.grey400} />
                        <Text style={styles.emptyTitle}>No Pending Items</Text>
                        <Text style={styles.emptyMessage}>
                            No pending items found for the selected date range.
                        </Text>
                    </View>
                );
            }

            return (
                <FlashList
                    data={allItems}
                    renderItem={({ item }) => <ItemCard item={item} />}
                    keyExtractor={item => `${item.So_Id}-${item.SO_St_Id}`}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            );
        }

        return null;
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Pending Sales"
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
                <SummaryCard />
                <TabView />
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

export default PendingSaleAdmin;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    summaryCard: {
        backgroundColor: customColors.white,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        padding: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    summaryIconBox: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "#f8f9fa",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    summaryText: {
        alignItems: "flex-start",
    },
    summaryValue: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        lineHeight: 18,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey900,
        marginTop: 2,
    },
    summaryVerticalDivider: {
        width: 1,
        height: 32,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 8,
    },
    summaryHorizontalDivider: {
        height: 1,
        backgroundColor: "#e0e0e0",
        marginVertical: 8,
    },

    // Tab Styles
    tabContainer: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 1,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: customColors.primary,
    },
    tabText: {
        ...typography.body2(),
        color: customColors.grey900,
        marginLeft: 6,
        fontWeight: "500",
    },
    activeTabText: {
        color: customColors.white,
        fontWeight: "600",
    },

    // List Container
    listContainer: {
        padding: 16,
        paddingBottom: 20,
    },

    // Delivery Card Styles
    deliveryCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    invoiceNumber: {
        ...typography.subtitle1(),
        fontWeight: "700",
        color: customColors.primary,
    },
    invoiceValue: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.success,
    },
    cardContent: {
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    icon: {
        marginRight: 8,
        width: 16,
    },
    value: {
        ...typography.body2(),
        color: customColors.grey800,
        flex: 1,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: 10,
    },

    // Item Card Styles
    itemCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: customColors.info,
    },
    productName: {
        ...typography.subtitle1(),
        fontWeight: "700",
        color: customColors.primaryDark,
        flex: 1,
        marginRight: 8,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey700,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        lineHeight: 20,
    },
});
