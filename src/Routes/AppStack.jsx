import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import OpenCamera from "../Components/OpenCamera";

import AdminAttendance from "../Screens/admin/AdminAttendance";
import DeliveryReport from "../Screens/admin/DeliveryReport";
import DeliveryReturn from "../Screens/credit/DeliveryReturn";
import MasterData from "../Screens/admin/MasterData";
import MasterGodown from "../Screens/admin/MasterGodown";
import ReceiptAdmin from "../Screens/admin/ReceiptAdmin";
import SalesAdmin from "../Screens/admin/SalesAdmin";
import SalesReport from "../Screens/admin/SalesReport";
import TripDetails from "../Screens/admin/TripDetails";
import TripReport from "../Screens/admin/TripReport";
import VisitLogDetail from "../Screens/admin/VisitLogDetail";
import VisitLogHistory from "../Screens/admin/VisitLogHistory";

import Attendance from "../Screens/attendance/Attendance";
import AttendanceInfo from "../Screens/attendance/AttendanceInfo";
import AttendanceReport from "../Screens/attendance/AttendanceReport";
import EndDay from "../Screens/attendance/EndDay";

import CreateReceipts from "../Screens/bills/CreateReceipts";
import ReceiptInfo from "../Screens/bills/ReceiptInfo";

import ClosingStock from "../Screens/closing/ClosingStock";
import StockInfo from "../Screens/closing/StockInfo";

import SalesReturn from "../Screens/credit/SalesReturn";

import DeliveryUpdate from "../Screens/delivery/DeliveryUpdate";
import RetailerMapView from "../Screens/delivery/RetailerMapView";
import TripSheet from "../Screens/delivery/TripSheet";

import InvoiceDetail from "../Screens/invoice/InvoiceDetail";
import SaleInvoiceList from "../Screens/invoice/SaleInvoiceList";
import SalesInvoice from "../Screens/invoice/SalesInvoice";

import LoginPortal from "../Screens/login/LoginPortal";
import SwitchCompany from "../Screens/login/SwitchCompany";

import PendingDeliveryAdmin from "../Screens/pending/PendingDeliveryAdmin";
import PendingDeliveryIndividual from "../Screens/pending/PendingDeliveryIndividual";

import AddCustomer from "../Screens/retailers/AddCustomer";
import Customers from "../Screens/retailers/Customers";
import CustomersDetails from "../Screens/retailers/CustomersDetails";
import EditCustomer from "../Screens/retailers/EditCustomer";
import RetailerVisit from "../Screens/retailers/RetailerVisit";
import RetailerVisitLog from "../Screens/retailers/RetailerVisitLog";
import RoutePath from "../Screens/retailers/RoutePath";
import TodayLog from "../Screens/retailers/TodayLog";

import EditSaleOrder from "../Screens/sales/EditSaleOrder";
import OrderPreview from "../Screens/sales/OrderPreview";
import SaleHistory from "../Screens/sales/SaleHistory";
import Sales from "../Screens/sales/Sales";

import PosEditOrder from "../Screens/smtsale/PosEditOrder";
import SMTSale from "../Screens/smtsale/SMTSale";

import GodownActivities from "../Screens/stock/GodownActivities";
import GodownTransfer from "../Screens/stock/GodownTransfer";
import LiveStock from "../Screens/stock/LiveStock";
import StockInHand from "../Screens/stock/StockInHand";

import StartScreen from "../Screens/StartScreen";
import HomeScreen from "../Screens/HomeScreen";
import Dashboard from "../Screens/Dashboard";
import StatisticsScreen from "../Screens/StatisticsScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import Settings from "../Screens/Settings";

// Not used screens
import AdminItemSaleReturn from "../Screens/not-used/AdminItemSaleReturn";
import BillAdminView from "../Screens/not-used/BillAdminView";
import BillPayment from "../Screens/not-used/BillPayment";
import BillSummary from "../Screens/not-used/BillSummary";
import PendingInvoice from "../Screens/not-used/PendingInvoice";
import PendingSaleAdmin from "../Screens/not-used/PendingSaleAdmin";
import RetailerStock from "../Screens/not-used/RetailerStock";
import SalesAdminDetail from "../Screens/not-used/SalesAdminDetail";
import SalesReturnList from "../Screens/not-used/SalesReturnList";
import StockClosing from "../Screens/not-used/StockClosing";
import VisitLogSummary from "../Screens/not-used/VisitLogSummary";

const Stack = createStackNavigator();

const AppStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="StartScreen"
            screenOptions={{
                header: () => null,
            }}>
            <Stack.Screen name="StartScreen" component={StartScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={Settings} />

            {/* Components */}
            <Stack.Screen name="OpenCamera" component={OpenCamera} />

            <Stack.Screen name="AdminAttendance" component={AdminAttendance} />
            <Stack.Screen name="DeliveryReport" component={DeliveryReport} />
            <Stack.Screen name="DeliveryReturn" component={DeliveryReturn} />
            <Stack.Screen name="MasterData" component={MasterData} />
            <Stack.Screen name="MasterGodown" component={MasterGodown} />
            <Stack.Screen name="ReceiptAdmin" component={ReceiptAdmin} />
            <Stack.Screen name="SalesAdmin" component={SalesAdmin} />
            <Stack.Screen name="SalesReport" component={SalesReport} />
            <Stack.Screen name="TripDetails" component={TripDetails} />
            <Stack.Screen name="TripReport" component={TripReport} />
            <Stack.Screen name="VisitLogDetail" component={VisitLogDetail} />
            <Stack.Screen name="VisitLogHistory" component={VisitLogHistory} />

            <Stack.Screen name="Attendance" component={Attendance} />
            <Stack.Screen name="AttendanceInfo" component={AttendanceInfo} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
            <Stack.Screen name="EndDay" component={EndDay} />

            <Stack.Screen name="CreateReceipts" component={CreateReceipts} />
            <Stack.Screen name="ReceiptInfo" component={ReceiptInfo} />

            <Stack.Screen name="ClosingStock" component={ClosingStock} />
            <Stack.Screen name="StockInfo" component={StockInfo} />

            <Stack.Screen name="SalesReturn" component={SalesReturn} />

            <Stack.Screen name="DeliveryUpdate" component={DeliveryUpdate} />
            <Stack.Screen name="RetailerMapView" component={RetailerMapView} />
            <Stack.Screen name="TripSheet" component={TripSheet} />

            <Stack.Screen name="InvoiceDetail" component={InvoiceDetail} />
            <Stack.Screen name="SaleInvoiceList" component={SaleInvoiceList} />
            <Stack.Screen name="SalesInvoice" component={SalesInvoice} />

            <Stack.Screen name="LoginPortal" component={LoginPortal} />
            <Stack.Screen name="SwitchCompany" component={SwitchCompany} />

            <Stack.Screen name="PendingDeliveryAdmin" component={PendingDeliveryAdmin} />
            <Stack.Screen name="PendingDeliveryIndividual" component={PendingDeliveryIndividual} />

            <Stack.Screen name="AddCustomer" component={AddCustomer} />
            <Stack.Screen name="Customers" component={Customers} />
            <Stack.Screen name="CustomersDetails" component={CustomersDetails} />
            <Stack.Screen name="EditCustomer" component={EditCustomer} />
            <Stack.Screen name="RetailerVisit" component={RetailerVisit} />
            <Stack.Screen name="RetailerLog" component={RetailerVisitLog} />
            <Stack.Screen name="RoutePath" component={RoutePath} />
            <Stack.Screen name="TodayLog" component={TodayLog} />

            <Stack.Screen name="EditOrder" component={EditSaleOrder} />
            <Stack.Screen name="OrderPreview" component={OrderPreview} />
            <Stack.Screen name="SaleHistory" component={SaleHistory} />
            <Stack.Screen name="Sales" component={Sales} />

            <Stack.Screen name="PosEditOrder" component={PosEditOrder} />
            <Stack.Screen name="SMTSale" component={SMTSale} />

            <Stack.Screen name="GodownActivities" component={GodownActivities} />
            <Stack.Screen name="GodownTransfer" component={GodownTransfer} />
            <Stack.Screen name="LiveStock" component={LiveStock} />
            <Stack.Screen name="StockInHand" component={StockInHand} />

            {/* No Need this  */}
            <Stack.Screen name="AdminItemSaleReturn" component={AdminItemSaleReturn} />
            <Stack.Screen name="BillAdminView" component={BillAdminView} />
            <Stack.Screen name="BillPayment" component={BillPayment} />
            <Stack.Screen name="BillSummary" component={BillSummary} />
            <Stack.Screen name="PendingInvoice" component={PendingInvoice} />
            <Stack.Screen name="PendingSaleAdmin" component={PendingSaleAdmin} />
            <Stack.Screen name="RetailerStock" component={RetailerStock} />
            <Stack.Screen name="SalesAdminDetail" component={SalesAdminDetail} />
            <Stack.Screen name="SalesReturnList" component={SalesReturnList} />
            <Stack.Screen name="StockClosing" component={StockClosing} />
            <Stack.Screen name="VisitLogSummary" component={VisitLogSummary} />
        </Stack.Navigator>
    );
};

export default AppStack;
