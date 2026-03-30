import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Alert,
} from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import Accordion from "../../Components/Accordion";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { API } from "../../Config/Endpoint";
import { fetchSaleInvoices } from "../../Api/sales";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";

const SaleInvoiceList = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { isAdmin = false, selectedDate: passedDate, selectedBranch } = route.params || {};

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    // Modal dates - only applied when user taps Apply
    const [modalFromDate, setModalFromDate] = useState(new Date());
    const [modalToDate, setModalToDate] = useState(new Date());
    const [uID, setUID] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const [companyId, setCompanyId] = useState(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);

    // Sales person filter state (for admin users)
    const [salesPersonData, setSalesPersonData] = useState([]);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState({
        label: "All",
        value: "all",
    });

    // Payment filter state: 'all' | 'paid' | 'unpaid'
    const [paymentFilter, setPaymentFilter] = useState('all');

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const branchId = await AsyncStorage.getItem("branchId");
                const companyId = await AsyncStorage.getItem("Company_Id");

                let parsedBranchId = branchId;

                if (typeof branchId === "string") {
                    parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ""));
                } else {
                    parsedBranchId = parseInt(branchId);
                }

                // If admin user, set uID to empty string to fetch all invoices
                setUID(isAdmin ? "" : userId);
                setBranchId(parsedBranchId);
                setCompanyId(companyId);

                // Set initial dates
                if (passedDate) {
                    const initialDate = new Date(passedDate);
                    setSelectedFromDate(initialDate);
                    setSelectedToDate(initialDate);
                    setModalFromDate(initialDate);
                    setModalToDate(initialDate);
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, [isAdmin, passedDate]);

    const handleSalesPersonChange = item => {
        setSelectedSalesPerson(item);
    };

    const {
        data: saleInvoiceData = [],
        isLoading,
        isFetching,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ["saleInvoices", selectedFromDate, selectedToDate, uID, selectedBranch],
        queryFn: async () =>
            fetchSaleInvoices({
                from: selectedFromDate.toISOString().split("T")[0],
                to: selectedToDate.toISOString().split("T")[0],
                userId: uID,
                branchId: selectedBranch,
            }),
        // Allow empty string for admin users (uID !== null means it's been set)
        enabled: uID !== null,
    });

    // Extract sales person dropdown data from invoice data (for admin users)
    // Use Sales_Person_Name when Created_BY_Name is "admin"
    // If Sales_Person_Name and Delivery_Person_Name are "unknown", use Created_BY_Name with "- Live" suffix
    useEffect(() => {
        if (isAdmin && saleInvoiceData.length > 0) {
            const salesPersonMap = new Map();
            saleInvoiceData.forEach(invoice => {
                const isCreatedByAdmin = invoice.Created_BY_Name?.toLowerCase() === "admin";
                const isSalesPersonUnknown = invoice.Sales_Person_Name === "unknown" || !invoice.Sales_Person_Name;
                const isDeliveryPersonUnknown = invoice.Delivery_Person_Name === "unknown" || !invoice.Delivery_Person_Name;
                
                let displayName;
                let key;
                
                // If both Sales_Person_Name and Delivery_Person_Name are "unknown", use Created_BY_Name
                if (isSalesPersonUnknown && isDeliveryPersonUnknown) {
                    displayName = `${invoice.Created_BY_Name} - Live`;
                    key = invoice.Created_by;
                } else if (isCreatedByAdmin) {
                    // Use Sales_Person_Name if Created_BY_Name is "admin"
                    displayName = invoice.Sales_Person_Name || invoice.Created_BY_Name;
                    key = invoice.Sales_Person_Name;
                } else {
                    // Otherwise use Created_BY_Name with (Live) suffix
                    displayName = `${invoice.Created_BY_Name} - Live`;
                    key = invoice.Created_by;
                }
                    
                if (key && displayName) {
                    salesPersonMap.set(key, displayName);
                }
            });

            const dropdownData = [
                { label: "All", value: "all" },
                ...Array.from(salesPersonMap.entries()).map(
                    ([value, label]) => ({
                        label,
                        value,
                    }),
                ),
            ];
            // Only update if data actually changed
            setSalesPersonData(prev => {
                const prevStr = JSON.stringify(prev);
                const newStr = JSON.stringify(dropdownData);
                return prevStr !== newStr ? dropdownData : prev;
            });
        }
    }, [isAdmin, saleInvoiceData.length]);

    // Get data filtered by sales person (for brand list and report)
    // Filter by Sales_Person_Name when Created_BY_Name is "admin"
    // If Sales_Person_Name and Delivery_Person_Name are "unknown", match against Created_by
    // Also exclude admin credit bill invoices (Created_BY_Name === "admin" AND VoucherTypeGet === "ONLINE_Credit Bill")
    const salesPersonFilteredData = useMemo(() => {
        // First, filter out admin credit bill invoices
        const filteredData = saleInvoiceData.filter(invoice => {
            const isAdminCreditBill = 
                invoice.Created_BY_Name?.toLowerCase() === "admin" && 
                invoice.VoucherTypeGet === "ONLINE_Credit Bill";
            return !isAdminCreditBill;
        });

        if (!isAdmin || selectedSalesPerson?.value === "all") {
            return filteredData;
        }
        return filteredData.filter(invoice => {
            const isSalesPersonUnknown = invoice.Sales_Person_Name === "unknown" || !invoice.Sales_Person_Name;
            const isDeliveryPersonUnknown = invoice.Delivery_Person_Name === "unknown" || !invoice.Delivery_Person_Name;
            
            // If both are "unknown", match against Created_by
            if (isSalesPersonUnknown && isDeliveryPersonUnknown) {
                return invoice.Created_by === selectedSalesPerson?.value;
            }
            // If Created_BY_Name is "admin", match against Sales_Person_Name
            if (invoice.Created_BY_Name?.toLowerCase() === "admin") {
                return invoice.Sales_Person_Name === selectedSalesPerson?.value;
            }
            // Otherwise match against Created_by
            return invoice.Created_by === selectedSalesPerson?.value;
        });
    }, [saleInvoiceData, isAdmin, selectedSalesPerson?.value]);

    // Extract brand list from sales person filtered data
    // Use stable dependencies to prevent infinite loop
    useEffect(() => {
        const currentData = salesPersonFilteredData;
        if (currentData.length > 0) {
            const brands = new Set();
            currentData.forEach(invoice => {
                invoice.Products_List?.forEach(p => {
                    if (p.BrandGet) {
                        brands.add(p.BrandGet.trim());
                    }
                });
            });
            const newBrandList = ["All", ...Array.from(brands)];
            setBrandList(prev => {
                const prevStr = JSON.stringify(prev);
                const newStr = JSON.stringify(newBrandList);
                return prevStr !== newStr ? newBrandList : prev;
            });
        } else {
            setBrandList(prev => prev.length === 1 && prev[0] === "All" ? prev : ["All"]);
        }
        // Reset brand selection when data changes
        setSelectedBrand("All");
    }, [saleInvoiceData, isAdmin, selectedSalesPerson?.value]);

    // Filter data by brand
    const getFilteredDataByBrand = () => {
        // Use already sales person filtered data
        let data = salesPersonFilteredData;

        if (selectedBrand === "All") {
            return data;
        }

        return data
            .map(invoice => {
                const filteredProducts = invoice.Products_List?.filter(
                    product => product.BrandGet?.trim() === selectedBrand,
                );

                if (filteredProducts && filteredProducts.length > 0) {
                    const brandTotal = filteredProducts.reduce(
                        (sum, product) =>
                            sum + (product.Amount || product.Final_Amo || 0),
                        0,
                    );

                    return {
                        ...invoice,
                        Products_List: filteredProducts,
                        Total_Invoice_value: brandTotal,
                        Original_Total: invoice.Total_Invoice_value,
                    };
                }
                return null;
            })
            .filter(invoice => invoice !== null);
    };

    const filteredByBrand = getFilteredDataByBrand();

    // Filter by payment status
    const filteredByPayment = useMemo(() => {
        if (paymentFilter === 'all') return filteredByBrand;
        if (paymentFilter === 'paid') {
            return filteredByBrand.filter(
                item => item.Payment_Status === 2 || item.Payment_Status === 3
            );
        }
        // unpaid
        return filteredByBrand.filter(
            item => item.Payment_Status !== 2 && item.Payment_Status !== 3
        );
    }, [filteredByBrand, paymentFilter]);

    const filteredInvoiceData = useMemo(() => {
        if (!searchQuery.trim()) return filteredByPayment;
        const query = searchQuery.toLowerCase();
        return filteredByPayment.filter(
            item =>
                item.Retailer_Name?.toLowerCase().includes(query) ||
                item.Do_Inv_No?.toLowerCase().includes(query),
        );
    }, [filteredByPayment, searchQuery]);

    const totalInvoices = filteredInvoiceData.length;
    const totalAmount = useMemo(() => {
        return filteredInvoiceData.reduce(
            (sum, item) => sum + (parseFloat(item.Total_Invoice_value) || 0),
            0,
        );
    }, [filteredInvoiceData]);

    // Calculate delivery and payment status counts
    const statusCounts = useMemo(() => {
        const deliveryCompleted = filteredInvoiceData.filter(
            item => item.Delivery_Status === 3 || item.Delivery_Status === 7,
        ).length;
        const paymentCompleted = filteredInvoiceData.filter(
            item => item.Payment_Status === 2 || item.Payment_Status === 3,
        ).length;
        const cancelReturn = filteredInvoiceData.filter(
            item => item.Cancel_status === 0 || item.Cancel_status === "0"
        ).length;

        return {
            deliveryCompleted,
            deliveryPending: filteredInvoiceData.length - deliveryCompleted,
            paymentCompleted,
            paymentPending: filteredInvoiceData.length - paymentCompleted,
            cancelReturn,
            cancelReturnPending: filteredInvoiceData.length - cancelReturn,
        };
    }, [filteredInvoiceData]);

    // Number to words helper
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

    // Generate PDF for invoice
    const generateItemPDF = async item => {
        try {
            const response = await fetch(
                `${API.retailerInfo()}${item.Retailer_Id}`,
            );
            const data = await response.json();

            let currentRetailerInfo = null;
            if (data.success && data.data && data.data.length > 0) {
                currentRetailerInfo = data.data[0];
            }

            const safeNum = (v, d = 0) =>
                Number.isFinite(Number(v)) ? Number(v) : d;
            const rupee = n =>
                safeNum(n).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            const dt = iso =>
                iso
                    ? new Date(iso).toLocaleString("en-IN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                      })
                    : "—";

            const products = Array.isArray(item?.Products_List)
                ? item.Products_List
                : [];
            const totalQty = products.reduce(
                (s, p) => s + safeNum(p?.Total_Qty ?? p?.Bill_Qty, 0),
                0,
            );
            const subtotal = safeNum(item?.Total_Before_Tax, 0);
            const roundOff = safeNum(item?.Round_off, 0);
            const net = safeNum(item?.Total_Invoice_value, 0);
            const summarizeBranch =
                item?.Branch_Name === "OFFICE"
                    ? "PUKAL FOODS"
                    : item?.Branch_Name || "SM TRADERS";
            const totalAmountWords =
                typeof numberToWords === "function"
                    ? numberToWords(Math.floor(net))
                    : "";

            const numberOfBags = products.reduce((sum, p) => {
                const packWeight =
                    parseFloat(
                        p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1],
                    ) || 0;
                const totalKg = parseFloat(p.Bill_Qty) || 0;
                const bags = packWeight > 0 ? totalKg / packWeight : 0;
                return sum + bags;
            }, 0);

            const totalWeight = products.reduce((sum, p) => {
                return sum + (parseFloat(p.Bill_Qty) || 0);
            }, 0);

            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=80mm, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <title>Invoice - ${item?.Do_Inv_No || item?.Do_Id}</title>
                    <style>
                    @page { size: 80mm auto; margin: 0mm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body {
                        width: 80mm; margin: 0; padding: 0;
                        font-family: "Courier New", Courier, monospace;
                        font-size: 10px; line-height: 1.2; color: #000;
                    }
                    body { padding: 2mm; }
                    .center { text-align: center; }
                    .bold { font-weight: 700; }
                    .mt-1 { margin-top: 1mm; }
                    .mt-2 { margin-top: 2mm; }
                    .row, .kv { display: flex; justify-content: space-between; gap: 2mm; }
                    .hr { border-top: 1px dashed #000; height: 0; margin: 2mm 0; }
                    .tiny { font-size: 8px; line-height: 1.3; }
                    .small { font-size: 9px; }
                    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 1mm 0; }
                    th, td { padding: 1mm 0; text-align: left; vertical-align: top; font-size: 9px; word-wrap: break-word; }
                    th { border-bottom: 1px solid #000; font-weight: 700; }
                    th:first-child, td:first-child { width: 38mm; padding-right: 2mm; }
                    th.qty, td.qty { text-align: center; width: 10mm; }
                    th.rate, td.rate { text-align: right; width: 14mm; }
                    th.amt, td.amt { text-align: right; width: 18mm; }
                    .totals td { padding-top: 2mm; border-top: 1px solid #000; }
                    .net { font-size: 11px; font-weight: 700; }
                    .footer { text-align: center; margin-top: 4mm; font-size: 8px; line-height: 1.4; }
                    .header-title { font-size: 14px; font-weight: 700; margin-bottom: 1mm; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <div class="header-title">${summarizeBranch}</div>
                        ${
                            currentRetailerInfo?.Branch_Address_1 ||
                            currentRetailerInfo?.Branch_Address_2 ||
                            currentRetailerInfo?.City
                                ? `
                        <div class="tiny mt-1">
                            ${[currentRetailerInfo?.Branch_Address_1, currentRetailerInfo?.Branch_Address_2, currentRetailerInfo?.City, currentRetailerInfo?.Pincode].filter(Boolean).join(", ")}
                        </div>`
                                : ""
                        } 
                        ${currentRetailerInfo?.GST_No ? `<div class="tiny">GSTIN: <span class="bold">${currentRetailerInfo.GST_No}</span></div>` : ""}
                    </div>

                    <div class="hr"></div>

                    <div style="background: #f8f9fa; padding: 2mm; border-radius: 2mm; margin: 2mm 0;">
                        <div class="kv small" style="margin-bottom: 1mm">
                            <div>Invoice No: <span class="bold">${item?.Do_Inv_No || item?.Do_Id || "—"}</span></div>
                            <div>Date: <span class="bold">${dt(item?.Do_Date).split(",")[0]}</span></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 8px; margin-top: 1mm;">
                            <div style="text-align: center">
                                <div style="color: #666">Voucher</div>
                                <div class="bold">${item?.VoucherTypeGet || "—"}</div>
                            </div>
                            <div style="text-align: center">
                                <div style="color: #666">Created By</div>
                                <div class="bold">${((item?.Created_BY_Name?.toLowerCase() === "admin" ? item?.Sales_Person_Name : item?.Created_BY_Name) || "—").substring(0, 10)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="hr"></div>

                    <div class="bold small">Customer:</div>
                    <div class="small">${item?.Retailer_Name || currentRetailerInfo?.Retailer_Name || "—"}</div>
                    ${currentRetailerInfo?.Reatailer_Address ? `<div class="tiny mt-1">${currentRetailerInfo.Reatailer_Address}</div>` : ""} 
                    ${currentRetailerInfo?.Mobile_No ? `<div class="tiny mt-1">${currentRetailerInfo.Mobile_No}</div>` : ""} 
                    ${currentRetailerInfo?.GST_No ? `<div class="tiny">GSTIN: ${currentRetailerInfo.GST_No}</div>` : ""}

                    <div class="hr"></div>

                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th class="qty">Qty</th>
                                <th class="rate">Rate</th>
                                <th class="amt">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products
                                .map(
                                    p => `
                            <tr>
                                <td>${p?.Product_Name || ""}</td>
                                <td class="qty">${safeNum(p?.Bill_Qty ?? p?.Total_Qty, 0)}</td>
                                <td class="rate">${rupee(p?.Item_Rate ?? 0)}</td>
                                <td class="amt">₹${rupee(p?.Amount ?? p?.Final_Amo ?? 0)}</td>
                            </tr>`,
                                )
                                .join("")}

                            <tr class="totals">
                                <td colspan="3" class="bold" style="text-align: right">Subtotal</td>
                                <td class="amt bold">₹${rupee(subtotal)}</td>
                            </tr>

                            ${
                                roundOff
                                    ? `
                            <tr>
                                <td colspan="3" style="text-align: right">Round Off</td>
                                <td class="amt">₹${rupee(roundOff)}</td>
                            </tr>`
                                    : ""
                            }

                            <tr>
                                <td colspan="3" class="net" style="text-align: right">Net Amount</td>
                                <td class="amt net">₹${rupee(net)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="hr"></div>

                    <div class="kv small">
                        <div>Total Items: <span class="bold">${products.length}</span></div>
                        <div>Total Qty: <span class="bold">${totalQty}</span></div>
                    </div>

                    <div class="mt-2 tiny">Amount in words:</div>
                    <div class="tiny bold">${totalAmountWords || ""} Rupees Only</div>

                    <div class="hr"></div>

                    <div class="footer">
                        <div>Thank you for your business!</div>
                        <div class="mt-1">For Customer Care: <span class="bold">+91 90253 16142</span></div>
                        <div class="mt-2">This is a computer generated invoice.</div>
                    </div>
                </body>
                </html>
            `;

            const estimatedHeight = 400 + products.length * 30;

            const options = {
                html: htmlContent,
                fileName: `invoice-${(item?.Retailer_Name || item?.Do_Inv_No || Date.now()).toString().replace(/[^\w-]+/g, "_")}`,
                directory: "Documents",
                width: 226,
                height: estimatedHeight,
                padding: 0,
                base64: false,
            };

            const pdf = await RNHTMLtoPDF.convert(options);
            return pdf.filePath;
        } catch (err) {
            console.error("Error generating PDF:", err);
            return null;
        }
    };

    const downloadItemPDF = async item => {
        try {
            const pdfPath = await generateItemPDF(item);
            if (pdfPath) {
                try {
                    await Share.open({
                        url: `file://${pdfPath}`,
                        title: "Sale Invoice",
                        message: "Here is your invoice in PDF format",
                        showAppsToView: true,
                        subject: "Sale Invoice Receipt",
                        filename: `invoice-${item?.Do_Inv_No || item?.Do_Id || Date.now()}.pdf`,
                    });
                } catch (shareError) {
                    if (
                        shareError.message &&
                        shareError.message.includes("User did not share")
                    ) {
                        return;
                    }
                    throw shareError;
                }
            } else {
                Alert.alert(
                    "Error",
                    "Failed to generate PDF. Please try again.",
                );
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    const getDeliveryStatusInfo = status => {
        const statusMap = {
            0: { label: "Cancelled", color: customColors.warning },
            1: { label: "New", color: customColors.info },
            5: { label: "Pending", color: customColors.primaryLight },
            6: { label: "Returned", color: customColors.success },
            7: { label: "Delivered", color: customColors.success },
        };
        return (
            statusMap[status] || {
                label: "Admin User",
                color: customColors.grey500,
            }
        );
    };

    const getPaymentStatusInfo = status => {
        const statusMap = {
            1: { label: "Pending", color: customColors.warning },
            3: { label: "Completed", color: customColors.success },
        };
        return (
            statusMap[status] || {
                label: "Admin User",
                color: customColors.grey500,
            }
        );
    };

    const getPaymentModeLabel = mode => {
        const modeMap = {
            1: "Cash",
            2: "G-Pay",
            3: "Credit",
        };
        return modeMap[mode] || "N/A";
    };

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > modalToDate ? modalToDate : date;
            setModalFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < modalFromDate ? modalFromDate : date;
            setModalToDate(newToDate);
        }
    };

    const handleOpenModal = () => {
        // Initialize modal dates from current selected dates
        setModalFromDate(selectedFromDate);
        setModalToDate(selectedToDate);
        setModalVisible(true);
    };

    const handleApplyFilter = () => {
        // Apply modal dates to selected dates (triggers API fetch)
        setSelectedFromDate(modalFromDate);
        setSelectedToDate(modalToDate);
        setModalVisible(false);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const handleSalesReportPress = () => {
        navigation.navigate("SalesReport", {
            logData: salesPersonFilteredData,
            selectedDate: selectedFromDate,
            isNotAdmin: true,
        });
    };

    const renderHeader = item => {
        const deliveryStatus = getDeliveryStatusInfo(item.Delivery_Status);
        const paymentStatus = getPaymentStatusInfo(item.Payment_Status);
        const isCancelled =
            item.Cancel_status === "0" || item.Cancel_status === 0;
        const isDelivered = deliveryStatus.label === "Delivered";

        return (
            <View style={styles.accordionHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.retailerName} numberOfLines={2}>
                        {item.Retailer_Name}
                    </Text>
                    <Text style={styles.invoiceDate}>
                        {item.Do_Date
                            ? new Date(item.Do_Date).toLocaleDateString(
                                  "en-GB",
                              ) +
                              (isCancelled
                                  ? " - (Cancelled)"
                                  : isDelivered
                                    ? " - (Delivered)"
                                    : "")
                            : "N/A"}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.invoiceAmount}>
                        ₹{parseFloat(item.Total_Invoice_value).toFixed(2)}
                    </Text>
                    <Text style={styles.itemCount}>
                        {item.Products_List?.length || 0} items
                    </Text>
                </View>
            </View>
        );
    };

    const renderContent = item => {
        const deliveryStatus = getDeliveryStatusInfo(item.Delivery_Status);
        const paymentStatus = getPaymentStatusInfo(item.Payment_Status);
        const paymentModeLabel = getPaymentModeLabel(item.Payment_Mode);

        return (
            <View style={styles.content}>
                <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceNumber}>{item.Do_Inv_No}</Text>
                    <View style={styles.statusBadges}>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: paymentStatus.color + "20",
                                },
                            ]}
                        >
                            <MaterialIcon
                                name={
                                    item.Payment_Status === 1
                                        ? "pending-actions"
                                        : "check-circle"
                                }
                                size={14}
                                color={paymentStatus.color}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: paymentStatus.color },
                                ]}
                            >
                                {paymentStatus.label}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: paymentStatus.color + "20" },
                            ]}
                        >
                            <MaterialIcon
                                name="payment"
                                size={14}
                                color={paymentStatus.color}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: paymentStatus.color },
                                ]}
                            >
                                {paymentModeLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.productsContainer}>
                    <Text style={styles.sectionTitle}>Products</Text>
                    {item.Products_List?.map((product, index) => {
                        const packWeight =
                            parseFloat(
                                product?.Product_Name?.match(
                                    /(\d+(?:\.\d+)?)\s*KG/i,
                                )?.[1],
                            ) || 0;
                        const totalQty = parseFloat(product.Bill_Qty) || 0;
                        const bags =
                            packWeight > 0 ? totalQty / packWeight : totalQty;

                        return (
                            <View key={index} style={styles.productItem}>
                                <View style={styles.productInfo}>
                                    <Text
                                        style={styles.productName}
                                        numberOfLines={2}
                                    >
                                        {product.Product_Name}
                                    </Text>
                                    <Text style={styles.productDetails}>
                                        {packWeight > 0 ? (
                                            <>
                                                Bags: {bags.toFixed(1)} (
                                                {packWeight}kg each) • Rate: ₹
                                                {product.Item_Rate}/kg
                                            </>
                                        ) : (
                                            <>
                                                Qty: {totalQty} • Rate: ₹
                                                {product.Item_Rate}
                                            </>
                                        )}
                                    </Text>
                                    {product.HSN_Code && (
                                        <Text style={styles.hsnCode}>
                                            HSN: {product.HSN_Code}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.productAmount}>
                                    ₹{parseFloat(product.Final_Amo).toFixed(2)}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.footer}>
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>
                            ₹{parseFloat(item.Total_Invoice_value).toFixed(2)}
                        </Text>
                    </View>

                    {isAdmin ? null : (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.viewButton]}
                                onPress={() =>
                                    navigation.navigate("InvoiceDetail", {
                                        invoice: item,
                                    })
                                }
                            >
                                <FeatherIcon
                                    name="edit"
                                    size={14}
                                    color={customColors.white}
                                />
                                <Text style={styles.buttonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    styles.shareButton,
                                ]}
                                onPress={() => downloadItemPDF(item)}
                            >
                                <FeatherIcon
                                    name="share"
                                    size={14}
                                    color={customColors.white}
                                />
                                <Text style={styles.buttonText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Invoice Summary"
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
                title={isAdmin ? "Filter Options" : "Select Date Range"}
                fromLabel="From Date"
                toLabel="To Date"
                showSalesPerson={isAdmin}
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
                                    onPress={() => setSelectedBrand(brand)}
                                >
                                    <Text
                                        style={{
                                            color:
                                                selectedBrand === brand
                                                    ? customColors.white
                                                    : customColors.grey900,
                                            ...typography.caption(),
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

                    {showSearch && (
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search retailer or invoice..."
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
                            activeOpacity={0.7}
                        >
                            <FeatherIcon
                                name="arrow-up-right"
                                size={14}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <View style={styles.statsGrid}>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                        {selectedBrand === "All"
                                            ? "Total Invoices"
                                            : `${selectedBrand} Invoices`}
                                    </Text>
                                    <Text style={styles.statValue}>
                                        {totalInvoices}
                                    </Text>
                                </View>

                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                        {selectedBrand === "All"
                                            ? "Total Amount"
                                            : `${selectedBrand} Amount`}
                                    </Text>
                                    <Text style={styles.statValue}>
                                        ₹{totalAmount.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                        Delivered
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: customColors.success },
                                        ]}
                                    >
                                        {statusCounts.deliveryCompleted}
                                        <Text style={styles.statSubValue}>
                                            /{totalInvoices}
                                        </Text>
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.statItem,
                                        styles.tappableStat,
                                        paymentFilter !== 'all' && styles.activeFilter,
                                    ]}
                                    onPress={() => {
                                        if (paymentFilter === 'all') {
                                            setPaymentFilter('paid');
                                        } else if (paymentFilter === 'paid') {
                                            setPaymentFilter('unpaid');
                                        } else {
                                            setPaymentFilter('all');
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.statLabel,
                                        paymentFilter !== 'all' && styles.activeFilterLabel,
                                    ]}>
                                        {paymentFilter === 'all' ? 'Paid' : paymentFilter === 'paid' ? 'Paid Only' : 'Unpaid Only'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: paymentFilter === 'unpaid' ? customColors.warning : customColors.success },
                                        ]}
                                    >
                                        {paymentFilter === 'all' 
                                            ? statusCounts.paymentCompleted 
                                            : paymentFilter === 'paid' 
                                                ? statusCounts.paymentCompleted 
                                                : statusCounts.paymentPending}
                                        <Text style={styles.statSubValue}>
                                            /{totalInvoices}
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={{
                            position: "absolute",
                            bottom: spacing.sm,
                            right: spacing.sm,
                            fontWeight: "400",
                            ...typography.caption(),
                            color: customColors.warning,
                            textAlign: "right",
                        }}>
                            Cancelled/Returned: {statusCounts.cancelReturn} / {totalInvoices}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.accordionScrollContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            colors={[customColors.primary]}
                        />
                    }
                >
                    {(isLoading || isFetching) ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={customColors.primary} />
                            <Text style={styles.loadingText}>Loading invoices...</Text>
                        </View>
                    ) : filteredInvoiceData.length > 0 ? (
                        <Accordion
                            data={filteredInvoiceData}
                            renderHeader={renderHeader}
                            renderContent={renderContent}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialIcon
                                name="receipt-long"
                                size={64}
                                color={customColors.grey300}
                            />
                            <Text style={styles.emptyText}>
                                No invoices found
                            </Text>
                            <Text style={styles.emptySubtext}>
                                Try adjusting the date range or search query
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default SaleInvoiceList;

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
    statsGrid: {
        gap: spacing.md,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    tappableStat: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
    },
    activeFilter: {
        backgroundColor: customColors.primary + '15',
        borderWidth: 1,
        borderColor: customColors.primary + '30',
    },
    activeFilterLabel: {
        color: customColors.primary,
        fontWeight: '600',
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
    statSubValue: {
        ...typography.body2(),
        fontWeight: "400",
        color: customColors.grey500,
    },
    accordionScrollContainer: {
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
    invoiceDate: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
    },
    headerRight: {
        alignItems: "flex-end",
    },
    invoiceAmount: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "700",
    },
    itemCount: {
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
    invoiceInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    invoiceNumber: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    statusBadges: {
        flexDirection: "row",
        gap: spacing.xs,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    sectionTitle: {
        ...typography.subtitle2(),
        color: customColors.grey800,
        fontWeight: "600",
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    productsContainer: {
        paddingBottom: spacing.xs,
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
    hsnCode: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 2,
    },
    productAmount: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    footer: {
        backgroundColor: customColors.grey50,
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
    viewButton: {
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        ...typography.subtitle1(),
        color: customColors.grey600,
        marginTop: spacing.md,
    },
    emptySubtext: {
        ...typography.body2(),
        color: customColors.grey400,
        marginTop: spacing.xs,
        textAlign: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl * 2,
    },
    loadingText: {
        ...typography.subtitle2(),
        color: customColors.grey600,
        marginTop: spacing.md,
    },
});
