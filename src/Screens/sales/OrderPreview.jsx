import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Alert,
    TextInput,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import Accordion from "../../Components/Accordion";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";

const OrderPreview = () => {
    const navigation = useNavigation();

    const [logData, setLogData] = useState([]);
    const [retailerInfo, setRetailerInfo] = useState({});
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [modalVisible, setModalVisible] = useState(false);
    const [productSummary, setProductSummary] = useState([]);

    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                if (
                    selectedFromDate instanceof Date &&
                    selectedToDate instanceof Date
                ) {
                    const fromDate = selectedFromDate
                        .toISOString()
                        .split("T")[0];
                    const toDate = selectedToDate.toISOString().split("T")[0];

                    fetchSaleOrder(fromDate, toDate, Company_Id, userId);
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const handleFromDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        try {
            const salesPersonIdParam = userId || "";

            let url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${salesPersonIdParam}&Sales_Person_Id=${salesPersonIdParam}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                setLogData(data.data);
                calculateProductSummaryAndTotals(data.data);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs: ", error);
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

    function numberToWords(num) {
        const under20 = [
            "Zero",
            "One",
            "Two",
            "Three",
            "Four",
            "Five",
            "Six",
            "Seven",
            "Eight",
            "Nine",
            "Ten",
            "Eleven",
            "Twelve",
            "Thirteen",
            "Fourteen",
            "Fifteen",
            "Sixteen",
            "Seventeen",
            "Eighteen",
            "Nineteen",
        ];
        const tens = [
            "",
            "",
            "Twenty",
            "Thirty",
            "Forty",
            "Fifty",
            "Sixty",
            "Seventy",
            "Eighty",
            "Ninety",
        ];
        const thousand = ["Thousand", "Million", "Billion"];

        if (num < 20) return under20[num];
        if (num < 100)
            return (
                tens[Math.floor(num / 10)] +
                (num % 10 === 0 ? "" : " " + under20[num % 10])
            );
        if (num < 1000)
            return (
                under20[Math.floor(num / 100)] +
                " hundred" +
                (num % 100 === 0 ? "" : " " + numberToWords(num % 100))
            );

        for (let i = 0; i < thousand.length; i++) {
            let decimal = Math.pow(1000, i + 1);
            if (num < decimal) {
                return (
                    numberToWords(Math.floor(num / Math.pow(1000, i))) +
                    " " +
                    thousand[i - 1] +
                    (num % Math.pow(1000, i) === 0
                        ? ""
                        : " " + numberToWords(num % Math.pow(1000, i)))
                );
            }
        }
        return num;
    }

    const renderHeader = item => {
        return (
            <View style={styles.accordionHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.retailerName} numberOfLines={2}>
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
        const currentDate = new Date().toISOString().split("T")[0];
        const orderDate = new Date(item.So_Date).toISOString().split("T")[0];

        return (
            <View style={styles.content}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>Order #{item.So_Id}</Text>
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
                                    Qty: {product.Bill_Qty} • ₹
                                    {product.Item_Rate} each
                                </Text>
                            </View>
                            <Text style={styles.productAmount}>
                                ₹{product.Amount}
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

                    <View style={styles.actionButtons}>
                        {currentDate === orderDate && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.editButton]}
                                onPress={() => editOption(item)}>
                                <FeatherIcon
                                    name="edit-2"
                                    size={14}
                                    color={customColors.white}
                                />
                                <Text style={styles.buttonText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.shareButton]}
                            onPress={() => downloadItemPDF(item)}>
                            <FeatherIcon
                                name="share"
                                size={14}
                                color={customColors.white}
                            />
                            <Text style={styles.buttonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    useEffect(() => {
        if (logData && logData.length > 0 && logData[0].Retailer_Id) {
            fetchRetailerInfo(logData[0].Retailer_Id);
        }
    }, [logData]);

    const fetchRetailerInfo = async retailerId => {
        try {
            const response = await fetch(`${API.retailerInfo()}${retailerId}`);
            const data = await response.json();
            if (data.success) {
                setRetailerInfo(data.data[0]);
            }
        } catch (error) {
            console.error("Error fetching retailer data: ", error);
        }
    };

    const generateItemPDF = async item => {
        if (!retailerInfo || retailerInfo.Retailer_Id !== item.Retailer_Id) {
            await fetchRetailerInfo(item.Retailer_Id);
        }

        if (!retailerInfo) {
            console.error("Failed to fetch retailer information");
            return null;
        }

        // console.log(retailerInfo.Retailer_Name);
        const totalAmountWords = numberToWords(item.Total_Invoice_value);

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Sales Order</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Roboto', sans-serif;
                    }

                    .header-text {
                        font-size: 1.5rem;
                        font-weight: bold;
                    }

                    .address,
                    .bank-details {
                        font-size: 0.9rem;
                        font-family: 'Open Sans', sans-serif;
                    }

                    .details-text {
                        font-size: 1rem;
                        font-family: 'Roboto', sans-serif;
                    }

                    .table th,
                    .table td {
                        vertical-align: middle;
                    }

                    .total-text {
                        font-size: 1.1rem;
                        font-weight: bold;
                        font-family: 'Open Sans', sans-serif;
                    }

                    .py-3 {
                        padding-top: 1rem !important;
                        padding-bottom: 1rem !important;
                    }

                    .py-md-5 {
                        padding-top: 3rem !important;
                        padding-bottom: 3rem !important;
                    }

                    .logo-title-container {
                        text-align: center;
                    }

                    .logo-title-container img {
                        margin-bottom: 2.5px;
                    }

                    .logo-title-container h5 {
                        margin-top: 10px;
                        font-family: 'Open Sans', sans-serif;
                    }

                    .border-black {
                        border-color: black !important;
                    }

                    .order-details {
                        font-family: 'Roboto', sans-serif;
                    }
                </style>
            </head>
            <body>
                <section class="py-3 py-md-5">
                    <div class="container">
                        <div class="row justify-content-center">
                            <div class="col-12 col-lg-9 col-xl-8 col-xxl-7">
                                <div class="row mb-3">
                                    <div class="col">
                                        <h4>From</h4>
                                        <address class="address">
                                            <strong>${item.Branch_Name}</strong><br />
                                            153, Chitrakara Street, Valaiyal Kadai,<br />
                                            Madurai, Tamil Nadu 625001.<br />
                                            GSTIN: 33CDHPK1650E1ZZ<br />
                                            Phone: (809) 822-2822<br />
                                        </address>
                                    </div>
                                    <div class="col logo-title-container">
                                        <a href="#!" class="d-block mt-3">
                                            <img src="https://www.shrifoodsindia.com/static/logo-dad49c8392a067bd3834c9a55194fe25.png" class="img-fluid" alt="Logo" width="125" height="40" />
                                        </a>
                                        <h5 class="mb-0">Sale Order</h5>
                                    </div>
                                    <div class="col">
                                        <h4>Bill To</h4>
                                        <address class="address">
                                            <strong>${retailerInfo.Retailer_Name}</strong><br />
                                            ${retailerInfo.Reatailer_Address} <br />
                                            ${retailerInfo.AreaGet} <br />
                                            ${retailerInfo.StateGet} - ${retailerInfo.PinCode}<br />
                                            GSTIN: ${retailerInfo.Gstno}<br />
                                            Phone: ${retailerInfo.Mobile_No}<br />
                                        </address>
                                    </div>
                                </div>
                                <div class="mb-3 order-details">
                                    <div class="row">
                                        <h4>Order #Id</h4>
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <span>Date:</span>
                                                <span>${new Date(item.So_Date).toLocaleDateString()}</span>
                                            </div>
                                            <div>
                                                <span>Order Taken:</span>
                                                <span>${item.Created_BY_Name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <div class="table-responsive">
                                            <table class="table table-bordered">
                                                <thead>
                                                    <tr class="table-primary">
                                                        <th scope="col">Sno</th>
                                                        <th scope="col">Product</th>
                                                        <th scope="col">Quantity</th>
                                                        <th scope="col">Price</th>
                                                        <th scope="col">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="table-group-divider">
                                                    ${item.Products_List.map(
                                                        (product, index) => `
                                                        <tr>
                                                            <td>${index + 1}</td>
                                                            <td>${product.Product_Name}</td>
                                                            <td>${product.Bill_Qty}</td>
                                                            <td>${product.Item_Rate}</td>
                                                            <td>₹ ${product.Amount}</td>
                                                        </tr>
                                                    `,
                                                    ).join("")}
                                                    <tr>
                                                        <th scope="row" colspan="4" class="text-uppercase text-end">Total</th>
                                                        <td class="text-end">₹ ${item.Total_Invoice_value}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row" colspan="5" class="text-start">Total Amount in Words</th>
                                                    </tr>
                                                    <tr>
                                                        <td colspan="5" class="text-start">${totalAmountWords}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <p class="text-muted mt-5">
                                    This is an automatically generated bill. Please verify all details before making any payments.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </body>
            </html>
        `;

        const options = {
            html: htmlContent,
            fileName: "order",
            directory: "Documents",
        };

        const pdf = await RNHTMLtoPDF.convert(options);
        return pdf.filePath;
    };

    const downloadItemPDF = async item => {
        try {
            const pdfPath = await generateItemPDF(item);
            if (pdfPath) {
                await Share.open({
                    url: `file://${pdfPath}`,
                    title: "sale_order",
                    message: "Here is your order preview in PDF format",
                });
            } else {
                Alert.alert(
                    "Error",
                    "Failed to generate PDF. Please try again.",
                );
            }
        } catch (error) {
            console.log("Error generating or sharing PDF: ", error);
            // Alert.alert("Error", "An error occurred while generating or sharing the PDF.");
        }
    };

    const editOption = item => {
        navigation.navigate("EditOrder", {
            item: {
                ...item,
                Retailer_Id: item.Retailer_Id,
                Retailer_Name: item.Retailer_Name,
                So_Id: item.So_Id,
            },
            isEdit: true,
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

    const handleSalesReportPress = () => {
        navigation.navigate("SalesReport", {
            logData,
            productSummary,
            selectedDate: selectedFromDate,
            isNotAdmin: true,
        });
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Order Summary"
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
                title="Select Date Range"
                fromLabel="From Date"
                toLabel="To Date"
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

                    <View style={styles.statsContainer}>
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={handleSalesReportPress}
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
                                    {filteredTotalSales || "0"}
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
                </View>

                <ScrollView style={styles.accordationScrollContainer}>
                    <Accordion
                        data={filteredOrderData}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                    />
                </ScrollView>
            </View>
        </View>
    );
};

export default OrderPreview;

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
    datePickerContainer: {
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
        gap: spacing.sm,
        ...shadows.small,
    },
    filterButtonText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
        textAlign: "center",
    },
    countContainer: {
        marginHorizontal: spacing.sm,
        marginVertical: spacing.xs,
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
        marginTop: spacing.xs,
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
        ...typography.body2(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
        textAlign: "center",
    },
    statValue: {
        ...typography.h3(),
        fontWeight: "600",
        textAlign: "center",
        color: customColors.grey900,
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
        marginBottom: spacing.sm,
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
    actionButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderRadius: 6,
        gap: 4,
    },
    editButton: {
        backgroundColor: customColors.grey700,
    },
    shareButton: {
        backgroundColor: customColors.primary,
    },
    buttonText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "500",
    },
});
