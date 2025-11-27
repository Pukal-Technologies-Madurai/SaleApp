import { ActivityIndicator, Alert, BackHandler, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import ProductItem from "./ProductItem";
import { API } from "../../Config/Endpoint";
import { createSaleOrder } from "../../Api/sales";
import { useOrderStore } from "../../stores/orderStore";
import { customColors, spacing, typography } from "../../Config/helper";
import { fetchCostCenter, fetchPosOrderBranch, fetchProductsWithStockValue } from "../../Api/product";

const SMTSale = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const orderItems = useOrderStore((s) => s.orderItems);
    const getTotalItems = useOrderStore((s) => s.getTotalItems);
    const getTotalAmount = useOrderStore((s) => s.getTotalAmount);
    const selectedBrokerId = useOrderStore((s) => s.selectedBrokerId);
    const setSelectedBrokerId = useOrderStore((s) => s.setSelectedBrokerId);
    const selectedTransportId = useOrderStore((s) => s.selectedTransportId);
    const setSelectedTransportId = useOrderStore((s) => s.setSelectedTransportId);
    const removeItem = useOrderStore(state => state.removeItem);
    const resetAll = useOrderStore(state => state.resetAll);
    const clearStore = useOrderStore(state => state.clear);

    const [orderData, setOrderData] = useState({
        Company_Id: item.Company_Id,
        So_Date: new Date().toISOString().split("T")[0],
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Sales_Person_Id: "",
        Sales_Person_Name: "",
        Branch_Id: item.Branch_Id,
        Narration: "",
        Created_by: "",
        So_Id: "",
        TaxType: 0,
        VoucherType: 173, // 166 //39,
        Product_Array: [],
        Staff_Involved_List: [],
    });

    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Search helper functions
    const normalizeSearchText = useCallback((str) => {
        return String(str)
            .toLowerCase()
            .replace(/[^\u0B80-\u0BFF\w\s]/g, '') // Keep Tamil characters, alphanumeric, and spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }, []);

    const fuzzyMatch = useCallback((text, search) => {
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
    }, [normalizeSearchText]);

    const handleBackPress = useCallback(() => {
        const totalItems = getTotalItems();

        if (totalItems > 0) {
            Alert.alert(
                "Unsaved Changes",
                `You have ${totalItems} item(s) in your cart. What would you like to do?`,
                [
                    {
                        text: "Keep Items",
                        // onPress: () => navigation.goBack(),
                        style: "cancel"
                    },
                    {
                        text: "Cancel",
                        onPress: () => {
                            resetAll();
                            navigation.goBack();
                        },
                        style: "destructive"
                    },
                    // {
                    //     text: "Stay Here",
                    //     style: "default"
                    // }
                ],
                { cancelable: true }
            );
            return true; // Prevent default back action
        } else {
            return false; // Allow default back action
        }
    }, [navigation, getTotalItems, resetAll]);

    // Handle hardware back button on Android
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
            return () => backHandler.remove();
        }, [handleBackPress])
    );

    // Custom header back button handler
    const handleHeaderBack = useCallback(() => {
        handleBackPress();
    }, [handleBackPress]);

    const { data: productData = [], isLoading: isProductLoading } = useQuery({
        queryKey: ["masterDataProducts"],
        queryFn: () => fetchProductsWithStockValue(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        select: (rows) => {
            return rows.filter((r) => r.IsActive === 1)
                .map((r) => ({
                    // Keep original field names for compatibility
                    Product_Id: r.Product_Id,
                    Product_Name: r.Product_Name,
                    Short_Name: r.Short_Name,
                    Product_Rate: r.Product_Rate,
                    Units: r.Units,
                    PackGet: r.PackGet,
                    // Additional fields needed by ProductItem
                    Item_Rate: r.Product_Rate,
                    CL_Qty: r.CL_Qty,
                    Brand_Name: r.Brand_Name,
                    Pos_Brand_Id: r.Pos_Brand_Id,
                    IsActive: r.IsActive,
                    UOM_Id: r.UOM_Id,
                }))
        }
    });

    const { data: productBranch = [] } = useQuery({
        queryKey: ["posOrderBranch"],
        queryFn: fetchPosOrderBranch,
    });

    const filteredProducts = useMemo(() => {
        if (isProductLoading || !productData.length) return [];

        let filtered = productData;

        if (selectedBrandId) {
            filtered = filtered.filter(
                (product) => product.Pos_Brand_Id === selectedBrandId
            );
        }

        if (debouncedSearch.trim()) {
            filtered = filtered.filter(product => {
                const searchableFields = [
                    product.Product_Name,
                    product.Short_Name,
                    product.Brand_Name,
                ].filter(Boolean); // Remove empty/null values

                return searchableFields.some(field =>
                    fuzzyMatch(field, debouncedSearch)
                );
            });
        }

        return filtered.map(product => {
            const packWeight = parseFloat(product?.PackGet || 0);
            const itemRate = parseFloat(product.Item_Rate || 0);

            const ratePerKg = packWeight ? (itemRate / packWeight).toFixed(2) : 0;
            const bagsPerTon = packWeight ? (1000 / packWeight).toFixed(2) : 0;

            return {
                ...product,
                RatePerKg: Number(ratePerKg),
                BagsPerTon: Number(bagsPerTon),
            };
        });
    }, [productData, selectedBrandId, debouncedSearch, isProductLoading, fuzzyMatch]);

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

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");
                const userName = await AsyncStorage.getItem("userName");

                setOrderData(prev => ({
                    ...prev,
                    Company_Id: companyId,
                    Sales_Person_Id: userId,
                    Created_by: userId,
                    Sales_Person_Name: userName,
                }));
            } catch (error) {
                console.error("Error getting user data:", error);
            }
        })();
    }, []);

    const getCompleteOrderData = useCallback(() => {
        return {
            ...orderData,
            Product_Array: Object.values(orderItems)
                .filter(item => item.qty > 0 && item.rate > 0)
                .map(item => {
                    const product = productData.find(p => p.Product_Id === item.Product_Id);
                    const packWeight = parseFloat(product?.PackGet || 0);
                    const totalWeight = item.qty * packWeight;
                    const totalAmount = totalWeight * item.rate;

                    return {
                        Item_Id: item.Product_Id,
                        Bill_Qty: totalWeight, // Send total weight instead of bag count
                        Item_Rate: item.rate,
                        UOM: product?.UOM_Id || 1,
                        Product_Id: item.Product_Id,
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
    }, [orderData, orderItems, selectedBrokerId, selectedTransportId, brokersData, transportData, productData]);

    const downloadItemPDF = async item => {
        try {
            const pdfPath = await generateItemPDF(item);
            if (pdfPath) {
                try {
                    await Share.open({
                        url: `file://${pdfPath}`,
                        title: "Sale Order",
                        message: "Here is your order preview in PDF format",
                        showAppsToView: true,
                        subject: "Sale Order Receipt",
                        // Optional: Add print-specific filename
                        filename: `receipt-${item?.generalInfo?.So_Inv_No || item?.generalInfo?.So_Id || Date.now()}.pdf`,
                    });
                } catch (shareError) {
                    // Silently handle user cancellation
                    if (
                        shareError.message &&
                        shareError.message.includes("User did not share")
                    ) {
                        return; // User cancelled, do nothing
                    }
                    throw shareError; // Re-throw other errors
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

    const generateItemPDF = async (orderDataFromResponse) => {
        try {
            const {
                generalInfo,
                productDetails,
                staffInvolved,
            } = orderDataFromResponse;

            const response = await fetch(
                `${API.retailerInfo()}${generalInfo.Retailer_Id}`,
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

            const products = Array.isArray(productDetails)
                ? productDetails
                : [];
            const brokerNames =
                staffInvolved
                    ?.filter(staff => staff.EmpType === "Broker")
                    ?.map(broker => broker.EmpName)
                    ?.join(", ") || "—";

            const transportNames =
                staffInvolved
                    ?.filter(staff => staff.EmpType === "Transport")
                    ?.map(transport => transport.EmpName)
                    ?.join(", ") || "—";

            const numberOfBags = products.reduce((sum, p) => {
                const packWeight =
                    parseFloat(
                        p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1],
                    ) || 0;
                const totalKg = parseFloat(p.Bill_Qty) || 0;
                const bags = packWeight > 0 ? totalKg / packWeight : 0;
                return sum + bags; // Remove the conditional that was returning strings
            }, 0);

            const totalWeight = products.reduce((sum, p) => {
                const packWeight =
                    parseFloat(
                        p?.Product_Name?.match(/(\d+(?:\.\d+)?)\s*KG/i)?.[1],
                    ) || 0;
                const bags = parseFloat(p.Bill_Qty) || 0;
                return sum + bags * packWeight;
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
                            <strong>DATE:</strong> ${
                                generalInfo?.Created_on &&
                                `${new Date(
                                    generalInfo.Created_on,
                                ).toLocaleDateString("en-GB")}/${new Date(
                                    generalInfo.Created_on,
                                ).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                })}`
                            }
                        </div>
                        <div style="margin-bottom: 3mm; font-size: 14px; font-weight: 900">
                            <strong style="font-size: 14px; font-weight: 900">TAKEN:</strong>
                            ${
                                generalInfo?.Sales_Person_Name ||
                                generalInfo?.Created_BY_Name ||
                                "—"
                            }
                        </div>
                        </div>
    
                        <!-- Info Section -->
                        <div class="info-section">
                        <div class="info-row">
                            <div class="info-label">PARTY NAME:</div>
                            <div class="info-value">
                            ${
                                currentRetailerInfo?.retailerTamilName ||
                                currentRetailerInfo?.Retailer_Name ||
                                generalInfo?.Retailer_Name ||
                                "—"
                            }
                            </div>
                        </div>
    
                        <div class="info-row">
                            <div class="info-label">LOCATION:</div>
                            <div class="info-value">
                            ${
                                [
                                    currentRetailerInfo?.Party_Mailing_Address ||
                                        currentRetailerInfo?.Reatailer_Address,
                                ]
                                    .filter(Boolean)
                                    .join(", ") ||
                                currentRetailerInfo?.StateGet ||
                                generalInfo?.Retailer_Name ||
                                "—"
                            }
                            </div>
                        </div>
    
                        <div class="info-row">
                            <div class="info-label">PH.NO:</div>
                            <div class="info-value">
                            ${
                                currentRetailerInfo?.Mobile_No ||
                                currentRetailerInfo?.Party_Mailing_Address?.match(
                                    /(\d{3}[-\s]?\d{3}[-\s]?\d{4}|\d{10})/,
                                )?.[0] ||
                                "—"
                            }
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
                            ${
                                products.length
                                    ? products
                                          .map(p => {
                                              const packWeight =
                                                  parseFloat(
                                                      p?.Product_Name?.match(
                                                          /(\d+(?:\.\d+)?)\s*KG/i,
                                                      )?.[1],
                                                  ) || 0;
                                              const totalKg =
                                                  parseFloat(p.Bill_Qty) || 0;
                                              const bags =
                                                  packWeight > 0
                                                      ? totalKg / packWeight
                                                      : 0;
                                              return `
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
                                          })
                                          .join("")
                                    : Array.from(
                                          { length: 6 },
                                          () => `
                            <tr class="data-row">
                                <td class="rate-cell">
                                <span class="rate-space"></span>
                                </td>
                                <td class="item-cell"></td>
                                <td class="bags-cell"></td>
                            </tr>
                            `,
                                      ).join("")
                            }
    
                            <!-- Total Row -->
                            <tr class="total-row">
                                <td style="font-weight: 900; font-size: 13px">
                                ₹${rupee(
                                    products.reduce(
                                        (sum, p) =>
                                            sum +
                                            (parseFloat(p.Bill_Qty) || 0) *
                                                (parseFloat(p.Item_Rate) || 0),
                                        0,
                                    ),
                                )}
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
                fileName: `sale-order-${generalInfo?.So_Inv_No?.replace(/[^\w-]+/g, "_") || Date.now()}`,
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
            if (data.success) {
                Alert.alert(
                    "Success",
                    data.message || "Order created successfully!",
                    [
                        {
                            text: "Print Receipt",
                            onPress: async () => {
                                try {
                                    await downloadItemPDF(
                                        data.others.createdSaleOrder,
                                    );
                                } catch (err) {
                                    Alert.alert(
                                        "Error",
                                        "Failed to generate receipt",
                                    );
                                    console.error("PDF generation error:", err);
                                } finally {
                                    resetAll(); // Clear the order store
                                    setShowOrderSummary(false);
                                    navigation.replace("HomeScreen");
                                }
                            },
                            style: "default",
                        },
                        {
                            text: "Done",
                            onPress: () => {
                                resetAll(); // Clear the order store
                                setShowOrderSummary(false);
                                navigation.replace("HomeScreen");
                            },
                            style: "cancel",
                        }
                    ]
                );
            } else {
                Alert.alert("Success", data.message, [
                    {
                        text: "Okay",
                        onPress: () => {
                            clearStore();
                            setShowOrderSummary(false);
                            navigation.goBack();
                        }
                    }
                ]);
            }
        },
        onError: error => {
            console.error("Order submission error:", error);
            Alert.alert("Error", error.message || "Failed to submit order");
            setIsSubmitting(false);
        },
    });

    const handleSubmitOrder = useCallback(async () => {
        const completeOrderData = getCompleteOrderData();

        // Validation
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

        mutation.mutate({ orderData: completeOrderData });
    }, [getCompleteOrderData, mutation]);

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setSelectedBrandId(null);
    }, []);

    const orderedItems = useMemo(() => {
        return Object.values(orderItems).filter(item => item.qty > 0);
    }, [orderItems]);

    const renderProductItem = useCallback(({ item }) => (
        <ProductItem product={item} />
    ), []);

    const renderSummaryItem = useCallback(({ item }) => {
        const product = productData.find(p => p.Product_Id === item.Product_Id);
        if (!product) return null;

        const packWeight = parseFloat(product.PackGet || 0);
        const totalWeight = item.qty * packWeight;
        const totalAmount = totalWeight * item.rate;

        return (
            <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                    <Text style={styles.summaryItemName} numberOfLines={2}>
                        {product.Short_Name || product.Product_Name}
                    </Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => removeItem(item.Product_Id)}
                    >
                        <FeatherIcon name="delete" size={16} color={customColors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryItemDetails}>
                    <Text style={styles.summaryItemText}>
                        Qty: {item.qty} {product.Units} ({totalWeight.toFixed(2)} kg)
                    </Text>
                    <Text style={styles.summaryItemText}>
                        Rate: ₹{item.rate.toFixed(2)}/{product.Units}
                    </Text>
                    <Text style={styles.summaryItemTotal}>
                        Total: ₹{totalAmount.toFixed(2)}
                    </Text>
                </View>
            </View>
        );
    }, [productData, setShowOrderSummary]);

    const keyExtractor = useCallback((item) => item.Product_Id.toString(), []);
    const summaryKeyExtractor = useCallback((item) => item.Product_Id.toString(), []);

    const totalItems = getTotalItems();
    const totalAmount = getTotalAmount(productData);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Sales Order"
                navigation={{ ...navigation, goBack: handleHeaderBack }}
                showRightIcon={totalItems > 0}
                rightIconName="shopping-cart"
                rightIconLibrary="FeatherIcon"
                showBadge={totalItems > 0}
                badgeValue={totalItems.toFixed(0)}
                onRightPress={() => setShowOrderSummary(!showOrderSummary)}
            />

            <View style={styles.content}>
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
                                onPress={() => setSearchQuery("")}
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

                <View style={styles.productsContainer}>
                    {isProductLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={customColors.primary} />
                            <Text style={styles.loadingText}>Loading products...</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.productsHeader}>
                                <Text style={styles.productsHeaderText}>
                                    Products ({filteredProducts.length})
                                </Text>
                                {totalItems > 0 && (
                                    <TouchableOpacity
                                        style={styles.clearCartButton}
                                        onPress={() => {
                                            Alert.alert(
                                                "Clear Cart",
                                                "Are you sure you want to remove all items from cart?",
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    {
                                                        text: "Clear",
                                                        style: "destructive",
                                                        onPress: () => resetAll()
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <FeatherIcon name="trash-2" size={16} color={customColors.error} />
                                        <Text style={styles.clearCartText}>Clear Cart</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <FlatList
                                data={filteredProducts}
                                renderItem={renderProductItem}
                                keyExtractor={keyExtractor}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.flatListContent}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                removeClippedSubviews={true}
                                getItemLayout={(data, index) => ({
                                    length: 150, // Approximate height of each item
                                    offset: 150 * index,
                                    index,
                                })}
                            />
                        </>
                    )}
                </View>

                <Modal
                    visible={showOrderSummary}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowOrderSummary(false)}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order Summary</Text>
                            <TouchableOpacity style={styles.closeButton}
                                onPress={() => setShowOrderSummary(!showOrderSummary)}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {orderedItems.length > 0 ? (
                            <>
                                <FlashList
                                    data={orderedItems}
                                    renderItem={renderSummaryItem}
                                    keyExtractor={summaryKeyExtractor}
                                    style={styles.summaryList}
                                    contentContainerStyle={styles.summaryListContent}
                                    showsVerticalScrollIndicator={false}
                                />

                                <View style={styles.summaryFooter}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total Items:</Text>
                                        <Text style={styles.totalValue}>{totalItems}</Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total Amount:</Text>
                                        <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
                                    </View>

                                    <View style={styles.buttonsRow}>
                                        <TouchableOpacity
                                            style={[styles.proceedButton, { backgroundColor: customColors.error }]}
                                            onPress={() => {
                                                resetAll();
                                                setShowOrderSummary(false);
                                                Alert.alert("Cart Cleared", "All items have been removed");
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.proceedButtonText}>Clear Cart</Text>
                                            <FeatherIcon name="trash-2" size={20} color={customColors.white} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.proceedButton, isSubmitting && styles.proceedButtonDisabled]}
                                            onPress={handleSubmitOrder}
                                            activeOpacity={0.8}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <ActivityIndicator color={customColors.white} size="small" />
                                                    <Text style={styles.proceedButtonText}>Submitting...</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Text style={styles.proceedButtonText}>Submit Order</Text>
                                                    <FeatherIcon name="check" size={20} color={customColors.white} />
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <FeatherIcon name="shopping-cart" size={64} color={customColors.grey400} />
                                <Text style={styles.emptyStateText}>No items in cart</Text>
                                <Text style={styles.emptyStateSubtext}>Add products to see your order summary</Text>
                            </View>
                        )}
                    </SafeAreaView>
                </Modal>
            </View>
        </SafeAreaView>
    )
}

export default SMTSale

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
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
        // borderBottomWidth: 1,
        // borderBottomColor: customColors.grey200,
    },
    productSearchWrapper: {
        flexDirection: "row",
        alignItems: "center",
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: spacing.xs,
    },
    searchLoader: {
        marginLeft: spacing.sm,
    },
    searchResultText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xs,
        fontStyle: "italic",
    },
    productsContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
        marginTop: spacing.md,
    },
    productsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: spacing.lg,
        marginVertical: spacing.xxs,
    },
    productsHeaderText: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.grey800
    },
    clearCartButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: customColors.error + "15",
        borderRadius: 8,
        gap: spacing.xs,
    },
    clearCartText: {
        ...typography.caption(),
        color: customColors.error,
        fontWeight: '600',
    },
    flatListContent: {
        paddingVertical: spacing.md,
        paddingBottom: spacing.xxl,
    },

    modalContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    modalTitle: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.grey800,
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
    },
    summaryListContent: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
    },
    summaryItem: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    summaryItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    summaryItemName: {
        ...typography.h6(),
        color: customColors.dark,
        fontWeight: "600",
        flex: 1,
        marginRight: spacing.sm,
    },
    editButton: {
        padding: spacing.xs,
        borderRadius: 6,
        backgroundColor: customColors.grey100,
    },
    summaryItemDetails: {
        gap: spacing.xs,
    },
    summaryItemText: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    summaryItemTotal: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
        marginTop: spacing.xs,
    },
    summaryFooter: {
        backgroundColor: customColors.white,
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    buttonsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.md
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    totalLabel: {
        ...typography.body1(),
        color: customColors.dark,
        fontWeight: '500',
    },
    totalValue: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: '600',
    },
    totalAmount: {
        ...typography.h5(),
        color: customColors.success,
        fontWeight: '700',
    },
    proceedButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    proceedButtonDisabled: {
        backgroundColor: customColors.grey400,
        opacity: 0.7,
    },
    proceedButtonText: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyStateText: {
        ...typography.h5(),
        color: customColors.dark,
        fontWeight: '600',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyStateSubtext: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: 'center',
    },
})