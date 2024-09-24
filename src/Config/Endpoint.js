// const baseURL = "http://shrifoods.erpsmt.in/"        // live api
// const baseURL = "https://smttask.in/"                // test api
const baseURL = "http://192.168.1.10:9001/"             // localhost endpoint

export const API = {
    login: baseURL + "api/authorization/login",
    changePassword: baseURL + "api/masters/users/changePassword",
    delete: baseURL + "api/deleteMyAccount",

    routes: baseURL + "api/masters/routes",
    areas: baseURL + "api/masters/areas",
    state: baseURL + "api/masters/state",

    attendance: baseURL + "api/empAttendance/attendance",
    attendanceHistory: baseURL + "api/empAttendance/attendance/history?",
    MyLastAttendance: baseURL + "api/empAttendance/attendance?UserId=",

    retailers: baseURL + "api/masters/retailers?Company_Id=",
    retailerName: baseURL + "api/masters/retailers/dropDown?Company_Id=",
    retailerLocation: baseURL + "api/masters/retailers/location",
    retailerInfo: baseURL + "api/masters/retailers/info?Retailer_Id=",

    groupedProducts: baseURL + "api/masters/products/grouped?Company_Id=",
    productPacks: baseURL + "api/masters/products/packs?Company_Id=",
    closingStock: baseURL + "api/masters/retailers/closingStock",
    productClosingStock: baseURL + "api/masters/retailers/closingStock?Retailer_Id=",
    closingStockReport: baseURL + "api/masters/retailers/closingStock/myEntry?UserId=",

    saleOrder: baseURL + "api/sales/saleOrder",
    visitedLog: baseURL + "api/empAttendance/visitLogs",

    google_map: "https://www.google.com/maps/search/?api=1&query=",
    whatsApp: "https://wa.me/+91",

    // Not Used API
    distributors: baseURL + "api/masters/distributors",
    closingStockReturn: baseURL + "api/transaction/retailers/closingStock?Retailer_Id=",
    salesReturn: baseURL + "api/sales/areaBasedReport?Company_id=",
    productGroups: baseURL + "api/masters/products/productGroups?Company_Id=",
    areaRetailers: baseURL + "api/masters/retailers/areaRetailers?Company_Id=",
    products: baseURL + "api/masters/products?Company_Id=",
}
