import { FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from "react-native";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import { API } from "../../Config/Endpoint";
import { createSaleOrder } from "../../Api/sales";
import { customColors, shadows, spacing, typography } from "../../Config/helper";
import { fetchCostCenter, fetchPosOrderBranch, fetchProductsWithStockValue } from "../../Api/product";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import ProductItem from './ProductItem';

const PosOrder = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();
    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [orderItems, setOrderItems] = useState({});
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTransportId, setSelectedTransportId] = useState(null);
    const [selectedBrokerId, setSelectedBrokerId] = useState(null);
    const [showFilter, setShowFilter] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [orderData, setOrderData] = useState({
        Company_Id: item.Company_Id,
        So_Date: new Date().toISOString().split("T")[0],
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Sales_Person_Id: "",
        Sales_Person_Name: "",
        Branch_Id: "",
        Narration: "",
        Created_by: "",
        So_Id: "",
        TaxType: 0,
        VoucherType: 173, // 166 //39,
        Product_Array: [],
        Staff_Involved_List: [],
    });

    const { data: productBranch = [], isLoading: isBranchLoading } = useQuery({
        queryKey: ["posOrderBranch"],
        queryFn: fetchPosOrderBranch,
    });

    const { data: productData = [], isLoading: isProductLoading } = useQuery({
        queryKey: ["masterDataProducts"],
        queryFn: () => fetchProductsWithStockValue(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    const { data: rawCostCenters = [], isLoading: isCostCenterLoading } = useQuery({
        queryKey: ["costCenters"],
        queryFn: fetchCostCenter,
        enabled: showFilter,
        staleTime: 10 * 60 * 1000, // 10 minutes
        cacheTime: 15 * 60 * 1000, // 15 minutes
    });

    const { brokersData, transportData } = useMemo(() => {
        const Broker_User_Type = 3;
        const Transport_User_Type = 2;

        // Use filter only once and cache results
        const brokers = [];
        const transports = [];

        rawCostCenters.forEach(item => {
            if (item.User_Type === Broker_User_Type) {
                brokers.push(item);
            } else if (item.User_Type === Transport_User_Type) {
                transports.push(item);
            }
        });

        return { brokersData: brokers, transportData: transports };
    }, [rawCostCenters]);

    const downloadItemPDF = async (item) => {
        try {
            const pdfPath = await generateItemPDF(item.generalInfo, item);
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

    const generateItemPDF = async (generalInfo, orderDataFromResponse) => {
        try {
            const { generalInfo: genInfo, productDetails, staffInvolved } = orderDataFromResponse;

            const response = await fetch(`${API.retailerInfo()}${genInfo.Retailer_Id}`);
            const data = await response.json();

            let currentRetailerInfo = null;
            if (data.success && data.data && data.data.length > 0) {
                currentRetailerInfo = data.data[0];
            }

            const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
            const rupee = (n) =>
                safeNum(n).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

            const products = Array.isArray(productDetails) ? productDetails : [];
            const brokerNames = staffInvolved
                ?.filter(staff => staff.EmpType === "Broker")
                ?.map(broker => broker.EmpName)
                ?.join(", ") || "—";

            const transportNames = staffInvolved
                ?.filter(staff => staff.EmpType === "Transport")
                ?.map(transport => transport.EmpName)
                ?.join(", ") || "—";

            const numberOfBags = products.reduce((sum, p) => {
                const packWeight = parseFloat(p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1]) || 0;
                const totalKg = parseFloat(p.Bill_Qty) || 0;
                const bags = packWeight > 0 ? (totalKg / packWeight) : 0;
                return sum + bags; // Remove the conditional that was returning strings
            }, 0);

            const totalWeight = products.reduce((sum, p) => {
                const packWeight = parseFloat(p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1]) || 0;
                const bags = parseFloat(p.Bill_Qty) || 0;
                return sum + (bags * packWeight);
            }, 0);

            const htmlContent = `
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
                        font-size: 14px;
                        font-weight: 800;
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
                        font-size: 14px;
                        font-weight: 900;
                    }

                    .rate-space {
                        display: block;
                        height: 3mm;
                    }

                    .item-cell {
                        width: 32mm;
                        text-align: left;
                        padding-left: 2mm !important;
                        font-size: 14px;
                        font-weight: 900;
                    }

                    .bags-cell,
                    .kgs-cell {
                        width: 15mm;
                        font-size: 14px;
                        font-weight: 900;
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
                    <div class="bold" style="font-size: 12px; font-weight: 900">
                        <strong>DATE:</strong> ${generalInfo?.Created_on && `${new
                    Date(generalInfo.Created_on).toLocaleDateString("en-GB")}/${new
                        Date(generalInfo.Created_on).toLocaleTimeString("en-IN", {
                            hour:
                                "2-digit", minute: "2-digit", hour12: true,
                        })}`}
                    </div>
                    <div style="margin-bottom: 3mm; font-size: 14px; font-weight: 900">
                        <strong style="font-size: 14px; font-weight: 900">TAKEN:</strong>
                        ${generalInfo?.Sales_Person_Name || generalInfo?.Created_BY_Name || "—"
                }
                    </div>
                    </div>

                    <!-- Info Section -->
                    <div class="info-section">
                    <div class="info-row">
                        <div class="info-label">PARTY NAME:</div>
                        <div class="info-value">
                        ${currentRetailerInfo?.retailerTamilName ||
                currentRetailerInfo?.Retailer_Name || generalInfo.Retailer_Name || "—"
                }
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">LOCATION:</div>
                        <div class="info-value">
                        ${[currentRetailerInfo?.Party_Mailing_Address ||
                    currentRetailerInfo?.Reatailer_Address,].filter(Boolean).join(", ")
                || currentRetailerInfo?.StateGet || generalInfo?.Retailer_Name || "—"
                }
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">PH.NO:</div>
                        <div class="info-value">
                        ${currentRetailerInfo?.Mobile_No ||
                currentRetailerInfo?.Party_Mailing_Address?.match(
                    /(\d{3}[-\s]?\d{3}[-\s]?\d{4}|\d{10})/)?.[0] || "—"}
                        </div>
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
                        </tr>
                        </thead>
                        <tbody>
                        ${products.length ? products.map((p) => {
                        const packWeight =
                            parseFloat(p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1]) || 0;
                        const totalKg = parseFloat(p.Bill_Qty) || 0;
                        const bags = packWeight >
                            0 ? (totalKg / packWeight) : 0; return `
                        <tr class="data-row">
                            <td class="rate-cell">
                            <span class="rate-value">₹${rupee(p?.Item_Rate ?? 0)}</span>
                            <span class="rate-space"></span>
                            </td>
                            <td class="item-cell">
                            ${p.Product_Short_Name || p?.Product_Name}
                            </td>
                            <td class="bags-cell">${bags > 0 ? bags.toFixed(1) : "0"}</td>
                        </tr>
                        `;
                    }).join("") : Array.from({ length: 6 }, () => `
                        <tr class="data-row">
                            <td class="rate-cell">
                            <span class="rate-space"></span>
                            </td>
                            <td class="item-cell"></td>
                            <td class="bags-cell"></td>
                        </tr>
                        ` ).join("")}

                        <!-- Total Row -->
                        <tr class="total-row">
                            <td style="font-weight: 900; font-size: 13px">
                            ₹${rupee(products.reduce((sum, p) => sum + (parseFloat(p.Bill_Qty)
                        || 0) * (parseFloat(p.Item_Rate) || 0), 0))}
                            </td>
                            <td style="font-weight: 900; font-size: 13px">
                            ${totalWeight.toFixed(2)} KG
                            </td>
                            <td style="font-weight: 900; font-size: 13px">
                            ${numberOfBags.toFixed(1)}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                </body>
                </html>
            `;

            // Calculate approximate height based on content
            const estimatedHeight = 400 + products.length * 30;

            const options = {
                html: htmlContent,
                fileName: `sale-order-${genInfo?.So_Inv_No?.replace(/[^\w-]+/g, "_") || Date.now()}`,
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

    const mutation = useMutation({
        mutationFn: createSaleOrder,
        onSuccess: data => {
            if (data.success && data.others?.createdSaleOrder) {
                Alert.alert("Success", data.message, [
                    {
                        text: "Print Receipt",
                        onPress: async () => {
                            try {
                                await downloadItemPDF(data.others.createdSaleOrder);
                            } catch (err) {
                                Alert.alert("Error", "Failed to generate receipt");
                                console.error("PDF generation error:", err);
                            } finally {
                                setShowOrderSummary(false);
                                navigation.replace("HomeScreen");
                            }
                        },
                        style: "default",
                    },
                    {
                        text: "Done",
                        onPress: () => {
                            setShowOrderSummary(false);
                            navigation.replace("HomeScreen");
                        },
                        style: "cancel",
                    }
                ]);
            } else {
                Alert.alert("Success", data.message, [
                    {
                        text: "Okay",
                        onPress: () => {
                            setShowOrderSummary(false);
                            navigation.replace("HomeScreen");
                        }
                    }
                ]);
            }
        },
        onError: error => {
            Alert.alert("Error", error.message || "Failed to submit order");
        },
    });

    const getCompleteOrderData = useCallback(() => {
        return {
            ...orderData,
            Product_Array: Object.values(orderItems)
                .filter(item => item.qty > 0 && item.rate > 0)
                .map(item => {
                    // Get the product data to access PackGet
                    const product = productData.find(p => p.Product_Id === item.Product_Id);
                    const packWeight = parseFloat(product?.PackGet || 0);
                    const totalWeight = item.qty * packWeight;
                    const totalAmount = totalWeight * item.rate;

                    return {
                        Item_Id: item.Product_Id,
                        Bill_Qty: totalWeight, // Send total weight instead of bag count
                        Item_Rate: item.rate,
                        UOM: item.UOM_Id || 1,
                        Product_Id: item.Product_Id,
                        Bag_Count: item.qty, // Optional: send bag count separately
                        Pack_Weight: packWeight, // Optional: send pack weight
                        Total_Amount: totalAmount // Optional: send calculated total
                    };
                }),
            Staff_Involved_List: (() => {
                const list = [];

                if (selectedBrokerId && brokersData.length > 0) {
                    const selectedBroker = brokersData.find(broker =>
                        String(broker.Cost_Center_Id) === String(selectedBrokerId)
                    );

                    if (selectedBroker) {
                        list.push({
                            Id: "",
                            So_Id: "",
                            Involved_Emp_Id: parseInt(selectedBroker.Cost_Center_Id),
                            EmpName: selectedBroker.Cost_Center_Name || "",
                            Cost_Center_Type_Id: selectedBroker.User_Type || 3,
                            EmpType: selectedBroker.UserTypeGet || "Broker"
                        });
                    }
                }

                if (selectedTransportId && transportData.length > 0) {
                    const selectedTransport = transportData.find(transport =>
                        String(transport.Cost_Center_Id) === String(selectedTransportId)
                    );

                    if (selectedTransport) {
                        list.push({
                            Id: "",
                            So_Id: "",
                            Involved_Emp_Id: parseInt(selectedTransport.Cost_Center_Id),
                            EmpName: selectedTransport.Cost_Center_Name || "",
                            Cost_Center_Type_Id: selectedTransport.User_Type || 2,
                            EmpType: selectedTransport.UserTypeGet || "Transport"
                        });
                    }
                }

                return list;
            })()
        };
    }, [orderData, orderItems, selectedBrokerId, selectedTransportId, brokersData, transportData]);

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");
                const branchId = await AsyncStorage.getItem("branchId");

                if (companyId && userId) {
                    setOrderData(prev => ({
                        ...prev,
                        Company_Id: companyId,
                        Sales_Person_Id: userId,
                        Created_by: userId,
                        Sales_Person_Name: userName,
                        Branch_Id: branchId,
                    }));
                }
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const normalizeSearchText = (str) => {
        return String(str)
            .toLowerCase()
            .replace(/[^\u0B80-\u0BFF\w\s]/g, '') // Keep Tamil characters, alphanumeric, and spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    };

    const fuzzyMatch = (text, search) => {
        const normalizedText = normalizeSearchText(text);
        const normalizedSearch = normalizeSearchText(search);

        if (normalizedText.includes(normalizedSearch)) return true;

        // Check if all characters of search exist in text (in order)
        let searchIndex = 0;
        for (let i = 0; i < normalizedText.length && searchIndex < normalizedSearch.length; i++) {
            if (normalizedText[i] === normalizedSearch[searchIndex]) {
                searchIndex++;
            }
        }
        return searchIndex === normalizedSearch.length;
    };

    // Computed values
    const filteredProducts = useMemo(() => {
        if (!productData.length) return [];

        let filtered = productData.filter(product => product.IsActive === 1);

        if (selectedBrandId) {
            filtered = filtered.filter(product => product.Pos_Brand_Id === selectedBrandId);
        }

        if (debouncedSearch.trim()) {
            const searchTerms = debouncedSearch.trim().split(/\s+/);

            filtered = filtered.filter(product => {
                const searchableFields = [
                    product.Product_Name || "",
                    product.Short_Name || "",
                    product.Brand_Name || ""
                ];

                return searchTerms.every(term => {
                    return searchableFields.some(field => {
                        // Exact match (case insensitive)
                        if (field.toLowerCase().includes(term.toLowerCase())) return true;

                        // Normalized match (without special characters)
                        if (normalizeSearchText(field).includes(normalizeSearchText(term))) return true;

                        // Fuzzy match for typos
                        if (term.length > 2 && fuzzyMatch(field, term)) return true;

                        return false;
                    });
                });
            });
        }

        return filtered;
    }, [productData, selectedBrandId, debouncedSearch]);

    const { totalAmount, orderCount } = useMemo(() => {
        const items = Object.values(orderItems).filter(item => item.qty > 0 && item.rate > 0);
        const total = items.reduce((sum, item) => {
            const product = productData.find(p => p.Product_Id === item.Product_Id);
            const packWeight = parseFloat(product?.PackGet || 0);
            const totalWeight = item.qty * packWeight;
            const itemTotal = totalWeight * item.rate;
            return sum + itemTotal;
        }, 0);
        return { totalAmount: total, orderCount: items.length };
    }, [orderItems, productData]);

    // Handlers
    const updateOrderItem = useCallback((productId, field, value) => {
        setOrderItems(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: value === "" ? 0 : parseFloat(value) || 0,
                [`${field}Text`]: value // Store the text representation
            }
        }));
    }, []);

    const handleRateChange = useCallback((value, productId, field) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            const numericValue = value === '' ? 0 : parseFloat(value) || 0;
            const currentItem = orderItems[productId];
            const isInOrder = currentItem && currentItem.qty > 0;

            if (isInOrder) {
                setOrderItems(prev => ({
                    ...prev,
                    [productId]: {
                        ...prev[productId],
                        rate: numericValue,
                        rateText: value
                    }
                }));
            } else if (numericValue > 0) {
                const product = productData.find(p => p.Product_Id === productId);
                setOrderItems(prev => ({
                    ...prev,
                    [productId]: {
                        ...product,
                        qty: 1,
                        rate: numericValue,
                        rateText: value
                    }
                }));
            }
        }
    }, [orderItems, productData]);

    const handleQtyChange = useCallback((value, productId, field) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            const numericValue = value === '' ? 0 : parseFloat(value) || 0;
            const currentItem = orderItems[productId];
            const isInOrder = currentItem && currentItem.qty > 0;

            if (numericValue > 0) {
                if (!isInOrder) {
                    const product = productData.find(p => p.Product_Id === productId);
                    setOrderItems(prev => ({
                        ...prev,
                        [productId]: {
                            ...product,
                            qty: numericValue,
                            rate: product.Item_Rate || 0,
                            qtyText: value
                        }
                    }));
                } else {
                    setOrderItems(prev => ({
                        ...prev,
                        [productId]: {
                            ...prev[productId],
                            qty: numericValue,
                            qtyText: value
                        }
                    }));
                }
            } else if (value === '' || (isInOrder && numericValue === 0)) {
                if (isInOrder) {
                    if (value === '') {
                        setOrderItems(prev => ({
                            ...prev,
                            [productId]: {
                                ...prev[productId],
                                qty: 0,
                                qtyText: value
                            }
                        }));
                    } else {
                        removeFromOrder(productId);
                    }
                }
            }
        }
    }, [orderItems, productData, removeFromOrder]);

    const addToOrder = useCallback((product) => {
        setOrderItems(prev => ({
            ...prev,
            [product.Product_Id]: {
                ...product,
                qty: (prev[product.Product_Id]?.qty || 0) + 1,
                rate: product.Item_Rate || 0
            }
        }));
    }, []);

    const removeFromOrder = useCallback((productId) => {
        setOrderItems(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
        });
    }, []);

    const stableHandlers = useMemo(() => ({
        updateOrderItem,
        addToOrder,
        removeFromOrder,
        setOrderItems
    }), [updateOrderItem, addToOrder, removeFromOrder]);

    const handleSubmitOrder = async () => {
        const completeOrderData = getCompleteOrderData();

        if (completeOrderData.Product_Array.length === 0) {
            Alert.alert(
                "Error",
                "Please add at least one product to the order"
            );
            return;
        }

        if (!completeOrderData.Product_Array.every(product => product.Item_Rate > 0)) {
            Alert.alert("Error", "Please enter valid prices for all products");
            return;
        }

        setIsSubmitting(true);

        mutation.mutate(
            { orderData: completeOrderData },
            {
                onSettled: () => setIsSubmitting(false),
            }
        );
    };

    const IsolatedTextInput = React.memo(({
        value,
        onChangeText,
        style,
        placeholder,
        placeholderTextColor,
        keyboardType,
        selectTextOnFocus,
        textAlign,
        productId,
        field
    }) => {
        const [localValue, setLocalValue] = useState(value || '');

        useEffect(() => {
            setLocalValue(value || '');
        }, [value]);

        const handleChangeText = useCallback((text) => {
            setLocalValue(text);
            onChangeText(text, productId, field);
        }, [onChangeText, productId, field]);

        return (
            <TextInput
                style={style}
                value={localValue}
                onChangeText={handleChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor}
                keyboardType={keyboardType}
                selectTextOnFocus={selectTextOnFocus}
                textAlign={textAlign}
                blurOnSubmit={false}
                returnKeyType="done"
            />
        );
    });

    // Render functions
    const renderOrderSummary = () => (
        <Modal
            visible={showOrderSummary}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order Summary</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowOrderSummary(false)}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={Object.values(orderItems).filter(item => item.qty > 0)}
                    keyExtractor={item => item.Product_Id}
                    style={styles.summaryList}
                    renderItem={({ item }) => {
                        const product = productData.find(p => p.Product_Id === item.Product_Id);
                        const packWeight = parseFloat(product?.PackGet || 0);
                        const totalWeight = item.qty * packWeight;
                        const totalAmount = totalWeight * item.rate;

                        return (
                            <View style={styles.summaryItem}>
                                <View style={styles.summaryItemLeft}>
                                    <Text style={styles.summaryName}>{item.Short_Name || item.Product_Name}</Text>
                                    <Text style={styles.summaryItemMeta}>
                                        {item.qty} bags × {packWeight} kg = {totalWeight.toFixed(2)} kg
                                    </Text>
                                </View>
                                <Text style={styles.summaryItemTotal}>₹{totalAmount.toFixed(2)}</Text>

                                <View style={styles.summaryItemActions}>
                                    <TouchableOpacity onPress={() => removeFromOrder(item.Product_Id)}>
                                        <FeatherIcon name="delete" size={20} color={customColors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                />

                <View style={styles.summaryFooter}>
                    <View style={styles.grandTotalSection}>
                        <Text style={styles.grandTotalLabel}>Total Amount</Text>
                        <Text style={styles.grandTotal}>₹{totalAmount.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.checkoutButton,
                            isSubmitting && styles.checkoutButtonDisabled
                        ]}
                        onPress={handleSubmitOrder}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={customColors.white} size="small" />
                        ) : (
                            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );

    if (isBranchLoading || isProductLoading || (showFilter && isCostCenterLoading)) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader title="Sales Order" navigation={navigation} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>
                        {showFilter && isCostCenterLoading ? "Loading filters..." : "Loading products..."}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Sales Order"
                navigation={navigation}
                showRightIcon={orderCount > 0}
                rightIconName="shopping-cart"
                rightIconLibrary="FeatherIcon"
                showBadge={orderCount > 0}
                badgeValue={orderCount}
                onRightPress={() => setShowOrderSummary(true)}
            />

            <View style={styles.content}>
                {/* Brand Filter */}
                <View style={styles.filterSection}>
                    <View style={styles.mainFilterRow}>
                        <View style={styles.brandDropdownContainer}>
                            <EnhancedDropdown
                                data={productBranch}
                                labelField="POS_Brand_Name"
                                valueField="POS_Brand_Id"
                                placeholder="Select Brand (All)"
                                value={selectedBrandId}
                                onChange={item => setSelectedBrandId(item?.POS_Brand_Id)}
                                searchPlaceholder="Search brands..."
                            />
                        </View>

                        <TouchableOpacity style={[
                            styles.filterToggleButton,
                            showFilter && styles.filterToggleButtonActive,
                            showFilter && isCostCenterLoading && styles.filterToggleButtonLoading
                        ]}
                            onPress={() => { setShowFilter(!showFilter) }}
                            activeOpacity={0.7}
                            disabled={showFilter && isCostCenterLoading}>
                            {showFilter && isCostCenterLoading ? (
                                <ActivityIndicator
                                    size={20}
                                    color={showFilter ? customColors.white : customColors.primary}
                                />
                            ) : (
                                <FeatherIcon
                                    name="sliders"
                                    size={20}
                                    color={showFilter ? customColors.white : customColors.primary}
                                />
                            )}
                            <Text style={[styles.filterToggleText, showFilter && styles.filterToggleTextActive]}>
                                {showFilter && isCostCenterLoading ? "Loading..." : "Filters"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showFilter && (
                        <View style={styles.expandableFilters}>
                            <View style={styles.filterDivider} />
                            {isCostCenterLoading ? (
                                <View style={styles.filtersLoadingContainer}>
                                    <ActivityIndicator size="small" color={customColors.primary} />
                                    <Text style={styles.filtersLoadingText}>Loading filter options...</Text>
                                </View>
                            ) : (
                                <View style={styles.additionalFiltersRow}>
                                    <View style={styles.fullWidthFilter}>
                                        <EnhancedDropdown
                                            data={brokersData}
                                            labelField="Cost_Center_Name"
                                            valueField="Cost_Center_Id"
                                            placeholder="Select Broker"
                                            value={selectedBrokerId}
                                            onChange={item => setSelectedBrokerId(item?.Cost_Center_Id)}
                                            searchPlaceholder="Search brokers..."
                                        />
                                    </View>
                                    <View style={styles.fullWidthFilter}>
                                        <EnhancedDropdown
                                            data={transportData}
                                            labelField="Cost_Center_Name"
                                            valueField="Cost_Center_Id"
                                            placeholder="Select Transport"
                                            value={selectedTransportId}
                                            onChange={item => setSelectedTransportId(item?.Cost_Center_Id)}
                                            searchPlaceholder="Search transport..."
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Product Search */}
                <View style={styles.productSearchContainer}>
                    <View style={styles.productSearchWrapper}>
                        <FeatherIcon
                            name="search"
                            size={20}
                            color={customColors.grey500}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.productSearchInput}
                            placeholder="Search products by name..."
                            placeholderTextColor={customColors.grey500}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                style={styles.clearSearchButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <FeatherIcon
                                    name="x"
                                    size={18}
                                    color={customColors.grey500}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {debouncedSearch.trim() && (
                        <View style={styles.searchResultContainer}>
                            <Text style={styles.searchResultText}>
                                {filteredProducts.length === 0
                                    ? `No results for "${debouncedSearch}"`
                                    : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found for "${debouncedSearch}"`
                                }
                            </Text>
                            {searchQuery !== debouncedSearch && (
                                <ActivityIndicator
                                    size="small"
                                    color={customColors.primary}
                                    style={styles.searchLoader}
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* Products Grid */}
                <View style={styles.productsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <Text style={styles.sectionTitle}>({filteredProducts.length})</Text>
                    </View>

                    {filteredProducts.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <FeatherIcon name="package" size={48} color={customColors.grey400} />
                            <Text style={styles.emptyStateTitle}>
                                {debouncedSearch.trim() ? 'No products found' : 'No products available'}
                            </Text>
                            <Text style={styles.emptyStateSubtitle}>
                                {debouncedSearch.trim()
                                    ? `Try adjusting your search "${debouncedSearch}" or filters`
                                    : "Try selecting a different brand or check your filters"
                                }
                            </Text>
                            {(debouncedSearch.trim() || selectedBrandId) && (
                                <TouchableOpacity
                                    style={styles.clearFiltersButton}
                                    onPress={() => {
                                        setSearchQuery('');
                                        setSelectedBrandId(null);
                                    }}
                                >
                                    <Text style={styles.clearFiltersText}>Clear filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.productsList}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode="none"
                        >
                            {filteredProducts.map((product) => {
                                const orderItem = orderItems[product.Product_Id];
                                return (
                                    <ProductItem
                                        key={product.Product_Id}
                                        product={product}
                                        orderItem={orderItem}
                                        onRateChange={handleRateChange}
                                        onQtyChange={handleQtyChange}
                                        onAddToOrder={addToOrder}
                                        onRemoveFromOrder={removeFromOrder}
                                        styles={styles}
                                    />
                                );
                            })}

                        </ScrollView>
                    )}
                </View>
            </View>

            {renderOrderSummary()}
        </SafeAreaView>
    );
};

export default PosOrder;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
    },
    filterSection: {
        backgroundColor: customColors.white,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 4,
    },
    mainFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    brandDropdownContainer: {
        flex: 1,
    },
    filterToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: customColors.primary,
        backgroundColor: customColors.white,
        gap: 8,
        minWidth: 100,
        justifyContent: "center",
    },
    filterToggleButtonActive: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    filterToggleButtonLoading: {
        opacity: 0.7,
    },
    filtersLoadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        gap: 12,
    },
    filtersLoadingText: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    filterToggleText: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.primary,
    },
    filterToggleTextActive: {
        color: customColors.white,
    },
    expandableFilters: {
        marginTop: 6,
    },
    filterDivider: {
        height: 1,
        backgroundColor: customColors.grey200,
        marginBottom: 4,
    },
    additionalFiltersRow: {
        flexDirection: "column",
        gap: 12,
        marginBottom: 6,
    },
    fullWidthFilter: {
        width: "100%",
    },
    productSearchContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    productSearchInput: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
        padding: 0,
    },
    clearSearchButton: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    searchResultContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    searchLoader: {
        marginLeft: spacing.sm,
    },
    searchResultText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xs,
        fontStyle: 'italic',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: spacing.lg,
    },
    emptyStateTitle: {
        ...typography.h6(),
        fontWeight: '600',
        color: customColors.grey700,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    clearFiltersButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.primary,
        borderRadius: 8,
    },
    clearFiltersText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: '600',
    },

    productsSection: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
    },
    sectionTitle: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.grey900,
        marginBottom: spacing.xxs,
    },
    sectionSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    productsList: {
        paddingBottom: 175,
    },
    productRow: {
        justifyContent: 'space-between',
    },

    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        marginHorizontal: spacing.xs,
        ...shadows.small,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    productHeader: {
        flexDirection: "row",
        // marginBottom: 10,
    },
    productDetails: {
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productName: {
        // width: "100%",
        ...typography.body1(),
        fontWeight: "700",
        color: customColors.grey900,
        marginBottom: spacing.xs,
        lineHeight: 24,
    },
    productMeta: {
        flexDirection: "row",
        // justifyContent: "space-around",
        alignItems: "center",
    },
    productUnits: {
        ...typography.body2(),
        color: customColors.grey600,
        fontWeight: "500",
    },
    stockIndicator: {
        ...typography.body2(),
        fontWeight: "500",
        marginLeft: spacing.md,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    baseRate: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "500",
        marginTop: spacing.xs,
    },
    inStock: {
        backgroundColor: customColors.success + "20",
        color: customColors.success,
    },
    outOfStock: {
        backgroundColor: customColors.error + "20",
        color: customColors.error,
    },

    inputSection: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.grey700,
        marginBottom: spacing.xs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        paddingHorizontal: 16,
        height: 48,
    },
    currencySymbol: {
        ...typography.h4(),
        fontWeight: "600",
        color: customColors.primary,
        marginRight: 4,
    },
    rateInput: {
        flex: 1,
        ...typography.h4(),
        fontWeight: "700",
        color: customColors.primary,
        padding: 0,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        height: 48,
    },
    quantityInput: {
        flex: 1,
        ...typography.h4(),
        fontWeight: "600",
        color: customColors.black,
        textAlign: "center",
    },

    actionSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: spacing.md,
    },
    totalSection: {
        flex: 1,
    },
    totalLabel: {
        ...typography.caption(),
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 4,
    },
    totalAmount: {
        ...typography.h4(),
        fontWeight: "700",
        color: "#059669",
    },
    actionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 120,
        alignItems: "center",
    },
    addButton: {
        backgroundColor: "#059669",
    },
    removeButton: {
        backgroundColor: "#EF4444",
    },
    actionButtonText: {
        ...typography.button(),
        fontWeight: "600",
    },
    addButtonText: {
        color: customColors.white,
    },
    removeButtonText: {
        color: customColors.white,
    },

    modalContainer: {
        flex: 1,
        // backgroundColor: customColors.white,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomColor: customColors.border,
    },
    modalTitle: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey200,
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        ...typography.h6(),
        color: customColors.grey600,
    },
    summaryList: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    summaryItemLeft: {
        flex: 1,
        marginRight: 16,
    },
    summaryItemName: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: 4,
    },
    summaryItemMeta: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    summaryItemTotal: {
        ...typography.h6(),
        fontWeight: "600",
        color: "#059669",
    },
    summaryItemActions: {
        marginLeft: 16,
    },
    summaryFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    grandTotalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    grandTotalLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        textAlign: "center",
        fontWeight: "700",
    },
    grandTotal: {
        ...typography.h5(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    checkoutButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        paddingVertical: spacing.lg,
        alignItems: "center",
    },
    checkoutButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    checkoutButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
});