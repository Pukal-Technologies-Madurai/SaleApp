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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";

const SalesAdmin = () => {
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
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                // Set initial dates to today
                const today = new Date();
                setSelectedFromDate(today);
                setSelectedToDate(today);
                const formattedDate = today.toISOString().split("T")[0];

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
    }, []);

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
                setTotalOrderAmount(0);
            }
        } catch (error) {
            console.log("Error fetching logs: ", error);
            setLogData([]);
            setProductSummary([]);
            setTotalOrderAmount(0);
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
        setTotalOrderAmount(totalAmount);
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

    const handleFromDateChange = (event, date) => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = (event, date) => {
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

    // const toggleAccordion = index => {
    //     setExpandedItem(expandedItem === index ? null : index);
    // };

    const toggleAccordion = orderId => {
        setExpandedItemId(expandedItemId === orderId ? null : orderId);
    };

    // const renderRetailerItem = (item, index) => {
    //     // const isExpanded = expandedItem === index;
    //     const isExpanded = expandedItemId === item.So_Id;

    //     return (
    //         <View key={item.So_Id} style={styles.retailerContainer}>
    //             <TouchableOpacity
    //                 style={styles.retailerHeader}
    //                 onPress={() => toggleAccordion(item.So_Id)}>
    //                 <View style={styles.retailerHeaderContent}>
    //                     <Text style={styles.retailerName} numberOfLines={2}>
    //                         {item.Retailer_Name}
    //                     </Text>
    //                     <View style={styles.headerRight}>
    //                         <Text style={styles.orderAmount}>
    //                             ₹{item.Total_Invoice_value}
    //                         </Text>
    //                         <MaterialCommunityIcons
    //                             name={
    //                                 isExpanded ? "chevron-up" : "chevron-down"
    //                             }
    //                             size={24}
    //                             color={customColors.white}
    //                         />
    //                     </View>
    //                 </View>
    //             </TouchableOpacity>

    //             {isExpanded && (
    //                 <View style={styles.retailerContent}>
    //                     <View style={styles.orderHeader}>
    //                         <Text style={styles.orderId}>
    //                             Order #{item.So_Id}
    //                         </Text>
    //                         <Text style={styles.orderDate}>
    //                             {new Date(item.So_Date).toLocaleDateString()}
    //                         </Text>
    //                     </View>

    //                     <View style={styles.productsList}>
    //                         <View style={styles.productHeader}>
    //                             <Text
    //                                 style={[
    //                                     styles.retailerProductCell,
    //                                     styles.retailerProductNameCell,
    //                                 ]}>
    //                                 Product
    //                             </Text>
    //                             <Text style={styles.retailerProductCell}>
    //                                 Qty
    //                             </Text>
    //                             <Text style={styles.retailerProductCell}>
    //                                 Amount
    //                             </Text>
    //                         </View>

    //                         {item.Products_List.map((product, pIndex) => (
    //                             <View
    //                                 key={`${item.So_Id}-${pIndex}`}
    //                                 style={styles.productRow}>
    //                                 <Text
    //                                     style={[
    //                                         styles.retailerProductCell,
    //                                         { flex: 2, flexWrap: "wrap" },
    //                                     ]}
    //                                     numberOfLines={3}>
    //                                     {product.Product_Name}
    //                                 </Text>
    //                                 <Text style={styles.retailerProductCell}>
    //                                     {product.Bill_Qty}
    //                                 </Text>
    //                                 <Text style={styles.retailerProductCell}>
    //                                     ₹{product.Amount}
    //                                 </Text>
    //                             </View>
    //                         ))}

    //                         <View style={styles.orderTotal}>
    //                             <Text style={styles.totalLabel}>Total</Text>
    //                             <Text style={styles.totalAmount}>
    //                                 ₹{item.Total_Invoice_value}
    //                             </Text>
    //                         </View>
    //                     </View>
    //                 </View>
    //             )}
    //         </View>
    //     );
    // };

    const renderRetailerItem = item => {
        return (
            <View key={item.So_Id} style={styles.retailerContainer}>
                {/* Header */}
                <View style={styles.retailerHeader}>
                    <View style={styles.retailerHeaderContent}>
                        <Text style={styles.retailerName} numberOfLines={2}>
                            {item.Retailer_Name}
                        </Text>
                        <View style={styles.headerRight}>
                            <Text style={styles.orderAmount}>
                                ₹{item.Total_Invoice_value}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Body: Products List */}
                <View style={styles.retailerContent}>
                    <Text style={styles.orderId}>
                        Invoice: {item.So_Inv_No}
                    </Text>
                    <View style={styles.productsList}>
                        <View style={styles.productHeader}>
                            <Text
                                style={[
                                    styles.retailerProductCell,
                                    styles.retailerProductNameCell,
                                ]}>
                                Product
                            </Text>
                            <Text
                                style={[
                                    styles.retailerProductCell,
                                    { textAlign: "center" },
                                ]}>
                                Qty
                            </Text>
                            <Text style={styles.retailerProductCell}>
                                Amount
                            </Text>
                        </View>

                        {item.Products_List.map((product, pIndex) => (
                            <View
                                key={`${item.So_Id}-${pIndex}`}
                                style={styles.productRow}>
                                <Text
                                    style={[
                                        styles.retailerProductCell,
                                        {
                                            flex: 3,
                                            flexWrap: "wrap",
                                            textAlign: "left",
                                        },
                                    ]}
                                    numberOfLines={3}>
                                    {product.Product_Name}
                                </Text>
                                <Text
                                    style={[
                                        styles.retailerProductCell,
                                        { textAlign: "center" },
                                    ]}>
                                    {product.Total_Qty}
                                </Text>
                                <Text style={styles.retailerProductCell}>
                                    ₹{product.Final_Amo.toFixed(2)}
                                </Text>
                            </View>
                        ))}

                        <View style={styles.orderTotal}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>
                                ₹{item.Total_Invoice_value}
                            </Text>
                        </View>
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

    return (
        <View style={styles.container}>
            <AppHeader
                title="Sales Order Summary"
                navigation={navigation}
                showFilterDropdown={true}
                filterDropdownData={salesPersonData}
                filterTitle="Select Sales Person"
                selectedFilter={selectedSalesPerson}
                onFilterChange={handleSalesPersonChange}
            />

            <View style={styles.contentContainer}>
                {selectedSalesPerson ? (
                    <Text
                        style={{
                            padding: 10,
                            textAlign: "center",
                            ...typography.subtitle1(),
                            color: customColors.black,
                        }}>
                        Sales Person: {selectedSalesPerson.label}
                    </Text>
                ) : (
                    <Text
                        style={{
                            padding: 10,
                            textAlign: "center",
                            ...typography.subtitle1(),
                            color: customColors.black,
                        }}>
                        Sales Person: All
                    </Text>
                )}

                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="From Date"
                        date={selectedFromDate}
                        onDateChange={handleFromDateChange}
                        containerStyle={{ width: "50%" }}
                    />
                    <DatePickerButton
                        title="To Date"
                        date={selectedToDate}
                        onDateChange={handleToDateChange}
                        containerStyle={{ width: "50%" }}
                    />
                </View>

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
                        <View style={styles.statItem}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="shopping"
                                    size={24}
                                    color={customColors.primary}
                                />
                            </View>
                            <View style={styles.statContent}>
                                <Text style={styles.statLabel}>
                                    Total Sales
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalSales}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="currency-inr"
                                    size={24}
                                    color={customColors.success}
                                />
                            </View>
                            <View style={styles.statContent}>
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
                        <TouchableOpacity onPress={handleProductSummaryPress}>
                            <FeatherIcon
                                name="arrow-up-right"
                                size={24}
                                color={customColors.primary}
                            />
                        </TouchableOpacity>
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
                    {filteredOrderData.map(item => renderRetailerItem(item))}
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
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
    datePickerContainer: {
        flexDirection: "row",
        marginHorizontal: spacing.md,
        marginTop: spacing.xs,
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    countContainer: {
        marginHorizontal: spacing.md,
        marginVertical: spacing.xxs,
    },
    statsContainer: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.xs,
        ...shadows.medium,
    },
    statItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
    },
    iconContainer: {
        width: 25,
        height: 25,
        borderRadius: 24,
        backgroundColor: customColors.grey50,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
        ...shadows.small,
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    statValue: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    statDivider: {
        width: 1,
        backgroundColor: customColors.grey200,
        marginHorizontal: spacing.sm,
    },
    accordationScrollContainer: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    accordionHeader: {
        width: "70%",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: customColors.primary,
        borderRadius: 8,
        marginBottom: spacing.xs,
    },
    retailerName: {
        ...typography.subtitle2(),
        color: customColors.white,
        flex: 1,
        marginRight: spacing.sm,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    orderAmount: {
        ...typography.subtitle1(),
        color: customColors.white,
    },
    content: {
        margin: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        backgroundColor: customColors.white,
    },
    invoiceHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: customColors.grey50,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    invoiceTitle: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    invoiceDate: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    invoiceBody: {
        padding: spacing.sm,
    },
    invoiceProducts: {
        marginBottom: spacing.sm,
    },
    productRowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    invoiceCell: {
        flex: 1,
        textAlign: "center",
        ...typography.caption(),
    },
    productNameCell: {
        flex: 2,
        flexWrap: "wrap",
        textAlign: "left",
        paddingRight: spacing.xs,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    totalValue: {
        ...typography.subtitle2(),
        color: customColors.primary,
    },
    dropdown: {
        width: "100%",
        backgroundColor: customColors.white,
    },
    tabContainer: {
        flexDirection: "row",
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: 8,
        ...shadows.small,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    activeTab: {
        borderBottomColor: customColors.primary,
    },
    tabText: {
        ...typography.subtitle2(),
        color: customColors.grey700,
    },
    activeTabText: {
        color: customColors.primary,
        fontWeight: "600",
    },
    tableContainer: {
        marginTop: spacing.sm,
        padding: spacing.md,
        paddingBottom: spacing.xl * 11,
    },
    tableHeader: {
        backgroundColor: customColors.primaryLight,
        padding: spacing.sm,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    productHeaderCell: {
        flex: 2,
    },
    quantityHeaderCell: {
        flex: 1,
    },
    amountHeaderCell: {
        flex: 1,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.sm,
    },
    summaryText: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    tableBody: {
        marginTop: spacing.sm,
    },
    tableRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.sm,
    },
    evenRow: {
        backgroundColor: customColors.grey100,
    },
    oddRow: {
        backgroundColor: customColors.white,
    },
    tableCell: {
        flex: 1,
        textAlign: "center",
        ...typography.caption(),
    },
    productCell: {
        flex: 2,
        flexWrap: "wrap",
        textAlign: "left",
        paddingRight: spacing.xs,
    },
    quantityCell: {
        flex: 1,
    },
    amountCell: {
        flex: 1,
    },
    headerText: {
        ...typography.subtitle1(),
        color: customColors.grey900,
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
    retailerContainer: {
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: 8,
        overflow: "hidden",
        ...shadows.small,
    },
    retailerHeader: {
        backgroundColor: customColors.primary,
        padding: spacing.md,
    },
    retailerHeaderContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    retailerContent: {
        padding: spacing.md,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    orderId: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    orderDate: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    productsList: {
        marginTop: spacing.sm,
    },
    productHeader: {
        flexDirection: "row",
        backgroundColor: customColors.grey50,
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    orderTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalAmount: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    retailerProductCell: {
        flex: 1,
        textAlign: "right",
        ...typography.body2(),
    },
    retailerProductNameCell: {
        flex: 3,
        textAlign: "left",
        paddingRight: spacing.sm,
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
        fontSize: 16,
        color: customColors.grey900,
    },
});

export default SalesAdmin;
