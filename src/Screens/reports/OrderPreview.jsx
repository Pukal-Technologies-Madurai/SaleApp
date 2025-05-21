import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Alert,
    Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import Accordion from "../../Components/Accordion";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import SalesReportModal from "../../Components/SalesReportModal";
const OrderPreview = () => {
    const navigation = useNavigation();

    const [logData, setLogData] = useState([]);
    const [companyId, setCompanyId] = useState([]);
    const [retailerInfo, setRetailerInfo] = useState({});

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [modalVisible, setModalVisible] = useState(false);
    const [productSummary, setProductSummary] = useState([]);
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [totalProductsSold, setTotalProductsSold] = useState(0);

    const [visitLogLength, setVisitLogLength] = useState(0);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];

                setCompanyId(Number(Company_Id));
                fetchSaleOrder(fromDate, toDate, Company_Id, userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    useEffect(() => {
        if (modalVisible && selectedFromDate) {
            fetchVisitLog();
        }
    }, [modalVisible, selectedFromDate]);

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

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        try {
            const salesPersonIdParam = userId || "";

            let url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${salesPersonIdParam}&Sales_Person_Id=${salesPersonIdParam}`;
            // console.log(url);
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
        setTotalOrderAmount(totalAmount);
        setTotalProductsSold(productCount);
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
                <Text style={styles.retailerName} numberOfLines={2}>
                    {item.Retailer_Name}
                </Text>
                <View style={styles.headerRight}>
                    <Text style={styles.orderAmount}>
                        ₹{item.Total_Invoice_value}
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
                <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceTitle}>Order #{item.So_Id}</Text>
                    <Text style={styles.invoiceDate}>
                        {new Date(item.So_Date).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.invoiceBody}>
                    <View style={styles.invoiceProducts}>
                        <View style={styles.productRowHeader}>
                            <Text
                                style={[
                                    styles.invoiceCell,
                                    styles.productNameCell,
                                ]}>
                                Product
                            </Text>
                            <Text style={styles.invoiceCell}>Qty</Text>
                            <Text style={styles.invoiceCell}>Amount</Text>
                        </View>
                        {item.Products_List.map((product, index) => (
                            <View key={index} style={styles.productRow}>
                                <Text
                                    style={[
                                        styles.invoiceCell,
                                        styles.productNameCell,
                                    ]}
                                    numberOfLines={2}
                                    ellipsizeMode="tail">
                                    {product.Product_Name}
                                </Text>
                                <Text style={styles.invoiceCell}>
                                    {product.Bill_Qty}
                                </Text>
                                <Text style={styles.invoiceCell}>
                                    ₹{product.Amount}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                            ₹{item.Total_Invoice_value}
                        </Text>
                    </View>
                    <View style={styles.buttonContainer}>
                        {currentDate === orderDate && (
                            <TouchableOpacity
                                style={[styles.button, styles.editButton]}
                                onPress={() => editOption(item)}>
                                <Text style={styles.buttonText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.button, styles.shareButton]}
                            onPress={() => downloadItemPDF(item)}>
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

        console.log(retailerInfo.Retailer_Name);
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
        // console.log(item.Retailer_Id, item.So_Id, item.Retailer_Name);
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

    const fetchVisitLog = async () => {
        try {
            const storeUserTypeId = await AsyncStorage.getItem("userTypeId");
            const userId = await AsyncStorage.getItem("UserId");
            const formattedDate = new Date(selectedFromDate)
                .toISOString()
                .split("T")[0];

            const isAdminUser = ["0", "1", "2"].includes(storeUserTypeId);
            const userIdParam = isAdminUser ? "" : userId;

            const url = `${API.visitedLog()}?reqDate=${formattedDate}&UserId=${userIdParam}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            if (data.success) {
                setVisitLogLength(data.data?.length || 0);
            } else {
                console.log("Failed to fetch logs:", data.message);
                setVisitLogLength(0);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setVisitLogLength(0);
        }
    };

    const totalVisitLogCount = visitLogLength + logData.length;
    const totalQuantity = productSummary.reduce(
        (sum, item) => sum + item.totalQty,
        0,
    );
    const totalAmount = productSummary.reduce(
        (sum, item) => sum + parseFloat(item.totalAmount),
        0,
    );

    const fromDate = new Date(selectedFromDate)
        .toLocaleDateString()
        .split("T")[0];
    const fromTime = new Date(selectedFromDate).toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    });

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
                rightIconLibrary="FeatherIcon"
                rightIconName="arrow-up-right"
                onRightPress={handleSalesReportPress}
            />

            <View style={styles.contentContainer}>
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
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{
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
                                    {logData ? logData.length : "0"}
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
                                    {totalOrderAmount
                                        ? `₹${totalOrderAmount.toFixed(2)}`
                                        : "₹0.00"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.accordationScrollContainer}>
                    <Accordion
                        data={logData.filter(order =>
                            selectedBrand === "All"
                                ? true
                                : order.Products_List.some(
                                      p => p.BrandGet?.trim() === selectedBrand,
                                  ),
                        )}
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
        flexDirection: "row",
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    countContainer: {
        marginHorizontal: spacing.sm,
        marginVertical: spacing.xs,
    },
    statsContainer: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.md,
        ...shadows.medium,
    },
    statItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.xs,
    },
    iconContainer: {
        width: 48,
        height: 48,
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
        ...typography.body1(),
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
        paddingHorizontal: spacing.xs,
        backgroundColor: customColors.primary,
        borderRadius: 8,
        marginBottom: spacing.xs,
        // ...shadows.small,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.white,
        flex: 1,
        marginRight: spacing.sm,
    },
    headerRight: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
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
        backgroundColor: customColors.primaryLight,
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
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    button: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 6,
        minWidth: 80,
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
        textAlign: "center",
    },
});
