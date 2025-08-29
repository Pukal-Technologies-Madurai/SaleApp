import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import Accordion from "../../Components/Accordion";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import FilterModal from "../../Components/FilterModal";
import { SafeAreaView } from "react-native-safe-area-context";

const SalesAdmin = ({ route }) => {
    const { selectedDate: passedDate } = route.params || {};
    const navigation = useNavigation();
    const [companyId, setCompanyId] = useState(null);
    const [logData, setLogData] = useState([]);
    const [salesPersonData, setSalesPersonData] = useState([]);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState({
        label: "All",
        value: "all",
    });
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [productSummary, setProductSummary] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                // Set initial dates to today
                const initialDate = passedDate
                    ? new Date(passedDate)
                    : new Date();
                setSelectedFromDate(initialDate);
                setSelectedToDate(initialDate);
                const formattedDate = initialDate.toISOString().split("T")[0];

                setCompanyId(Number(Company_Id));
                fetchSalesPerson(Company_Id);
                setSelectedSalesPerson({ label: "All", value: "all" });

                fetchSaleOrder(
                    formattedDate,
                    formattedDate,
                    Company_Id,
                    userId,
                );
            } catch (err) {
                console.log("Error in useEffect:", err);
            }
        })();
    }, [passedDate]);

    // Add new useEffect for date changes
    useEffect(() => {
        if (companyId && selectedSalesPerson) {
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            fetchSaleOrder(
                fromDate,
                toDate,
                companyId,
                selectedSalesPerson.value,
            );
        }
    }, [selectedFromDate, selectedToDate, selectedSalesPerson]);

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        try {
            // Format dates to YYYY-MM-DD
            const fromDate = new Date(from).toISOString().split("T")[0];
            const toDate = new Date(to).toISOString().split("T")[0];

            let url = `${API.saleOrder()}?Fromdate=${fromDate}&Todate=${toDate}&Company_Id=${company}`;
            // console.log("URL: ", url);

            if (userId && userId !== "all") {
                url += `&Created_by=${userId}&Sales_Person_Id=${userId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success === true && Array.isArray(data.data)) {
                // console.log("Data received:", data.data.length, "items");
                setLogData(data.data);
                calculateProductSummaryAndTotals(data.data);
            } else {
                // console.log("No data received or invalid response format");
                setLogData([]);
                setProductSummary([]);
            }
        } catch (error) {
            console.log("Error fetching logs: ", error);
            setLogData([]);
            setProductSummary([]);
        }
    };

    const calculateProductSummaryAndTotals = orders => {
        const summary = {};
        let totalAmount = 0;
        let productCount = 0;

        orders.forEach(order => {
            totalAmount += order.Total_Invoice_value;
            order.Products_List.forEach(product => {
                productCount += product.Total_Qty;
                if (!summary[product.Product_Name]) {
                    summary[product.Product_Name] = {
                        productName: product.Product_Name,
                        totalQty: 0,
                        totalAmount: 0,
                        timesSold: 0,
                    };
                }
                summary[product.Product_Name].totalQty += product.Total_Qty;
                summary[product.Product_Name].totalAmount += product.Amount;
                summary[product.Product_Name].timesSold += 1;
            });
        });

        setProductSummary(Object.values(summary));
    };

    const fetchSalesPerson = async companyId => {
        try {
            const url = `${API.salesPerson()}${companyId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success === true) {
                const dropdownData = [
                    { label: "All", value: "all" },
                    ...data.data.map(item => ({
                        label: item.Name,
                        value: item.UserId,
                    })),
                ];
                setSalesPersonData(dropdownData);
            }
        } catch (err) {
            console.error(err);
        }
    };

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

    useEffect(() => {
        if (logData.length > 0) {
            const brands = new Set();
            logData.forEach(order => {
                order.Products_List.forEach(p => {
                    if (p.BrandGet) {
                        brands.add(p.BrandGet.trim());
                    }
                });
            });

            setBrandList(["All", ...Array.from(brands)]);
        }
    }, [logData]);

    const handleSalesPersonChange = item => {
        setSelectedSalesPerson(item);

        const formattedFromDate = selectedFromDate.toISOString().split("T")[0];
        const formattedToDate = selectedToDate.toISOString().split("T")[0];

        fetchSaleOrder(
            formattedFromDate,
            formattedToDate,
            companyId,
            item.value,
        );
    };

    const renderHeader = item => {
        return (
            <View style={styles.accordionHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.retailerName} numberOfLines={1}>
                        {item.Retailer_Name}
                    </Text>
                    <Text style={styles.orderDate}>
                        {item.So_Date
                            ? new Date(item.So_Date).toLocaleDateString("en-GB")
                            : "N/A"}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.orderAmount}>
                        ₹{item.Total_Invoice_value}
                    </Text>
                    <Text style={styles.orderCount}>
                        {item.Products_List.length} items
                    </Text>
                </View>
            </View>
        );
    };

    const renderContent = item => {
        return (
            <View style={styles.content}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>Order #{item.So_Id}</Text>
                    <Text style={styles.createdBy}>
                        by {item.Created_BY_Name}
                    </Text>
                </View>

                <View style={styles.productsContainer}>
                    {item.Products_List.map((product, index) => (
                        <View key={index} style={styles.productItem}>
                            <View style={styles.productInfo}>
                                <Text
                                    style={styles.productName}
                                    numberOfLines={3}>
                                    {product.Product_Name}
                                </Text>
                                <Text style={styles.productDetails}>
                                    Qty: {product.Bill_Qty || product.Total_Qty}{" "}
                                    • ₹{product.Item_Rate} each
                                </Text>
                            </View>
                            <Text style={styles.productAmount}>
                                ₹
                                {product.Amount ||
                                    product.Final_Amo?.toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.footer}>
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>
                            ₹{item.Total_Invoice_value}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const handleProductSummaryPress = () => {
        navigation.navigate("SalesReport", {
            logData,
            productSummary,
            selectedDate: selectedFromDate,
            isNotAdmin: false,
        });
    };

    const filteredLogData = logData.filter(order =>
        selectedBrand === "All"
            ? true
            : order.Products_List.some(
                  p => p.BrandGet?.trim() === selectedBrand,
              ),
    );

    const filteredTotalSales = filteredLogData.length;

    const filteredTotalAmount = filteredLogData.reduce(
        (sum, order) => sum + (order.Total_Invoice_value || 0),
        0,
    );

    const filteredOrderData = filteredLogData.filter(order =>
        order.Retailer_Name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Sales Order Summary"
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
                showSalesPerson={true}
                salesPersonLabel="Select Sales Person"
                salesPersonData={salesPersonData}
                selectedSalesPerson={selectedSalesPerson}
                onSalesPersonChange={handleSalesPersonChange}
            />

            <View style={styles.contentContainer}>
                <View style={styles.countContainer}>
                    <View style={styles.searchHeader}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{
                                flex: 1,
                                paddingHorizontal: spacing.md,
                                marginVertical: spacing.sm,
                            }}>
                            {brandList.map((brand, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{
                                        paddingVertical: spacing.xs,
                                        paddingHorizontal: spacing.md,
                                        marginRight: spacing.sm,
                                        borderRadius: 20,
                                        backgroundColor:
                                            selectedBrand === brand
                                                ? customColors.primary
                                                : customColors.grey200,
                                    }}
                                    onPress={() => setSelectedBrand(brand)}>
                                    <Text
                                        style={{
                                            color:
                                                selectedBrand === brand
                                                    ? customColors.white
                                                    : customColors.grey900,
                                            ...typography.caption(),
                                        }}>
                                        {brand}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.searchIcon}
                            onPress={() => {
                                setSearchQuery("");
                                setShowSearch(!showSearch);
                            }}>
                            <MaterialIcon
                                name={showSearch ? "close" : "search"}
                                size={24}
                                color={customColors.grey900}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsContainer}>
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={handleProductSummaryPress}
                            activeOpacity={0.7}>
                            <FeatherIcon
                                name="arrow-up-right"
                                size={14}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    Total Sales
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalSales}
                                </Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    Total Amount
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalAmount
                                        ? `₹${filteredTotalAmount.toFixed(2)}`
                                        : "₹0.00"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {showSearch && (
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search retailer..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                    )}
                </View>

                <ScrollView
                    style={styles.retailersScrollContainer}
                    contentContainerStyle={styles.retailersScrollContent}
                    showsVerticalScrollIndicator={false}>
                    <Accordion
                        data={filteredOrderData}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                    />
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

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
    dropdownWrapper: {
        padding: spacing.sm,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    countContainer: {
        marginHorizontal: spacing.md,
        marginVertical: spacing.xxs,
    },
    statsContainer: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginHorizontal: spacing.xs,
        position: "relative",
        ...shadows.small,
    },
    reportButton: {
        position: "absolute",
        top: spacing.sm,
        right: spacing.sm,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingTop: spacing.xs,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
        textAlign: "center",
    },
    statValue: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: "600",
        textAlign: "center",
    },
    accordationScrollContainer: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        marginBottom: 2,
    },
    headerLeft: {
        flex: 1,
        marginRight: spacing.sm,
    },
    retailerName: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
        marginBottom: 2,
    },
    orderDate: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
    },
    headerRight: {
        alignItems: "flex-end",
    },
    orderAmount: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "700",
    },
    orderCount: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.8,
        marginTop: 1,
    },
    content: {
        backgroundColor: customColors.white,
        borderRadius: 6,
        marginHorizontal: 2,
        marginBottom: spacing.xs,
        overflow: "hidden",
        ...shadows.small,
    },
    content: {
        margin: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        backgroundColor: customColors.white,
    },
    orderInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    orderNumber: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    createdBy: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productsContainer: {
        paddingVertical: spacing.xs,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey50,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        width: "88%",
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
        marginBottom: 2,
    },
    productDetails: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    productAmount: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    footer: {
        backgroundColor: customColors.grey25,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    totalValue: {
        ...typography.subtitle1(),
        color: customColors.primary,
        fontWeight: "700",
    },

    totalLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    totalValue: {
        ...typography.subtitle2(),
        color: customColors.primary,
    },
    retailersScrollContainer: {
        flex: 1,
    },
    retailersScrollContent: {
        padding: spacing.md,
    },
    bottomSpacer: {
        height: spacing.xxl * 2,
    },
    searchHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    searchIcon: {
        padding: spacing.xs,
        borderRadius: 50,
        backgroundColor: customColors.grey100,
        marginLeft: spacing.sm,
        ...shadows.small,
    },
    searchContainer: {
        marginBottom: spacing.sm,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: customColors.white,
        ...shadows.medium,
    },
    searchInput: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        color: customColors.grey900,
    },
});

export default SalesAdmin;
