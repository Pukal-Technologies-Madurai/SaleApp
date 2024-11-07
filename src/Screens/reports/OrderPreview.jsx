import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
  ImageBackground,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import Icon from "react-native-vector-icons/FontAwesome";
import FeatherIcon from "react-native-vector-icons/Feather";

import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import Accordion from "../../Components/Accordion";
import assetImages from "../../Config/Image";
import SalesReportModal from "../../Components/SalesReportModal";

const OrderPreview = () => {
  const navigation = useNavigation();
  const [logData, setLogData] = useState([]);
  const [retailerInfo, setRetailerInfo] = useState({});

  const [show, setShow] = useState(false);
  const [selectedFromDate, setSelectedFromDate] = useState(new Date());
  const [selectedToDate, setSelectedToDate] = useState(new Date());
  const [isSelectingFromDate, setIsSelectingFromDate] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [productSummary, setProductSummary] = useState([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState(0);
  const [totalProductsSold, setTotalProductsSold] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("UserId");
        const Company_Id = await AsyncStorage.getItem("Company_Id");
        const fromDate = selectedFromDate.toISOString().split("T")[0];
        const toDate = selectedToDate.toISOString().split("T")[0];
        fetchSaleOrder(fromDate, toDate, userId, Company_Id);
      } catch (err) {
        console.log(err);
      }
    })();
  }, [selectedFromDate, selectedToDate]);

  const selectDateFn = (event, selectedDate) => {
    setShow(Platform.OS === "ios");
    if (selectedDate) {
      if (isSelectingFromDate) {
        setSelectedFromDate(selectedDate);
        if (selectedDate > selectedToDate) {
          setSelectedToDate(selectedDate);
        }
      } else {
        setSelectedToDate(selectedDate);
        if (selectedDate < selectedFromDate) {
          setSelectedFromDate(selectedDate);
        }
      }
    }
  };

  const showDatePicker = (isFrom) => {
    setShow(true);
    setIsSelectingFromDate(isFrom);
  };

  const fetchSaleOrder = async (from, to, userId, company) => {
    try {
      const response = await fetch(
        `${API.saleOrder}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
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

  const calculateProductSummaryAndTotals = (orders) => {
    const summary = {};
    let totalAmount = 0;
    let productCount = 0;

    orders.forEach((order) => {
      totalAmount += order.Total_Invoice_value;

      order.Products_List.forEach((product) => {
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

  const renderHeader = (item) => {
    return (
      <View style={styles.accordionHeader}>
        <Text style={styles.accordionHeaderText}>{item.Retailer_Name}</Text>
      </View>
    );
  };

  const renderContent = (item) => {
    const currentDate = new Date().toISOString().split("T")[0];
    const orderDate = new Date(item.So_Date).toISOString().split("T")[0];

    return (
      <View style={styles.content}>
        <View style={styles.invoiceContainer}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>Order Summary</Text>
            <Text style={styles.invoiceDate}>
              {" "}
              {new Date(item.So_Date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceBody}>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceValue}>Total amount: ₹ {item.Total_Invoice_value}</Text>
          </View>

          <View style={styles.invoiceProducts}>
            <View style={styles.productRowHeader}>
              <Text style={styles.invoiceCell}>Name</Text>
              <Text style={styles.invoiceCell}>Qty</Text>
              <Text style={styles.invoiceCell}>Amount</Text>
            </View>
            {item.Products_List.map((product, index) => (
              <View key={index} style={styles.productRow}>
                <Text style={[styles.invoiceCell, { flex: 1, textAlign: "left", }]}
                  numberOfLines={5}
                  ellipsizeMode="tail">
                  {product.Product_Name}
                </Text>
                <Text style={styles.invoiceCell}>{product.Bill_Qty}</Text>
                <Text style={styles.invoiceCell}>₹ {product.Amount}</Text>
              </View>
            ))}
          </View>
          <View style={styles.buttonContainer}>
            {/* {currentDate === orderDate && (
              <TouchableOpacity style={styles.button} onPress={() => editOption(item)}>
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
            )} */}
            <TouchableOpacity style={[styles.button, { backgroundColor: customColors.primary }]} onPress={() => downloadItemPDF(item)}>
              <Text style={[styles.buttonText, { color: customColors.white }]}>Share PDF</Text>
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

  const fetchRetailerInfo = async (retailerId) => {
    try {
      const response = await fetch(`${API.retailerInfo}${retailerId}`);
      const data = await response.json();
      if (data.success) {
        setRetailerInfo(data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching retailer data: ", error);
    }
  };

  const generateItemPDF = async (item) => {
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
    ).join('')}
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
      fileName: 'order',
      directory: 'Documents',
    };

    const pdf = await RNHTMLtoPDF.convert(options);
    return pdf.filePath;
  };

  const downloadItemPDF = async (item) => {
    try {
      const pdfPath = await generateItemPDF(item);
      if (pdfPath) {
        await Share.open({
          url: `file://${pdfPath}`,
          title: "Sale order",
          message: "Here is your order preview in PDF format",
        });
      } else {
        Alert.alert("Error", "Failed to generate PDF. Please try again.");
      }
    } catch (error) {
      console.log("Error generating or sharing PDF: ", error);
      // Alert.alert("Error", "An error occurred while generating or sharing the PDF.");
    }
  };

  const editOption = (item) => {
    console.log(item.Retailer_Id, item.So_Id, item.Retailer_Name);
    navigation.navigate('Sales', {
      item: {
        ...item,
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        So_Id: item.So_Id,
      },
      isEdit: true,
    });
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
        <View style={styles.overlay}>
          <View style={styles.headersContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image source={assetImages.backArrow} />
            </TouchableOpacity>
            <Text style={styles.headersText} maxFontSizeMultiplier={1.2}>Sales Summary</Text>
          </View>

          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerWrapper}>
              <Text style={styles.dateTitle}>From</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.datePicker} onPress={() => showDatePicker(true)}>
                <TextInput maxFontSizeMultiplier={1.2} style={styles.datePickerTextInput}
                  value={
                    selectedFromDate
                      ? new Intl.DateTimeFormat("en-GB").format(selectedFromDate)
                      : ""
                  }
                  editable={false}
                  placeholder="Select Date"
                />
                <Icon name="calendar" color={customColors.white} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerWrapper}>
              <Text style={styles.dateTitle}>To</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.datePicker} onPress={() => showDatePicker(false)}>
                <TextInput maxFontSizeMultiplier={1.2} style={styles.datePickerTextInput}
                  value={
                    selectedToDate
                      ? new Intl.DateTimeFormat("en-GB").format(selectedToDate)
                      : ""
                  }
                  editable={false}
                />
                <Icon name="calendar" color={customColors.white} size={20} />
              </TouchableOpacity>
            </View>

            {show && (
              <DateTimePicker
                value={isSelectingFromDate ? selectedFromDate : selectedToDate}
                onChange={selectDateFn}
                mode="date"
                display="default"
                timeZoneOffsetInMinutes={0}
                style={{ width: "100%" }}
                testID="dateTimePicker"
              />
            )}
          </View>

          <View style={styles.countContainer}>
            <View style={styles.statsContainer}>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Sales</Text>
                <Text style={styles.statValue}>
                  {logData ? logData.length : "0"}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Amount</Text>
                <Text style={styles.statValue}>
                  {totalOrderAmount
                    ? `₹${totalOrderAmount.toFixed(2)}`
                    : "₹0.00"
                  }
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => setModalVisible(true)} >
              <FeatherIcon
                name="arrow-up-right"
                color={customColors.black}
                size={25}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.accordationScrollContainer}>
            <Accordion
              data={logData}
              renderHeader={renderHeader}
              renderContent={renderContent}
            />
          </ScrollView>

          <SalesReportModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            totalOrderAmount={totalOrderAmount}
            totalProductsSold={totalProductsSold}
            logData={logData}
            productSummary={productSummary}
          />
        </View>
      </ImageBackground>
    </View>
  );
};

