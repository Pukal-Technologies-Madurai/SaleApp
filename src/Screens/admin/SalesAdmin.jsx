import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    LayoutAnimation,
    Modal,
    Pressable,
    ActivityIndicator,
} from "react-native";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../../Components/AppHeader";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    customFonts,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import FilterModal from "../../Components/FilterModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";

const SalesAdmin = ({ route }) => {
    const {
        selectedDate: passedDate,
        selectedBranch,
        selectedSalesPersonId,
    } = route.params || {};
    // console.log("Selected Branch in SalesAdmin:", selectedBranch);

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
    // Modal dates - only applied when user taps Apply
    const [modalFromDate, setModalFromDate] = useState(new Date());
    const [modalToDate, setModalToDate] = useState(new Date());
    const [productSummary, setProductSummary] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [statusFilterModalVisible, setStatusFilterModalVisible] =
        useState(false);
    const [timeFilterModalVisible, setTimeFilterModalVisible] = useState(false);
    const [conversionFilter, setConversionFilter] = useState("all");
    const [timeFromInput, setTimeFromInput] = useState("");
    const [timeToInput, setTimeToInput] = useState("");
    const [timeFromPeriod, setTimeFromPeriod] = useState("AM");
    const [timeToPeriod, setTimeToPeriod] = useState("PM");
    const [timeFilterError, setTimeFilterError] = useState("");
    const [timeFilter, setTimeFilter] = useState({
        fromMinutes: null,
        toMinutes: null,
        fromLabel: "",
        toLabel: "",
    });
    const [isFilterRefreshing, setIsFilterRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // Resolve correct label from salesPersonData once it loads
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (!hasAutoSelected.current && selectedSalesPersonId && salesPersonData.length > 1) {
            const match = salesPersonData.find(
                d => String(d.value) === String(selectedSalesPersonId),
            );
            if (match) {
                setSelectedSalesPerson(match);
                hasAutoSelected.current = true;
            }
        }
    }, [salesPersonData, selectedSalesPersonId]);

    useEffect(() => {
        (async () => {
            try {
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

                // Use selectedSalesPersonId if passed, otherwise show all
                const salesPersonIdToUse = selectedSalesPersonId || "all";
                setSelectedSalesPerson({
                    label: selectedSalesPersonId ? "Selected" : "All",
                    value: salesPersonIdToUse,
                });
            } catch (err) {
                console.log("Error in useEffect:", err);
            }
        })();
    }, [passedDate, selectedSalesPersonId]);

    // Fetch whenever active filters change.
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
    }, [
        companyId,
        selectedFromDate,
        selectedToDate,
        selectedSalesPerson,
        selectedBranch,
    ]);

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        try {
            // Format dates to YYYY-MM-DD
            const fromDate = new Date(from).toISOString().split("T")[0];
            const toDate = new Date(to).toISOString().split("T")[0];

            let url = `${API.saleOrder()}?Fromdate=${fromDate}&Todate=${toDate}&Company_Id=${company}&Branch_Id=${selectedBranch || ""}`;
            // console.log("URL: ", url);

            if (userId && userId !== "all") {
                url += `&Created_by=${userId}&Sales_Person_Id=${userId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success === true && Array.isArray(data.data)) {
                // console.log("Data received:", data.data.length, "items");
                const filteredData = data.data.filter(
                    item =>
                        item.Cancel_status !== "0" && item.Cancel_status !== 0,
                );
                setLogData(filteredData);
                calculateProductSummaryAndTotals(filteredData);
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

    const fetchSalesPerson = async () => {
        try {
            const url = `${API.salesPerson()}`;
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

    // Modal date handlers - no validation during selection
    const handleFromDateChange = useCallback(date => {
        if (date) {
            setModalFromDate(date);
        }
    }, []);

    const handleToDateChange = useCallback(date => {
        if (date) {
            setModalToDate(date);
        }
    }, []);

    // Open modal and initialize modal dates from current selected dates
    const handleOpenModal = useCallback(() => {
        setModalFromDate(selectedFromDate);
        setModalToDate(selectedToDate);
        setModalVisible(true);
    }, [selectedFromDate, selectedToDate]);

    // Apply filter - validate and set actual dates
    const handleApplyFilter = useCallback(() => {
        // Ensure fromDate <= toDate
        const validFromDate =
            modalFromDate > modalToDate ? modalToDate : modalFromDate;
        const validToDate =
            modalToDate < modalFromDate ? modalFromDate : modalToDate;

        setSelectedFromDate(validFromDate);
        setSelectedToDate(validToDate);
        setModalVisible(false);
    }, [modalFromDate, modalToDate]);

    // Memoized brand list extraction
    const brandList = useMemo(() => {
        if (logData.length === 0) return [];
        const brands = new Set();
        logData.forEach(order => {
            order.Products_List.forEach(p => {
                if (p.BrandGet) {
                    brands.add(p.BrandGet.trim());
                }
            });
        });
        return ["All", ...Array.from(brands)];
    }, [logData]);

    const handleSalesPersonChange = item => {
        setSelectedSalesPerson(item);
    };

    const handleBrandChange = useCallback(
        brand => {
            if (brand === selectedBrand) return;
            setIsFilterRefreshing(true);
            setSelectedBrand(brand);
        },
        [selectedBrand],
    );

    const handleConversionFilterChange = useCallback(
        filterKey => {
            if (filterKey === conversionFilter) {
                setStatusFilterModalVisible(false);
                return;
            }

            setIsFilterRefreshing(true);
            setConversionFilter(filterKey);
            setStatusFilterModalVisible(false);
        },
        [conversionFilter],
    );

    const getOrderDeliveryState = useCallback(order => {
        const convertedInvoices = Array.isArray(order?.ConvertedInvoice)
            ? order.ConvertedInvoice
            : [];
        const hasConvertedInvoice = convertedInvoices.length > 0;
        const isDelivered = convertedInvoices.some(
            inv =>
                String(inv?.deliveryStatusGet || "")
                    .trim()
                    .toLowerCase() === "delivered",
        );

        return {
            hasConvertedInvoice,
            isDelivered,
            isNotDelivered: !isDelivered,
        };
    }, []);

    const parseFlexibleTimeToMinutes = useCallback((value, fallbackPeriod) => {
        if (!value) return null;
        const normalized = value.trim().toUpperCase();
        const match = normalized.match(
            /^(1[0-2]|0?[1-9])[\.:]([0-5][0-9])(?:\s?(AM|PM))?$/,
        );
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = (match[3] || fallbackPeriod || "AM").toUpperCase();

        if (period === "AM" && hours === 12) hours = 0;
        if (period === "PM" && hours !== 12) hours += 12;

        return hours * 60 + minutes;
    }, []);

    const normalizeDisplayTime = useCallback(value => {
        const normalized = value.trim();
        const match = normalized.match(/^(1[0-2]|0?[1-9])[\.:]([0-5][0-9])$/);
        if (!match) return normalized;
        const hour = String(parseInt(match[1], 10));
        const minute = match[2];
        return `${hour}.${minute}`;
    }, []);

    const parseStoredTimeLabel = useCallback(label => {
        if (!label) return null;
        const match = label.trim().match(
            /^(1[0-2]|0?[1-9])[\.:]([0-5][0-9])\s?(AM|PM)$/i,
        );
        if (!match) return null;

        return {
            time: `${parseInt(match[1], 10)}.${match[2]}`,
            period: match[3].toUpperCase(),
        };
    }, []);

    const handleOpenTimeFilter = useCallback(() => {
        const parsedFrom = parseStoredTimeLabel(timeFilter.fromLabel);
        const parsedTo = parseStoredTimeLabel(timeFilter.toLabel);

        setTimeFromInput(parsedFrom?.time || "");
        setTimeToInput(parsedTo?.time || "");
        setTimeFromPeriod(parsedFrom?.period || "AM");
        setTimeToPeriod(parsedTo?.period || "PM");
        setTimeFilterError("");
        setTimeFilterModalVisible(true);
    }, [timeFilter.fromLabel, timeFilter.toLabel, parseStoredTimeLabel]);

    const handleApplyTimeFilter = useCallback(() => {
        const fromRaw = timeFromInput.trim().toUpperCase();
        const toRaw = timeToInput.trim().toUpperCase();

        // Empty inputs clear time filter.
        if (!fromRaw && !toRaw) {
            setTimeFilter({
                fromMinutes: null,
                toMinutes: null,
                fromLabel: "",
                toLabel: "",
            });
            setTimeFromPeriod("AM");
            setTimeToPeriod("PM");
            setTimeFilterError("");
            setTimeFilterModalVisible(false);
            setIsFilterRefreshing(true);
            return;
        }

        if (!fromRaw || !toRaw) {
            setTimeFilterError(
                "Enter both From Time and To Time in hh:mm AM/PM",
            );
            return;
        }

        const fromMinutes = parseFlexibleTimeToMinutes(fromRaw, timeFromPeriod);
        const toMinutes = parseFlexibleTimeToMinutes(toRaw, timeToPeriod);

        if (fromMinutes === null || toMinutes === null) {
            setTimeFilterError("Use format like 9.30 or 9:30 (AM/PM optional)");
            return;
        }

        const normalizedFrom = normalizeDisplayTime(fromRaw);
        const normalizedTo = normalizeDisplayTime(toRaw);

        setTimeFilter({
            fromMinutes,
            toMinutes,
            fromLabel: `${normalizedFrom} ${timeFromPeriod.toLowerCase()}`,
            toLabel: `${normalizedTo} ${timeToPeriod.toLowerCase()}`,
        });
        setTimeFilterError("");
        setTimeFilterModalVisible(false);
        setIsFilterRefreshing(true);
    }, [
        timeFromInput,
        timeToInput,
        timeFromPeriod,
        timeToPeriod,
        parseFlexibleTimeToMinutes,
        normalizeDisplayTime,
    ]);

    const handleClearTimeFilter = useCallback(() => {
        setTimeFromInput("");
        setTimeToInput("");
        setTimeFromPeriod("AM");
        setTimeToPeriod("PM");
        setTimeFilterError("");
        setTimeFilter({
            fromMinutes: null,
            toMinutes: null,
            fromLabel: "",
            toLabel: "",
        });
        setTimeFilterModalVisible(false);
        setIsFilterRefreshing(true);
    }, []);

    // Toggle accordion expansion
    const toggleExpanded = useCallback(itemId => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(prev => (prev === itemId ? null : itemId));
    }, []);

    // Memoized filtered data by brand, sorted by Created_on ascending
    const filteredLogData = useMemo(() => {
        let data;
        if (selectedBrand === "All") {
            data = [...logData];
        } else {
            data = logData
                .map(order => {
                    const filteredProducts = order.Products_List.filter(
                        product => product.BrandGet?.trim() === selectedBrand,
                    );

                    if (filteredProducts.length > 0) {
                        const brandTotal = filteredProducts.reduce(
                            (sum, product) =>
                                sum +
                                (product.Amount || product.Final_Amo || 0),
                            0,
                        );

                        return {
                            ...order,
                            Products_List: filteredProducts,
                            Total_Invoice_value: brandTotal,
                            Original_Total: order.Total_Invoice_value,
                        };
                    }
                    return null;
                })
                .filter(order => order !== null);
        }

        if (conversionFilter === "converted") {
            data = data.filter(
                order => getOrderDeliveryState(order).hasConvertedInvoice,
            );
        } else if (conversionFilter === "pending") {
            data = data.filter(
                order => !getOrderDeliveryState(order).hasConvertedInvoice,
            );
        } else if (conversionFilter === "delivered") {
            data = data.filter(
                order => getOrderDeliveryState(order).isDelivered,
            );
        } else if (conversionFilter === "not_delivered") {
            data = data.filter(
                order => getOrderDeliveryState(order).isNotDelivered,
            );
        }

        if (timeFilter.fromMinutes !== null && timeFilter.toMinutes !== null) {
            data = data.filter(order => {
                if (!order.Created_on) return false;
                const createdDate = new Date(order.Created_on);
                if (isNaN(createdDate.getTime())) return false;

                const orderMinutes =
                    createdDate.getHours() * 60 + createdDate.getMinutes();

                // Support normal and midnight-crossing ranges.
                if (timeFilter.fromMinutes <= timeFilter.toMinutes) {
                    return (
                        orderMinutes >= timeFilter.fromMinutes &&
                        orderMinutes <= timeFilter.toMinutes
                    );
                }

                return (
                    orderMinutes >= timeFilter.fromMinutes ||
                    orderMinutes <= timeFilter.toMinutes
                );
            });
        }

        // Sort by Created_on ascending
        return data.sort((a, b) => {
            const timeA = a.Created_on
                ? new Date(a.Created_on).getTime()
                : null;
            const timeB = b.Created_on
                ? new Date(b.Created_on).getTime()
                : null;
            if (timeA === null && timeB === null) return 0;
            if (timeA === null) return 1;
            if (timeB === null) return -1;
            return timeA - timeB;
        });
    }, [
        logData,
        selectedBrand,
        conversionFilter,
        timeFilter,
        getOrderDeliveryState,
    ]);

    // Memoized stats
    const { filteredTotalSales, filteredTotalAmount } = useMemo(() => {
        const totalSales = filteredLogData.length;
        const totalAmount = filteredLogData.reduce((sum, order) => {
            return sum + (order.Total_Invoice_value || 0);
        }, 0);
        return {
            filteredTotalSales: totalSales,
            filteredTotalAmount: totalAmount,
        };
    }, [filteredLogData]);

    // Memoized search filtered data
    const filteredOrderData = useMemo(() => {
        if (!searchQuery.trim()) return filteredLogData;
        const query = searchQuery.toLowerCase();
        return filteredLogData.filter(order =>
            order.Retailer_Name.toLowerCase().includes(query),
        );
    }, [filteredLogData, searchQuery]);

    const filteredProductSummary = useMemo(() => {
        const summary = {};

        filteredOrderData.forEach(order => {
            (order.Products_List || []).forEach(product => {
                const productName = product.Product_Name || "Unknown Product";
                if (!summary[productName]) {
                    summary[productName] = {
                        productName,
                        totalQty: 0,
                        totalAmount: 0,
                        timesSold: 0,
                    };
                }

                summary[productName].totalQty +=
                    product.Total_Qty || product.Bill_Qty || 0;
                summary[productName].totalAmount +=
                    product.Amount || product.Final_Amo || 0;
                summary[productName].timesSold += 1;
            });
        });

        return Object.values(summary);
    }, [filteredOrderData]);

    useEffect(() => {
        if (!isFilterRefreshing) return;

        const timer = setTimeout(() => {
            setIsFilterRefreshing(false);
        }, 280);

        return () => clearTimeout(timer);
    }, [isFilterRefreshing, filteredOrderData]);

    const handleProductSummaryPress = useCallback(() => {
        navigation.navigate("SalesReport", {
            logData: filteredOrderData,
            productSummary: filteredProductSummary,
            selectedDate: selectedFromDate,
            isNotAdmin: false,
        });
    }, [
        navigation,
        filteredOrderData,
        filteredProductSummary,
        selectedFromDate,
    ]);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
    }, []);

    // Format time from ISO string to readable format
    const formatTime = useCallback(dateString => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }, []);

    // Memoized FlatList item renderer
    const renderItem = useCallback(
        ({ item }) => {
            const isExpanded = expandedId === item.So_Id;
            const isEdited = item.Trans_Type === "UPDATE";
            const displayTime =
                isEdited
                    ? formatTime(item.Alterd_on)
                    : formatTime(item.Created_on);
            const isConverted =
                Array.isArray(item.ConvertedInvoice) &&
                item.ConvertedInvoice.length > 0;
            const isDelivered = Array.isArray(item.ConvertedInvoice) &&
                item.ConvertedInvoice.some(
                    inv =>
                        String(inv?.deliveryStatusGet || "")
                            .trim()
                            .toLowerCase() === "delivered",
                );

            return (
                <View
                    style={[
                        styles.itemContainer,
                        isExpanded && styles.expandedItem,
                        isConverted && styles.convertedItem,
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => toggleExpanded(item.So_Id)}
                        activeOpacity={0.9}
                    >
                        <View
                            style={[
                                styles.accordionHeader,
                                isExpanded && styles.headerExpanded,
                                isConverted
                                    ? styles.convertedHeader
                                    : styles.pendingHeader,
                                isDelivered && styles.deliveredHeader,
                            ]}
                        >
                            <View style={styles.headerLeft}>
                                <Text
                                    style={styles.retailerName}
                                    numberOfLines={1}
                                >
                                    {item.Retailer_Name}
                                </Text>
                                <View style={styles.orderDateRow}>
                                    <Text style={styles.orderDate}>
                                        {item.So_Date
                                            ? new Date(
                                                  item.So_Date,
                                              ).toLocaleDateString("en-GB")
                                            : "N/A"}
                                    </Text>
                                    {displayTime && (
                                        <View style={styles.createdTimeBadge}>
                                            <Icon
                                                name="clock-outline"
                                                size={10}
                                                color={customColors.white}
                                            />
                                            <Text
                                                style={styles.createdTimeText}
                                            >
                                                {displayTime}
                                                {isEdited ? " Edited" : ""}
                                            </Text>
                                        </View>
                                    )}
                                    <View
                                        style={styles.statusBadge}
                                    >
                                        <Text style={styles.statusBadgeText}>
                                            {isConverted && isDelivered
                                                && "Delivered"}
                                        </Text>
                                    </View>
                                </View>
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
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={styles.content}>
                            <View style={styles.orderInfo}>
                                <Text style={styles.orderNumber}>
                                    Order #{item.So_Id}
                                </Text>
                                <Text style={styles.createdBy}>
                                    by {item.Created_BY_Name}
                                </Text>
                            </View>

                            <View style={styles.productsContainer}>
                                {item.Products_List.map((product, index) => (
                                    <View
                                        key={index}
                                        style={styles.productItem}
                                    >
                                        <View style={styles.productInfo}>
                                            <Text
                                                style={styles.productName}
                                                numberOfLines={3}
                                            >
                                                {product.Product_Name}
                                            </Text>
                                            <Text style={styles.productDetails}>
                                                Qty:{" "}
                                                {product.Bill_Qty ||
                                                    product.Total_Qty}{" "}
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
                                    <Text style={styles.totalLabel}>
                                        Total Amount
                                    </Text>
                                    <Text style={styles.totalValue}>
                                        ₹{item.Total_Invoice_value}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            );
        },
        [expandedId, toggleExpanded, formatTime],
    );

    const keyExtractor = useCallback(item => item.So_Id.toString(), []);

    const getItemLayout = useCallback(
        (data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
        }),
        [],
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Sales Order Summary"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={handleOpenModal}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={modalFromDate}
                toDate={modalToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={handleApplyFilter}
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
                            }}
                        >
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
                                    onPress={() => handleBrandChange(brand)}
                                >
                                    <Text
                                        style={{
                                            color:
                                                selectedBrand === brand
                                                    ? customColors.white
                                                    : customColors.grey900,
                                            fontFamily:
                                                customFonts.poppinsRegular,

                                            fontWeight: "600",
                                            textTransform: "capitalize",
                                        }}
                                    >
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
                            }}
                        >
                            <MaterialIcon
                                name={showSearch ? "close" : "search"}
                                size={24}
                                color={customColors.grey900}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsContainer}>
                        <TouchableOpacity
                            style={styles.statusFilterButton}
                            onPress={() => setStatusFilterModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <MaterialIcon
                                name="tune"
                                size={14}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.timeFilterButton}
                            onPress={handleOpenTimeFilter}
                            activeOpacity={0.7}
                        >
                            <FeatherIcon
                                name="clock"
                                size={14}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={handleProductSummaryPress}
                            activeOpacity={0.7}
                        >
                            <FeatherIcon
                                name="arrow-up-right"
                                size={14}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    {selectedBrand === "All"
                                        ? "Total Sales"
                                        : `${selectedBrand} Sales`}
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalSales}
                                </Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    {selectedBrand === "All"
                                        ? "Total Amount"
                                        : `${selectedBrand} Amount`}
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalAmount
                                        ? `₹${filteredTotalAmount.toFixed(2)}`
                                        : "₹0.00"}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.activeFilterText}>
                            Status:{" "}
                            {conversionFilter === "all"
                                ? "All"
                                : conversionFilter === "converted"
                                  ? "Converted"
                                  : conversionFilter === "pending"
                                    ? "Pending"
                                    : conversionFilter === "delivered"
                                      ? "Delivered"
                                      : "Not Delivered"}
                        </Text>
                        {timeFilter.fromLabel && timeFilter.toLabel ? (
                            <Text style={styles.activeFilterText}>
                                Time: {timeFilter.fromLabel} -{" "}
                                {timeFilter.toLabel}
                            </Text>
                        ) : null}
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

                <FlashList
                    data={filteredOrderData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    style={styles.retailersScrollContainer}
                    contentContainerStyle={styles.retailersScrollContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    updateCellsBatchingPeriod={50}
                    ListFooterComponent={<View style={styles.bottomSpacer} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcon
                                name="inbox"
                                size={48}
                                color={customColors.grey300}
                            />
                            <Text style={styles.emptyText}>
                                No orders found
                            </Text>
                        </View>
                    }
                />

                <Modal
                    visible={statusFilterModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setStatusFilterModalVisible(false)}
                >
                    <Pressable
                        style={styles.statusModalBackdrop}
                        onPress={() => setStatusFilterModalVisible(false)}
                    >
                        <Pressable
                            style={styles.statusModalCard}
                            onPress={e => e.stopPropagation()}
                        >
                            <Text style={styles.statusModalTitle}>
                                Order Status Filter
                            </Text>

                            {[
                                { key: "all", label: "All" },
                                { key: "converted", label: "Converted" },
                                { key: "pending", label: "Pending" },
                                { key: "delivered", label: "Delivered" },
                                {
                                    key: "not_delivered",
                                    label: "Not Delivered",
                                },
                            ].map(option => {
                                const isActive =
                                    conversionFilter === option.key;

                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.statusOption,
                                            isActive &&
                                                styles.statusOptionActive,
                                        ]}
                                        onPress={() =>
                                            handleConversionFilterChange(
                                                option.key,
                                            )
                                        }
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.statusOptionText,
                                                isActive &&
                                                    styles.statusOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </Pressable>
                    </Pressable>
                </Modal>

                <Modal
                    visible={timeFilterModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setTimeFilterModalVisible(false)}
                >
                    <Pressable
                        style={styles.statusModalBackdrop}
                        onPress={() => setTimeFilterModalVisible(false)}
                    >
                        <Pressable
                            style={styles.statusModalCard}
                            onPress={e => e.stopPropagation()}
                        >
                            <Text style={styles.statusModalTitle}>
                                Created Time Filter
                            </Text>

                            <Text style={styles.timeInputLabel}>
                                From Time (12-hour)
                            </Text>
                            <View style={styles.timeInputRow}>
                                <TextInput
                                    style={styles.timeInput}
                                    placeholder="9.30"
                                    placeholderTextColor={customColors.grey400}
                                    value={timeFromInput}
                                    onChangeText={text =>
                                        setTimeFromInput(text.toUpperCase())
                                    }
                                    autoCapitalize="characters"
                                />
                                <View style={styles.periodSwitch}>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodBtn,
                                            timeFromPeriod === "AM" &&
                                                styles.periodBtnActive,
                                        ]}
                                        onPress={() => setTimeFromPeriod("AM")}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.periodBtnText,
                                                timeFromPeriod === "AM" &&
                                                    styles.periodBtnTextActive,
                                            ]}
                                        >
                                            AM
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodBtn,
                                            timeFromPeriod === "PM" &&
                                                styles.periodBtnActive,
                                        ]}
                                        onPress={() => setTimeFromPeriod("PM")}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.periodBtnText,
                                                timeFromPeriod === "PM" &&
                                                    styles.periodBtnTextActive,
                                            ]}
                                        >
                                            PM
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.timeInputLabel}>
                                To Time (12-hour)
                            </Text>
                            <View style={styles.timeInputRow}>
                                <TextInput
                                    style={styles.timeInput}
                                    placeholder="3.30"
                                    placeholderTextColor={customColors.grey400}
                                    value={timeToInput}
                                    onChangeText={text =>
                                        setTimeToInput(text.toUpperCase())
                                    }
                                    autoCapitalize="characters"
                                />
                                <View style={styles.periodSwitch}>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodBtn,
                                            timeToPeriod === "AM" &&
                                                styles.periodBtnActive,
                                        ]}
                                        onPress={() => setTimeToPeriod("AM")}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.periodBtnText,
                                                timeToPeriod === "AM" &&
                                                    styles.periodBtnTextActive,
                                            ]}
                                        >
                                            AM
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodBtn,
                                            timeToPeriod === "PM" &&
                                                styles.periodBtnActive,
                                        ]}
                                        onPress={() => setTimeToPeriod("PM")}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.periodBtnText,
                                                timeToPeriod === "PM" &&
                                                    styles.periodBtnTextActive,
                                            ]}
                                        >
                                            PM
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {timeFilterError ? (
                                <Text style={styles.timeErrorText}>
                                    {timeFilterError}
                                </Text>
                            ) : null}

                            <View style={styles.timeFilterActions}>
                                <TouchableOpacity
                                    style={[
                                        styles.timeActionBtn,
                                        styles.timeActionClear,
                                    ]}
                                    onPress={handleClearTimeFilter}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.timeActionClearText}>
                                        Clear
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.timeActionBtn,
                                        styles.timeActionApply,
                                    ]}
                                    onPress={handleApplyTimeFilter}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.timeActionApplyText}>
                                        Apply
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {isFilterRefreshing && (
                    <View style={styles.refreshOverlay} pointerEvents="none">
                        <View style={styles.refreshBadge}>
                            <ActivityIndicator
                                size="small"
                                color={customColors.primary}
                            />
                            <Text style={styles.refreshText}>
                                Refreshing...
                            </Text>
                        </View>
                    </View>
                )}
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
    statusFilterButton: {
        position: "absolute",
        top: spacing.sm,
        left: spacing.sm,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    timeFilterButton: {
        position: "absolute",
        top: spacing.sm,
        left: spacing.sm + 30,
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
    activeFilterText: {
        ...typography.caption(),
        color: customColors.grey500,
        textAlign: "center",
        marginTop: spacing.sm,
    },
    accordationScrollContainer: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        marginBottom: 2,
    },
    convertedHeader: {
        backgroundColor: "#af7d4c",
    },
    deliveredHeader: {
        backgroundColor: customColors.success,
    },
    pendingHeader: {
        backgroundColor: customColors.primary,
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
    orderDateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
    },
    createdTimeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        gap: 3,
    },
    createdTimeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "800",
        textTransform: "none",
        letterSpacing: 0.3,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadgeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "400",
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
        marginBottom: spacing.xs,
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
    // FlatList item styles
    itemContainer: {
        marginBottom: spacing.xs,
        backgroundColor: customColors.white,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: customColors.grey100,
    },
    convertedItem: {
        borderColor: customColors.success + "50",
    },
    expandedItem: {
        ...shadows.medium,
        borderColor: customColors.primary + "30",
    },
    headerExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        ...typography.body1(),
        color: customColors.grey400,
        marginTop: spacing.md,
    },
    statusModalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    statusModalCard: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.medium,
    },
    statusModalTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        marginBottom: spacing.md,
        textAlign: "center",
        fontWeight: "700",
    },
    statusOption: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey200,
        marginBottom: spacing.sm,
    },
    statusOptionActive: {
        backgroundColor: customColors.primaryFaded,
        borderColor: customColors.primary,
    },
    statusOptionText: {
        ...typography.body2(),
        color: customColors.grey800,
        textAlign: "center",
        fontWeight: "600",
    },
    statusOptionTextActive: {
        color: customColors.primary,
    },
    timeInputLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
        marginTop: spacing.xs,
        fontWeight: "600",
    },
    timeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        color: customColors.grey900,
        fontFamily: customFonts.poppinsRegular,
    },
    timeInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    periodSwitch: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        overflow: "hidden",
    },
    periodBtn: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: customColors.grey50,
    },
    periodBtnActive: {
        backgroundColor: customColors.primary,
    },
    periodBtnText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    periodBtnTextActive: {
        color: customColors.white,
    },
    timeErrorText: {
        ...typography.caption(),
        color: customColors.error,
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    timeFilterActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    timeActionBtn: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: spacing.sm,
        alignItems: "center",
    },
    timeActionClear: {
        backgroundColor: customColors.grey100,
    },
    timeActionApply: {
        backgroundColor: customColors.primary,
    },
    timeActionClearText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    timeActionApplyText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    refreshOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: spacing.sm,
    },
    refreshBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: customColors.white,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 999,
        ...shadows.small,
    },
    refreshText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
});

export default SalesAdmin;
