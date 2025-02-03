// let baseURL = "http://shrifoods.erpsmt.in/api/"; // old live api
let baseURL = "http://pukalfoods.erpsmt.in/"; // new live api
// let baseURL = "http://192.168.0.101:9001/api/"; // localhost endpoint

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

    visitedLog: () => `${baseURL}api/empAttendance/visitLogs`,
    saleOrder: () => `${baseURL}api/sales/saleOrder`,
    salesPerson: () =>
        `${baseURL}api/masters/users/salesPerson/dropDown?Company_id=`,

    google_map: "https://www.google.com/maps/search/?api=1&query=",
    whatsApp: "https://wa.me/+91",

    // Not Used API
    company: () => `${baseURL}api/masters/company?Company_id=`,
    distributors: () => `${baseURL}api/masters/distributors`,
    closingStockReturn: () =>
        `${baseURL}api/transaction/retailers/closingStock?Retailer_Id=`,
    salesReturn: () => `${baseURL}api/sales/areaBasedReport?Company_id=`,
    productGroups: () =>
        `${baseURL}api/masters/products/productGroups?Company_Id=`,
    areaRetailers: () =>
        `${baseURL}api/masters/retailers/areaRetailers?Company_Id=`,
    products: () => `${baseURL}api/masters/products?Company_Id=`,
};