export default OrderPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    backgroundColor: customColors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  headersContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  headersText: {
    ...typography.h4(),
    color: customColors.white,
    marginHorizontal: 10,
  },
  datePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 15,
  },
  datePickerWrapper: {
    flex: 1,
    marginRight: 5,
  },
  dateTitle: {
    ...typography.body2(),
    color: customColors.white,
    marginBottom: 2.5,
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  datePickerTextInput: {
    ...typography.body1(),
    color: customColors.white,
  },
  countContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: customColors.secondary,
    borderRadius: 5,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flexDirection: "column",
  },
  statLabel: {
    ...typography.h5(),
    fontWeight: "700"
  },
  statValue: {
    ...typography.h6(),
    textAlign: "center",
    color: customColors.black,
    fontWeight: "bold",
  },

  accordationScrollContainer: {
    marginTop: 15,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: customColors.white,
  },
  accordionHeaderText: {
    width: "90%",
    flexWrap: "wrap",
    textAlign: "left",
    ...typography.h6(),
    color: customColors.white,
    fontWeight: "500",
  },

  content: {
    margin: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: customColors.grey,
    borderRadius: 10,
  },
  invoiceContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceTitle: {
    ...typography.h6(),
    color: customColors.white,
    fontWeight: "bold",
  },
  invoiceDate: {
    ...typography.body1(),
    color: customColors.white,
  },
  invoiceBody: {
    padding: 10,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceValue: {
    ...typography.h6(),
    color: customColors.white,
    fontWeight: "700"
  },
  invoiceProducts: {
    marginTop: 10,
  },
  productRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: customColors.secondary,
    borderWidth: 1,
    borderColor: customColors.secondary,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  invoiceCell: {
    flex: 1,
    textAlign: "center",
    ...typography.body2(),
    color: customColors.black,
    fontWeight: "bold",
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: customColors.secondary,
    padding: 10,
    backgroundColor: customColors.white,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: customColors.secondary,
    alignItems: "center",
    borderRadius: 5,
    padding: 12,
    marginTop: 10,
  },
  buttonText: {
    ...typography.h6(),
    fontWeight: "700",
  },
});