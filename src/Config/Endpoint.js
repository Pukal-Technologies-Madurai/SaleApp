let baseURL = "http://pukalfoods.erpsmt.in/"; // Live api
// let baseURL = "https://apiweb.erpsmt.in/"; // Test live api
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
    uom: () => `${baseURL}api/masters/uom`,
    district: () => `${baseURL}api/masters/district`,

    attendance: () => `${baseURL}api/empAttendance/attendance`,
    attendanceHistory: () => `${baseURL}api/empAttendance/attendance/history?`,
    MyLastAttendance: () => `${baseURL}api/empAttendance/attendance?UserId=`,

    retailers: () => `${baseURL}api/masters/retailers?Company_Id=`,
    retailerName: () => `${baseURL}api/masters/retailers/dropDown?Company_Id=`,
    retailerLocation: () => `${baseURL}api/masters/retailers/location`,
    retailerInfo: () => `${baseURL}api/masters/retailers/info?Retailer_Id=`,

    groupedProducts: () => `${baseURL}api/masters/products/grouped?Company_Id=`,
    productPacks: () => `${baseURL}api/masters/products/packs?Company_Id=`,
    closingStock: () => `${baseURL}api/masters/retailers/closingStock`,
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
    deliveryTripSheet: () =>
        `${baseURL}api/delivery/deliveryTripSheet?Fromdate=`,

    visitedLog: () => `${baseURL}api/empAttendance/visitLogs`,
    saleOrder: () => `${baseURL}api/sales/saleOrder`,
    salesPerson: () =>
        `${baseURL}api/masters/users/salesPerson/dropDown?Company_id=`,
    closingStockAreaBased: () =>
        `${baseURL}api/masters/retailers/closingStock/areaBased?Company_id=`,

    getRetailersWhoHasBills: () =>
        `${baseURL}api/receipt/getRetailersWhoHasBills`,
    retailerPendingBills: () =>
        `${baseURL}api/receipt/retailerBills?retailer_id=`,
    paymentCollection: () => `${baseURL}api/receipt/collectionReceipts`,
    receiptFilter: () => `${baseURL}api/receipt/filterValues`,

    google_map: "https://www.google.com/maps/search/?api=1&query=",
    whatsApp: "https://wa.me/+91",

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
