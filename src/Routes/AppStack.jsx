import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import OpenCamera from "../Components/OpenCamera";
import SalesReport from "../Screens/admin/SalesReport";

import StartScreen from "../Screens/StartScreen";
import HomeScreen from "../Screens/HomeScreen";
import Dashboard from "../Screens/Dashboard";
import StatisticsScreen from "../Screens/StatisticsScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import LoginPortal from "../Screens/login/LoginPortal";
import SwitchCompany from "../Screens/login/SwitchCompany";
import Customers from "../Screens/retailers/Customers";
import CustomersDetails from "../Screens/retailers/CustomersDetails";
import AddCustomer from "../Screens/retailers/AddCustomer";
import EditCustomer from "../Screens/retailers/EditCustomer";
import RetailerVisit from "../Screens/retailers/RetailerVisit";
import RetailerVisitLog from "../Screens/retailers/RetailerVisitLog";
import RetailerMapView from "../Screens/retailers/RetailerMapView";
import TodayLog from "../Screens/retailers/TodayLog";
import Attendance from "../Screens/attendance/Attendance";
import AttendanceInfo from "../Screens/attendance/AttendanceInfo";
import AttendanceReport from "../Screens/attendance/AttendanceReport";
import EndDay from "../Screens/attendance/EndDay";
import StockInfo from "../Screens/closing/StockInfo";
import OrderPreview from "../Screens/sales/OrderPreview";
import SaleHistory from "../Screens/sales/SaleHistory";
import EditSaleOrder from "../Screens/sales/EditSaleOrder";
import AdminAttendance from "../Screens/admin/AdminAttendance";
import DeliveryReport from "../Screens/admin/DeliveryReport";
import RetailerStock from "../Screens/admin/RetailerStock";
import MasterData from "../Screens/admin/MasterData";
import TripReport from "../Screens/admin/TripReport";
import BillAdminView from "../Screens/admin/BillAdminView";
import SalesAdmin from "../Screens/admin/SalesAdmin";
import BillPayment from "../Screens/delivery/BillPayment";
import BillSummary from "../Screens/delivery/BillSummary";
import DeliveryUpdate from "../Screens/delivery/DeliveryUpdate";
import TripDetails from "../Screens/delivery/TripDetails";
import TripSheet from "../Screens/delivery/TripSheet";
import Sales from "../Screens/sales/Sales";
import SalesAdminDetail from "../Screens/admin/SalesAdminDetail";
import StockClosing from "../Screens/closing/StockClosing";
import ClosingStock from "../Screens/closing/ClosingStock";
import RoutePath from "../Screens/retailers/RoutePath";
import CreateReceipts from "../Screens/bills/CreateReceipts";
import ReceiptInfo from "../Screens/bills/ReceiptInfo";
import ReceiptAdmin from "../Screens/admin/ReceiptAdmin";
import PendingSales from "../Screens/pending/PendingSales";
import VisitLogSummary from "../Screens/admin/VisitLogSummary";
import PosOrder from "../Screens/sales/PosOrder";
import PosEditOrder from "../Screens/sales/PosEditOrder";
import SMTSale from "../Screens/sales/SMTSale";
import DeliveryReturn from "../Screens/admin/DeliveryReturn";
import PendingInvoice from "../Screens/pending/PendingInvoice";

const Stack = createStackNavigator();

const AppStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="StartScreen"
            screenOptions={{
                header: () => null,
            }}>
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="StartScreen" component={StartScreen} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />

            <Stack.Screen name="Attendance" component={Attendance} />
            <Stack.Screen name="AttendanceInfo" component={AttendanceInfo} />
            <Stack.Screen
                name="AttendanceReport"
                component={AttendanceReport}
            />
            <Stack.Screen name="EndDay" component={EndDay} />

            <Stack.Screen name="LoginPortal" component={LoginPortal} />
            <Stack.Screen name="SwitchCompany" component={SwitchCompany} />

            <Stack.Screen name="RoutePath" component={RoutePath} />
            <Stack.Screen name="AddCustomer" component={AddCustomer} />
            <Stack.Screen name="Customers" component={Customers} />
            <Stack.Screen
                name="CustomersDetails"
                component={CustomersDetails}
            />
            <Stack.Screen name="EditCustomer" component={EditCustomer} />
            <Stack.Screen name="RetailerVisit" component={RetailerVisit} />
            <Stack.Screen name="RetailerLog" component={RetailerVisitLog} />
            <Stack.Screen name="TodayLog" component={TodayLog} />

            <Stack.Screen name="EditOrder" component={EditSaleOrder} />
            <Stack.Screen name="OrderPreview" component={OrderPreview} />
            <Stack.Screen name="SaleHistory" component={SaleHistory} />
            <Stack.Screen name="PendingSales" component={PendingSales} />
            <Stack.Screen name="SMTSale" component={SMTSale} />
            <Stack.Screen name="PosOrder" component={PosOrder} />
            <Stack.Screen name="PosEditOrder" component={PosEditOrder} />
            <Stack.Screen name="DeliveryReturn" component={DeliveryReturn} />
            <Stack.Screen name="PendingInvoice" component={PendingInvoice} />

            <Stack.Screen name="ClosingStock" component={ClosingStock} />
            <Stack.Screen name="StockInfo" component={StockInfo} />

            <Stack.Screen name="DeliveryUpdate" component={DeliveryUpdate} />
            <Stack.Screen name="TripDetails" component={TripDetails} />
            <Stack.Screen name="TripSheet" component={TripSheet} />

            <Stack.Screen name="CreateReceipts" component={CreateReceipts} />
            <Stack.Screen name="ReceiptInfo" component={ReceiptInfo} />
            <Stack.Screen name="ReceiptAdmin" component={ReceiptAdmin} />

            <Stack.Screen name="AdminAttendance" component={AdminAttendance} />
            <Stack.Screen name="BillAdminView" component={BillAdminView} />
            <Stack.Screen name="DeliveryReport" component={DeliveryReport} />
            <Stack.Screen name="MasterData" component={MasterData} />
            <Stack.Screen name="RetailerStock" component={RetailerStock} />
            <Stack.Screen name="SalesAdmin" component={SalesAdmin} />
            <Stack.Screen name="SalesReport" component={SalesReport} />
            <Stack.Screen name="TripReport" component={TripReport} />
            <Stack.Screen name="VisitLogSummary" component={VisitLogSummary} />

            <Stack.Screen name="OpenCamera" component={OpenCamera} />

            {/* Not Used */}
            <Stack.Screen name="RetailerMapView" component={RetailerMapView} />
            <Stack.Screen name="BillPayment" component={BillPayment} />
            <Stack.Screen name="BillSummary" component={BillSummary} />
            <Stack.Screen name="Sales" component={Sales} />
            <Stack.Screen name="StockClosing" component={StockClosing} />
            <Stack.Screen
                name="SalesAdminDetail"
                component={SalesAdminDetail}
            />
        </Stack.Navigator>
    );
};

export default AppStack;
