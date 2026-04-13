import AsyncStorage from "@react-native-async-storage/async-storage";

let baseURL = "https://erpsmt.in/"; // Live api
// let baseURL = "https://apiweb.erpsmt.in/"; // Test live api
// let baseURL = "http://test.erpsmt.in/";
// let baseURL = "http://192.168.0.116:9001/"; // Localhost endpoint

const initializeBaseURL = async () => {
    try {
        const storedURL = await AsyncStorage.getItem("baseURL");
        if (storedURL) {
            baseURL = storedURL;
        }
    } catch (error) {
        console.error("Error loading baseURL from AsyncStorage:", error);
    }
};

initializeBaseURL();

export const setBaseUrl = async url => {
    baseURL = url;
    try {
        await AsyncStorage.setItem("baseURL", url);
    } catch (error) {
        console.error("Error saving baseURL to AsyncStorage:", error);
    }
};

export const API = {
    userPortal: () =>
        `${baseURL}api/authorization/userPortal/accounts?username=`,
    userPortalLogin: () => `${baseURL}api/authorization/userPortal/login`,
    getUserAuthInfo: () => `${baseURL}api/authorization/userAuth`,

    getUserAuthMob: () => `${baseURL}api/authorization/userAuthmobile`,
    changePassword: () => `${baseURL}api/masters/users/changePassword`,

    getBranches: () => `${baseURL}api/masters/branch`,
    users: () => `${baseURL}api/masters/users?Company_id=`,
    costCenterData: () => `${baseURL}api/dataEntry/costCenter/`,

    routes: () => `${baseURL}api/masters/routes`,
    areas: () => `${baseURL}api/masters/areas`,
    state: () => `${baseURL}api/masters/state`,
    district: () => `${baseURL}api/masters/district`,
    distributors: () => `${baseURL}api/masters/distributors`,
    getGoDown: () => `${baseURL}api/masters/godown`,

    attendance: () => `${baseURL}api/empAttendance/attendance`,
    attendanceHistory: () => `${baseURL}api/empAttendance/attendance/history?`,
    MyLastAttendance: () => `${baseURL}api/empAttendance/attendance?UserId=`,

    retailers: () => `${baseURL}api/masters/retailers?Company_Id=`,
    retailerName: () => `${baseURL}api/masters/retailers/dropDown`,
    retailerLocation: () => `${baseURL}api/masters/retailers/location`,
    retailerInfo: () => `${baseURL}api/masters/retailers/info?Retailer_Id=`,

    uom: () => `${baseURL}api/masters/uom`,
    products: () => `${baseURL}api/masters/products?Company_Id=`,

    stockValueWithProduct: () => `${baseURL}api/masters/products/withStock`,
    goDownwiseStockValue: () => `${baseURL}api/reports/storageStock/godownWiseForMobile?Godown_Id=`,
    createGodownTransfer: () => `${baseURL}api/inventory/tripSheet/arrivalEntry/bulk`,

    posOrderBranch: () => `${baseURL}api/masters/posbranch`,
    posProducts: () => `${baseURL}api/masters/products/allProducts`,
    posProductsWithStockValue: () => `${baseURL}api/pos/productMaster`,
    productPacks: () => `${baseURL}api/masters/products/packs?Company_Id=`,
    productClosingStock: () =>
        `${baseURL}api/masters/retailers/closingStock?Retailer_Id=`,
    productBasedClosingStock: () =>
        `${baseURL}api/masters/retailers/closingStock/productBased?Retailer_Id=`,
    closingStockReport: () =>
        `${baseURL}api/masters/retailers/closingStock/myEntry?UserId=`,

    delivery: () =>
        `${baseURL}api/delivery/deliveryOrderList?Delivery_Person_Id=`,
    todayDelivery: () => `${baseURL}api/delivery/deliveryOrderList?`,
    deliveryPut: () => `${baseURL}api/delivery/deliveryOrderMobile`,
    deliveryDetailsPut: () => `${baseURL}api/delivery/deliveryOrder`,
    deliveryTripSheet: () =>
        `${baseURL}api/delivery/deliveryTripSheet?Fromdate=`,
    pendingDeliveryList: () =>
        `${baseURL}api/delivery/deliveryOrderListData?Fromdate=`,
    pendingSalesOrder: () =>
        `${baseURL}api/reports/reportsNonconvert/sales?Fromdate=`,

    visitedLog: () => `${baseURL}api/empAttendance/visitLogs`,
    saleOrder: () => `${baseURL}api/sales/saleOrder`,
    getSaleInvoice: () => `${baseURL}api/sales/salesInvoice?Fromdate=`,
    saleInvoice: () => `${baseURL}api/sales/salesInvoice`,

    salesPerson: () =>
        `${baseURL}api/masters/users/salesPerson/dropDown?Company_id=`,
    closingStockAreaBased: () =>
        `${baseURL}api/masters/retailers/closingStock/areaBased?Company_id=`,

    customerWhoHasBills: () => `${baseURL}api/receipt/getCustomerWhoHasBills`,

    createReceipt: () => `${baseURL}api/receipt/receiptMaster`,
    userInvoltedReceipts: () =>
        `${baseURL}api/receipt/receiptMaster?createdBy=`,
    getReceipt: () => `${baseURL}api/receipt/receiptMaster?Fromdate=`,
    pendingSalesInvoice: () =>
        `${baseURL}api/receipt/receiptMaster/pendingSalesInvoiceReceipt?Acc_Id=`,
    retailerAccountPendingReference: () => 
        `${baseURL}api/journal/accountPendingReference?Acc_Id=`,
    defaultAccountMaster: () =>
        `${baseURL}api/masters/defaultAccountMaster?AC_Reason=MOBILE_CASH`,
    defaultCreditAccountMaster: () => `${baseURL}api/masters/accountMaster`,
    setRoutePath: () => `${baseURL}api/masters/setRoutes`,
    receiptFilter: () => `${baseURL}api/receipt/filterValues`,

    google_map: "https://www.google.com/maps/search/?api=1&query=",
    whatsApp: "https://wa.me/+91",

    retailerwiseClosingStock: () =>
        `${baseURL}api/masters/retailers/soldProducts?Retailer_Id=`,

    creditNote: () => `${baseURL}api/creditNote/`,
    updateCreditNote: () => `${baseURL}api/creditNote/`,
    getCreditNoteList: () => `${baseURL}api/creditNote?Fromdate=`,

    closingStock: () => `${baseURL}api/masters/retailers/closingStock`,

    godownWiseStackInHand: () => `${baseURL}/api/reports/storageStock/godownWiseMobile?`,
    godownExpenseReport: () => `${baseURL}api/reports/godownexpenseReport?`,

    // Doubtful APIs
    salesLive: () => `${baseURL}api/sales/salesInvoice/liveSales`,
    defaultDebitLiveSales: () =>
        `${baseURL}api/masters/defaultAccountMaster?AC_Reason=ONLINE_LIVE_SALES`,

    // not used
    salesReturnItems: () => `${baseURL}api/sales/salesReturn`,
    soldItemsForRetailer: () =>
        `${baseURL}api/reports/customerClosingStock/soldItems`,
    retailerClosingDetailedInfo: () =>
        `${baseURL}api/reports/customerClosingStock/retailerBased/detailedInfo?Retailer_Id=`,
    itemAvailableInRetailer: () =>
        `${baseURL}api/reports/customerClosingStock/itemSearch?Item_Id=`,
    
    accountsMaster: () => `${baseURL}api/masters/accounts`,
    retailerBasedPendingSalesInvoiceReceipt: () =>
        `${baseURL}api/receipt/receiptMaster/pendingSalesInvoiceReceipt/retailerBased?Retailer_id=`,
    retailersClosingStockDropDown: () =>
        `${baseURL}api/masters/retailers/whoHasClosingStock`,
    deliveryReturn: () => `${baseURL}api/reports/returnReports?Fromdate=`,
    groupedProducts: () => `${baseURL}api/masters/products/grouped?Company_Id=`,

    getRetailersWhoHasBills: () =>
        `${baseURL}api/receipt/getRetailersWhoHasBills`,
    retailerPendingBills: () =>
        `${baseURL}api/receipt/retailerBills?retailer_id=`,
    paymentCollection: () => `${baseURL}api/receipt/collectionReceipts`,

    // Not Used API
    login: () => `${baseURL}api/authorization/login`,
    company: () => `${baseURL}api/masters/company?Company_id=`,
    closingStockReturn: () =>
        `${baseURL}api/transaction/retailers/closingStock?Retailer_Id=`,
    productGroups: () =>
        `${baseURL}api/masters/products/productGroups?Company_Id=`,
    areaRetailers: () =>
        `${baseURL}api/masters/retailers/areaRetailers?Company_Id=`,
};
