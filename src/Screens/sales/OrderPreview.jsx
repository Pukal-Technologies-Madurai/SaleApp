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
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import Accordion from "../../Components/Accordion";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import { useQuery } from "@tanstack/react-query";
import { fetchSaleOrder } from "../../Api/sales";
import { fetchRetailerInfo } from "../../Api/retailers";

const OrderPreview = () => {
    const navigation = useNavigation();

    const [uID, setUID] = useState(null);
    const [companyId, setCompanyId] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [userName, setUserName] = useState("");

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [modalVisible, setModalVisible] = useState(false);
    const [productSummary, setProductSummary] = useState([]);

    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");
                const Company_Name = await AsyncStorage.getItem("companyName");
                const User_Name = await AsyncStorage.getItem("userName");

                setUID(userId);
                setCompanyId(Company_Id);
                setCompanyName(Company_Name);
                setUserName(User_Name);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const { data: logData = [], isLoading, refetch } = useQuery({
        queryKey: ["saleOrders", selectedFromDate, selectedToDate, companyId, uID],
        queryFn: () => fetchSaleOrder({
            from: selectedFromDate.toISOString().split("T")[0],
            to: selectedToDate.toISOString().split("T")[0],
            company: companyId,
            userId: uID,
        }),
        enabled: !!selectedFromDate && !!selectedToDate && !!companyId && !!uID,
    });

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

    const generateItemPDF = async (item) => {
        try {
            const response = await fetch(`${API.retailerInfo()}${item.Retailer_Id}`);
            const data = await response.json();

            let currentRetailerInfo = null;
            if (data.success && data.data && data.data.length > 0) {
                currentRetailerInfo = data.data[0];
            }

            const safeNum = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
            const rupee = n => safeNum(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const dt = (iso) =>
                iso ? new Date(iso).toLocaleString("en-IN", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                }) : "—";

            const products = Array.isArray(item?.Products_List) ? item.Products_List : [];
            const totalQty = products.reduce((s, p) => s + safeNum(p?.Total_Qty ?? p?.Bill_Qty, 0), 0);
            const subtotal = safeNum(item?.Total_Before_Tax, 0);
            const roundOff = safeNum(item?.Round_off, 0);
            const discount = safeNum(item?.Discount_Amount, 0);
            const net = safeNum(item?.Total_Invoice_value, 0);
            const summarizeBranch = item?.Branch_Name === "OFFICE" ? "PUKAL FOODS" : item?.Branch_Name || "SM TRADERS";
            const totalAmountWords = typeof numberToWords === "function" ? numberToWords(net) : "";
            const broker = Array.isArray(item?.Staff_Involved_List) ? item.Staff_Involved_List : [];
            const brokerNames = broker.map(b => b.EmpType === "Broker" ? b.EmpName : null).filter(Boolean).join(", ");

            const transport = Array.isArray(item?.Staff_Involved_List) ? item.Staff_Involved_List : [];
            const transportNames = transport.map(t => t.EmpType === "Transport" ? t.EmpName : null).filter(Boolean).join(", ");

            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta
                    name="viewport"
                    content="width=80mm, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
                    />
                    <title>Receipt - ${item?.So_Inv_No || item?.So_Id}</title>
                    <style>
                    @page {
                        size: 80mm auto;
                        margin: 0mm;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        width: 80mm;
                        margin: 0;
                        padding: 0;
                        font-family: "Courier New", Courier, monospace;
                        font-size: 10px;
                        line-height: 1.2;
                        color: #000;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    body {
                        padding: 2mm;
                    }

                    @media print {
                        html,
                        body {
                        width: 80mm;
                        margin: 0;
                        padding: 0;
                        }
                        body {
                        padding: 1mm;
                        }
                        .no-print {
                        display: none !important;
                        }
                    }

                    .center {
                        text-align: center;
                    }

                    .bold {
                        font-weight: 700;
                    }

                    .mt-1 {
                        margin-top: 1mm;
                    }
                    .mt-2 {
                        margin-top: 2mm;
                    }
                    .mt-3 {
                        margin-top: 3mm;
                    }
                    .mt-4 {
                        margin-top: 4mm;
                    }

                    .row,
                    .kv {
                        display: flex;
                        justify-content: space-between;
                        gap: 2mm;
                    }

                    .hr {
                        border-top: 1px dashed #000;
                        height: 0;
                        margin: 2mm 0;
                    }

                    .tiny {
                        font-size: 8px;
                        line-height: 1.3;
                    }

                    .small {
                        font-size: 9px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                        margin: 1mm 0;
                    }

                    th,
                    td {
                        padding: 1mm 0;
                        text-align: left;
                        vertical-align: top;
                        font-size: 9px;
                        word-wrap: break-word;
                    }

                    th {
                        border-bottom: 1px solid #000;
                        font-weight: 700;
                    }

                    th:first-child,
                    td:first-child {
                        width: 38mm;
                        padding-right: 2mm;
                    }

                    th.qty,
                    td.qty {
                        text-align: center;
                        width: 10mm;
                    }

                    th.rate,
                    td.rate {
                        text-align: right;
                        width: 14mm;
                    }

                    th.amt,
                    td.amt {
                        text-align: right;
                        width: 18mm;
                    }

                    .totals td {
                        padding-top: 2mm;
                        border-top: 1px solid #000;
                    }

                    .net {
                        font-size: 11px;
                        font-weight: 700;
                    }

                    .footer {
                        text-align: center;
                        margin-top: 4mm;
                        font-size: 8px;
                        line-height: 1.4;
                    }

                    .header-title {
                        font-size: 14px;
                        font-weight: 700;
                        margin-bottom: 1mm;
                    }
                    </style>
                </head>
                <body>
                    <!-- Header -->
                    <div class="center">
                    <div class="header-title">${summarizeBranch}</div>
                    ${currentRetailerInfo?.Branch_Address_1 ||
                    currentRetailerInfo?.Branch_Address_2 || currentRetailerInfo?.City ? `
                    <div class="tiny mt-1">
                        ${[currentRetailerInfo?.Branch_Address_1,
                currentRetailerInfo?.Branch_Address_2, currentRetailerInfo?.City,
                currentRetailerInfo?.Pincode].filter(Boolean).join(', ')}
                    </div>
                    ` : ''} ${currentRetailerInfo?.GST_No ? `
                    <div class="tiny">
                        GSTIN: <span class="bold">${currentRetailerInfo.GST_No}</span>
                    </div>
                    ` : ''}
                    </div>

                    <div class="hr"></div>

                    <!-- Meta -->
                    <div
                    style="
                        background: #f8f9fa;
                        padding: 2mm;
                        border-radius: 2mm;
                        margin: 2mm 0;
                    "
                    >
                    <div class="kv small" style="margin-bottom: 1mm">
                        <div>
                        Bill No:
                        <span class="bold">${item?.So_Inv_No || item?.So_Id || "—"}</span>
                        </div>
                        <div>
                        Date: <span class="bold">${dt(item?.So_Date).split(',')[0]}</span>
                        </div>
                    </div>

                    <div
                        style="
                        display: flex;
                        justify-content: space-between;
                        font-size: 8px;
                        margin-top: 1mm;
                        "
                    >
                        <div style="text-align: center">
                        <div style="color: #666">Voucher</div>
                        <div class="bold">${item?.VoucherTypeGet || "C1"}</div>
                        </div>
                        <div style="text-align: center">
                        <div style="color: #666">Order Taken</div>
                        <div class="bold">
                            ${(item?.Sales_Person_Name || item?.Created_BY_Name ||
                    "—").substring(0, 8)}
                        </div>
                        </div>
                        <div style="text-align: center">
                        <div style="color: #666">Salesperson</div>
                        <div class="bold">${(userName || "—").substring(0, 10)}</div>
                        </div>
                    </div>
                    </div>

                    <div class="hr"></div>

                    <!-- Customer -->
                    <div class="bold small">Customer:</div>
                    <div class="small">
                    ${item?.Retailer_Name || currentRetailerInfo?.Retailer_Name || "—"}
                    </div>
                    ${currentRetailerInfo?.Reatailer_Address ? `
                    <div class="tiny mt-1">${currentRetailerInfo.Reatailer_Address}</div>
                    ` : ''} ${currentRetailerInfo?.Mobile_No ? `
                    <div class="tiny mt-1">${currentRetailerInfo.Mobile_No}</div>
                    ` : ''} ${currentRetailerInfo?.GST_No ? `
                    <div class="tiny">GSTIN: ${currentRetailerInfo.GST_No}</div>
                    ` : ''}

                    <div class="mt-2 tiny">
                    Status: ${item?.OrderStatus === "pending" ? "Pending" : "Completed"}
                    </div>

                    <div class="hr"></div>

                    <!-- Items -->
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
                        ${products.map(p => `
                        <tr>
                        <td>${p?.Product_Name || ""}</td>
                        <td class="qty">${safeNum(p?.Bill_Qty ?? p?.Total_Qty, 0)}</td>
                        <td class="rate">${rupee(p?.Item_Rate ?? 0)}</td>
                        <td class="amt">₹${rupee(p?.Amount ?? p?.Final_Amo ?? 0)}</td>
                        </tr>
                        `).join("")}

                        <tr class="totals">
                        <td colspan="3" class="bold" style="text-align: right">Subtotal</td>
                        <td class="amt bold">₹${rupee(subtotal)}</td>
                        </tr>

                        ${discount ? `
                        <tr>
                        <td colspan="3" style="text-align: right">Discount</td>
                        <td class="amt">-₹${rupee(discount)}</td>
                        </tr>
                        ` : ""} ${roundOff ? `
                        <tr>
                        <td colspan="3" style="text-align: right">Round Off</td>
                        <td class="amt">₹${rupee(roundOff)}</td>
                        </tr>
                        ` : ""}

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
                    <div class="tiny bold">${totalAmountWords || ""}</div>

                    <div class="hr"></div>

                    <!-- Footer -->
                    <div class="footer">
                    <div>WhatsApp Orders can be taken</div>
                    <div class="mt-1">
                        For Customer Care: <span class="bold">+91 90253 16142</span>
                    </div>
                    <div class="mt-2">This is an automatically generated bill.</div>
                    <div>Please verify all details.</div>
                    </div>
                </body>
                </html>
            `;

            const smtHTMLContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta
                    name="viewport"
                    content="width=80mm, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
                    />
                    <title>Quotation</title>
                    <style>
                    @page {
                        size: 80mm auto;
                        margin: 0mm;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        width: 80mm;
                        font-family: "Courier New", monospace;
                        font-size: 11px;
                        padding: 3mm;
                        color: #000;
                        line-height: 1.3;
                    }

                    .header {
                        text-align: center;
                        font-size: 16px;
                        font-weight: 700;
                        border-bottom: 0.75px solid #000;
                        padding-bottom: 2mm;
                        margin-bottom: 3mm;
                        letter-spacing: 1px;
                    }

                    .top-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2mm;
                        font-size: 10px;
                    }

                    .info-section {
                        border-top: 0.75px solid #000;
                        border-bottom: 0.75px solid #000;
                        padding: 1mm 0;
                    }

                    .info-row {
                        display: flex;
                        min-height: 4.5mm;
                        align-items: center;
                        padding: 1mm 0;
                    }

                    .info-label {
                        font-weight: 700;
                        min-width: 26mm;
                        font-size: 10px;
                        flex-shrink: 0;
                    }

                    .info-value {
                        flex: 1;
                        font-size: 10px;
                        font-weight: 700;
                        padding-left: 2mm;
                    }

                    .table-container {
                        margin-top: 3mm;
                        border: 0.25px solid #000;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    thead th {
                        border: 0.75px solid #000;
                        padding: 2mm 1mm;
                        text-align: center;
                        font-size: 10px;
                        font-weight: 700;
                        background: #f5f5f5;
                    }

                    tbody td {
                        border: 0.75px solid #000;
                        padding: 1mm;
                        text-align: center;
                        font-size: 9px;
                        vertical-align: middle;
                    }

                    .rate-cell {
                        width: 18mm;
                        padding: 2mm 1mm !important;
                        line-height: 1.4;
                    }

                    .rate-value {
                        display: block;
                        font-size: 10px;
                        font-weight: 600;
                        margin-bottom: 1mm;
                    }

                    .rate-space {
                        display: block;
                        height: 3mm;
                        // border-bottom: 1px solid #ccc;
                        // margin-top: 1mm;
                    }

                    .item-cell {
                        width: 32mm;
                        text-align: left;
                        padding-left: 2mm !important;
                        font-weight: 500;
                    }

                    .bags-cell,
                    .kgs-cell {
                        width: 15mm;
                    }

                    .data-row {
                        min-height: 12mm;
                    }

                    .total-row {
                        background: #f8f8f8;
                        border-top: 2px solid #000 !important;
                    }

                    .total-row td {
                        font-weight: 700;
                        font-size: 11px;
                        padding: 2mm 1mm !important;
                    }

                    @media print {
                        body {
                        padding: 2mm;
                        }
                    }
                    </style>
                </head>
                <body>
                    <!-- Header -->
                    <div class="header">QUOTATION</div>

                    <!-- Top Info Row -->
                    <div class="top-row">
                    <div>
                        <strong>DATE:</strong> ${item?.Created_on && `${new Date(item.Created_on).toLocaleDateString("en-GB")}/${new
                    Date(item.Created_on).toLocaleTimeString("en-IN", {
                        hour: "2-digit", minute:
                            "2-digit", hour12: true
                    })}`}
                    </div>
                    <div style="margin-bottom: 3mm; font-size: 10px">
                    <strong>TAKEN:</strong> ${item?.Sales_Person_Name || item?.Created_BY_Name
                || "—"}
                    </div>
                    </div>

                    <!-- Info Section -->
                    <div class="info-section">
                    <div class="info-row">
                        <div class="info-label">PARTY NAME:</div>
                        <div class="info-value">
                        ${currentRetailerInfo?.retailerTamilName || "—"}
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">LOCATION:</div>
                        <div class="info-value">
                        ${[currentRetailerInfo?.Party_Mailing_Address || currentRetailerInfo?.Reatailer_Address].filter(Boolean).join(', ') || "—"}
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">PH.NO:</div>
                        <div class="info-value">${currentRetailerInfo?.Mobile_No || currentRetailerInfo?.Party_Mailing_Address?.match(/(\d{3}[-\s]?\d{3}[-\s]?\d{4}|\d{10})/)?.[0]}</div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">TRANSPORT:</div>
                        <div class="info-value">${transportNames || "—"}</div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">BROKER:</div>
                        <div class="info-value">${brokerNames || "—"}</div>
                    </div>
                    </div>

                    <!-- Table -->
                    <div class="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th style="width: 18mm">RATE</th>
                            <th style="width: 32mm">ITEM NAME</th>
                            <th style="width: 15mm">BAGS</th>
                            <th style="width: 15mm">KGS</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${products.length ? products.map(p => `
                        <tr class="data-row">
                            <td class="rate-cell">
                            <span class="rate-value">₹${rupee(p?.Item_Rate ?? 0)}</span>
                            <span class="rate-space"></span>
                            </td>
                            <td class="item-cell">${p.Product_Short_Name || p?.Product_Name}</td>
                            <td class="bags-cell">${p?.Bill_Qty ?? 0}</td>
                            <td class="kgs-cell">
                                    ${(() => {
                        const kgValue = p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1];
                        const bags = p?.Bill_Qty ?? 0;
                        if (kgValue && bags) {
                            const totalKg = parseFloat(kgValue) * bags;
                            return totalKg.toFixed(1);
                        }
                        return "—";
                    })()}
                            </td>
                        </tr>
                        `).join("") : Array.from({ length: 6 }, () => `
                        <tr class="data-row">
                            <td class="rate-cell">
                            <span class="rate-space"></span>
                            </td>
                            <td class="item-cell"></td>
                            <td class="bags-cell"></td>
                            <td class="kgs-cell"></td>
                        </tr>
                        `).join("")}

                        <!-- Total Row -->
                        <tr class="total-row">
                        <td></td>
                        <td style="text-align: center; font-weight: 700;">TOTAL</td>
                        <td>${products.reduce((sum, p) => sum + (p?.Bill_Qty ?? 0), 0)}</td>
                        <td>
                            ${(() => {
                    const totalWeight = products.reduce((sum, p) => {
                        const kgValue = p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1];
                        const bags = p?.Bill_Qty ?? 0;
                        if (kgValue && bags) {
                            return sum + (parseFloat(kgValue) * bags);
                        }
                        return sum;
                    }, 0);
                    return totalWeight > 0 ? totalWeight.toFixed(1) : "0";
                })()}
                        </td>
</tr>
                        </tbody>
                    </table>
                    </div>
                </body>
                </html>
            `;

            // Calculate approximate height based on content
            const estimatedHeight = 400 + (products.length * 30);
            const finalHTML = item.Branch_Name === "SM TRADERS" ? smtHTMLContent : htmlContent;

            const options = {
                html: finalHTML,
                fileName: `receipt-${(item?.Retailer_Name || item?.So_Inv_No || Date.now()).toString().replace(/[^\w-]+/g, "_")}`,
                directory: "Documents",
                width: 226,  // 80mm = 226 pixels at 72 DPI
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
            const pdfPath = await generateItemPDF(item, "80mm");
            if (pdfPath) {
                try {
                    await Share.open({
                        url: `file://${pdfPath}`,
                        title: "Sale Order",
                        message: "Here is your order preview in PDF format",

                        showAppsToView: true,
                        subject: "Sale Order Receipt",
                        // Optional: Add print-specific filename
                        filename: `receipt-${item?.So_Inv_No || item?.So_Id || Date.now()}.pdf`,
                    });
                } catch (shareError) {
                    // Silently handle user cancellation
                    if (shareError.message && shareError.message.includes("User did not share")) {
                        return; // User cancelled, do nothing
                    }
                    throw shareError; // Re-throw other errors
                }
            } else {
                Alert.alert("Error", "Failed to generate PDF. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    const editOption = item => {
        const isSMTraders = companyName === "SM TRADERS";

        navigation.navigate(isSMTraders ? "PosEditOrder" : "EditOrder", {
            item: {
                ...item,
                Retailer_Id: item.Retailer_Id,
                Retailer_Name: item.Retailer_Name,
                So_Id: item.So_Id,
            },
            isEdit: true,
        });
    };

    // const filteredLogData = logData.filter(order =>
    //     selectedBrand === "All"
    //         ? true
    //         : order.Products_List.some(
    //               p => p.BrandGet?.trim() === selectedBrand,
    //           ),
    // );

    // Modified filtering to show only orders with selected brand products
    const getFilteredDataByBrand = () => {
        if (selectedBrand === "All") {
            return logData;
        }

        // Filter orders and products by selected brand
        return logData.map(order => {
            const filteredProducts = order.Products_List.filter(
                product => product.BrandGet?.trim() === selectedBrand
            );

            if (filteredProducts.length > 0) {
                // Calculate new total for filtered products only
                const brandTotal = filteredProducts.reduce(
                    (sum, product) => sum + (product.Amount || product.Final_Amo || 0),
                    0
                );

                return {
                    ...order,
                    Products_List: filteredProducts,
                    Total_Invoice_value: brandTotal, // Override with brand-specific total
                    Original_Total: order.Total_Invoice_value // Keep original for reference
                };
            }
            return null;
        }).filter(order => order !== null); // Remove orders with no matching brand products
    };

    const filteredLogData = getFilteredDataByBrand();
    const filteredTotalSales = filteredLogData.length;

    const filteredTotalAmount = filteredLogData.reduce((sum, order) => {
        if (selectedBrand === "All") {
            return sum + (order.Total_Invoice_value || 0);
        } else {
            // For specific brand, sum only the brand products
            const brandAmount = order.Products_List.reduce(
                (productSum, product) => productSum + (product.Amount || product.Final_Amo || 0),
                0
            );
            return sum + brandAmount;
        }
    }, 0);

    const filteredOrderData = filteredLogData.filter(order =>
        order.Retailer_Name.toLowerCase().includes(searchQuery.toLowerCase())
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
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                                    {selectedBrand === "All" ? "Total Sales" : `${selectedBrand} Sales`}
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalSales || "0"}
                                </Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    {selectedBrand === "All" ? "Total Amount" : `${selectedBrand} Amount`}
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
        </SafeAreaView>
    );
};

export default OrderPreview;

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
