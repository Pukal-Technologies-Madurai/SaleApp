let baseURL = "http://pukalfoods.erpsmt.in/"; // Live api
// let baseURL = "https://apiweb.erpsmt.in/"; // Test live api
// let baseURL = "http://test.erpsmt.in/";
// let baseURL = "http://192.168.0.116:9001/"; // Localhost endpoint

export const setBaseUrl = url => {
    baseURL = url;
};

export const API = {
    login: () => `${baseURL}api/authorization/login`,

    userPortal: () =>
        `${baseURL}api/authorization/userPortal/accounts?username=`,
    userPortalLogin: () => `${baseURL}api/authorization/userPortal/login`,
    getUserAuth: () => `${baseURL}api/authorization/userAuth`,
    getUserAuthMob: () => `${baseURL}api/authorization/userAuthmobile`,
    changePassword: () => `${baseURL}api/masters/users/changePassword`,

    routes: () => `${baseURL}api/masters/routes`,
    areas: () => `${baseURL}api/masters/areas`,
    state: () => `${baseURL}api/masters/state`,
    district: () => `${baseURL}api/masters/district`,

    users: () => `${baseURL}api/masters/users?Company_id=`,

    attendance: () => `${baseURL}api/empAttendance/attendance`,
    attendanceHistory: () => `${baseURL}api/empAttendance/attendance/history?`,
    MyLastAttendance: () => `${baseURL}api/empAttendance/attendance?UserId=`,

    retailers: () => `${baseURL}api/masters/retailers?Company_Id=`,
    retailerName: () => `${baseURL}api/masters/retailers/dropDown`,
    retailerLocation: () => `${baseURL}api/masters/retailers/location`,
    retailerInfo: () => `${baseURL}api/masters/retailers/info?Retailer_Id=`,

    uom: () => `${baseURL}api/masters/uom`,
    groupedProducts: () => `${baseURL}api/masters/products/grouped?Company_Id=`,
    stockValueWithProduct: () => `${baseURL}api/masters/products/withStock`,
    productPacks: () => `${baseURL}api/masters/products/packs?Company_Id=`,
    closingStock: () => `${baseURL}api/masters/retailers/closingStock`,
    productClosingStock: () =>
        `${baseURL}api/masters/retailers/closingStock?Retailer_Id=`,
    productBasedClosingStock: () =>
        `${baseURL}api/masters/retailers/closingStock/productBased?Retailer_Id=`,
    closingStockReport: () =>
        `${baseURL}api/masters/retailers/closingStock/myEntry?UserId=`,

    retailersClosingStockDropDown: () =>
        `${baseURL}api/masters/retailers/whoHasClosingStock`,

    retailerClosingDetailedInfo: () =>
        `${baseURL}api/reports/customerClosingStock/retailerBased/detailedInfo?Retailer_Id=`,

    soldItemsForRetailer: () =>
        `${baseURL}api/reports/customerClosingStock/soldItems`,

    itemAvailableInRetailer: () =>
        `${baseURL}api/reports/customerClosingStock/itemSearch?Item_Id=`,

    delivery: () =>
        `${baseURL}api/delivery/deliveryOrderList?Delivery_Person_Id=`,
    todayDelivery: () => `${baseURL}api/delivery/deliveryOrderList?`,
    deliveryPut: () => `${baseURL}api/delivery/deliveryOrderMobile`,
    deliveryTripSheet: () =>
        `${baseURL}api/delivery/deliveryTripSheet?Fromdate=`,
    pendingDeliveryList: () =>
        `${baseURL}api/delivery/deliveryOrderListData?Fromdate=`,
    pendingSalesOrder: () =>
        `${baseURL}api/reports/reportsNonconvert/sales?Fromdate=`,

    visitedLog: () => `${baseURL}api/empAttendance/visitLogs`,
    saleOrder: () => `${baseURL}api/sales/saleOrder`,
    salesPerson: () =>
        `${baseURL}api/masters/users/salesPerson/dropDown?Company_id=`,
    closingStockAreaBased: () =>
        `${baseURL}api/masters/retailers/closingStock/areaBased?Company_id=`,

    accountsMaster: () => `${baseURL}api/masters/accounts`,

    customerWhoHasBills: () => `${baseURL}api/receipt/getCustomerWhoHasBills`,

    createReceipt: () => `${baseURL}api/receipt/receiptMaster`,
    userInvoltedReceipts: () =>
        `${baseURL}api/receipt/receiptMaster?createdBy=`,

    getReceipt: () => `${baseURL}api/receipt/receiptMaster?Fromdate=`,

    salesLive: () => `${baseURL}api/sales/salesInvoice/liveSales`,

    pendingSalesInvoice: () =>
        `${baseURL}api/receipt/receiptMaster/pendingSalesInvoiceReceipt?Acc_Id=`,

    retailerBasedPendingSalesInvoiceReceipt: () =>
        `${baseURL}api/receipt/receiptMaster/pendingSalesInvoiceReceipt/retailerBased?Retailer_id=`,

    defaultAccountMaster: () =>
        `${baseURL}api/masters/defaultAccountMaster?AC_Reason=MOBILE_CASH`,

    defaultDebitLiveSales: () =>
        `${baseURL}api/masters/defaultAccountMaster?AC_Reason=ONLINE_LIVE_SALES`,

    defaultCreditAccountMaster: () => `${baseURL}api/masters/accountMaster`,

    setRoutePath: () => `${baseURL}api/masters/setRoutes`,
    getRetailersWhoHasBills: () =>
        `${baseURL}api/receipt/getRetailersWhoHasBills`,
    retailerPendingBills: () =>
        `${baseURL}api/receipt/retailerBills?retailer_id=`,
    paymentCollection: () => `${baseURL}api/receipt/collectionReceipts`,
    receiptFilter: () => `${baseURL}api/receipt/filterValues`,

    google_map: "https://www.google.com/maps/search/?api=1&query=",
    whatsApp: "https://wa.me/+91",

    retailerwiseClosingStock: () =>
        `${baseURL}api/masters/retailers/soldProducts?Retailer_Id=`,

    // Not Used API
    company: () => `${baseURL}api/masters/company?Company_id=`,
    distributors: () => `${baseURL}api/masters/distributors`,
    closingStockReturn: () =>
        `${baseURL}api/transaction/retailers/closingStock?Retailer_Id=`,
    productGroups: () =>
        `${baseURL}api/masters/products/productGroups?Company_Id=`,
    areaRetailers: () =>
        `${baseURL}api/masters/retailers/areaRetailers?Company_Id=`,
    products: () => `${baseURL}api/masters/products?Company_Id=`,
};
