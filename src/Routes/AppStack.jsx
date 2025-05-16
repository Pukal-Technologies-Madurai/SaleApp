import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import OpenCamera from "../Components/OpenCamera";
import SalesReport from "../Screens/reports/SalesReport";

import StartScreen from "../Screens/StartScreen";
import LoginScreen from "../Screens/login/LoginScreen";
import HomeScreen from "../Screens/HomeScreen";
import Customers from "../Screens/retailers/Customers";
import CustomersDetails from "../Screens/retailers/CustomersDetails";
import AddCustomer from "../Screens/retailers/AddCustomer";
import EditCustomer from "../Screens/retailers/EditCustomer";
import Attendance from "../Screens/attendance/Attendance";
import EndDay from "../Screens/attendance/EndDay";
import AttendanceInfo from "../Screens/attendance/AttendanceInfo";
import RetailerVisit from "../Screens/retailers/RetailerVisit";
import RetailerVisitLog from "../Screens/retailers/RetailerVisitLog";
import AttendanceReport from "../Screens/attendance/AttendanceReport";
import StockClosing from "../Screens/sales/StockClosing";
import StockInfo from "../Screens/reports/StockInfo";
import OrderPreview from "../Screens/reports/OrderPreview";
import ProfileScreen from "../Screens/ProfileScreen";
import RetailerMapView from "../Screens/RetailerMapView";
import Sales from "../Screens/sales/Sales";
import LoginPortal from "../Screens/login/LoginPortal";
import TodayLog from "../Screens/retailers/TodayLog";
import DeliveryReport from "../Screens/reports/DeliveryReport";
import RetailerStock from "../Screens/reports/RetailerStock";
import MasterData from "../Screens/reports/MasterData";
import SaleHistory from "../Screens/sales/SaleHistory";
import TripSheet from "../Screens/reports/TripSheet";
import EditSaleOrder from "../Screens/sales/EditSaleOrder";
import TripReport from "../Screens/reports/TripReport";
import TripDetails from "../Screens/reports/TripDetails";
import BillPayment from "../Screens/reports/BillPayment";
import BillSummary from "../Screens/reports/BillSummary";
import BillAdminView from "../Screens/reports/BillAdminView";
import DeliveryUpdate from "../Screens/reports/DeliveryUpdate";

const Stack = createStackNavigator();

const AppStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="StartScreen"
            screenOptions={{
                header: () => null,
            }}>
            <Stack.Screen name="StartScreen" component={StartScreen} />
            <Stack.Screen name="LoginPortal" component={LoginPortal} />

            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="EditCustomer" component={EditCustomer} />

            <Stack.Screen name="Customers" component={Customers} />
            <Stack.Screen
                name="CustomersDetails"
                component={CustomersDetails}
            />
            <Stack.Screen name="RetailerVisit" component={RetailerVisit} />
            <Stack.Screen name="TodayLog" component={TodayLog} />

            <Stack.Screen name="RetailerLog" component={RetailerVisitLog} />
            <Stack.Screen name="StockInfo" component={StockInfo} />
            <Stack.Screen
                name="AttendanceReport"
                component={AttendanceReport}
            />

            <Stack.Screen name="AttendanceInfo" component={AttendanceInfo} />
            <Stack.Screen name="Attendance" component={Attendance} />
            <Stack.Screen name="EndDay" component={EndDay} />

            <Stack.Screen name="OpenCamera" component={OpenCamera} />
            <Stack.Screen name="StockClosing" component={StockClosing} />

            <Stack.Screen name="EditOrder" component={EditSaleOrder} />
            <Stack.Screen name="OrderPreview" component={OrderPreview} />
            <Stack.Screen name="SalesReport" component={SalesReport} />
            <Stack.Screen name="Sales" component={Sales} />
            <Stack.Screen name="SaleHistory" component={SaleHistory} />

            <Stack.Screen name="TripSheet" component={TripSheet} />
            <Stack.Screen name="TripReport" component={TripReport} />
            <Stack.Screen name="TripDetails" component={TripDetails} />
            <Stack.Screen name="DeliveryReport" component={DeliveryReport} />
            <Stack.Screen name="RetailerStock" component={RetailerStock} />
            <Stack.Screen name="MasterData" component={MasterData} />
            <Stack.Screen name="BillPayment" component={BillPayment} />
            <Stack.Screen name="BillSummary" component={BillSummary} />
            <Stack.Screen name="BillAdminView" component={BillAdminView} />
            <Stack.Screen name="DeliveryUpdate" component={DeliveryUpdate} />

            {/* Not Used */}
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen
                name="AddCustomer"
                component={AddCustomer}
                options={{ title: "Retailer Visit" }}
            />
            <Stack.Screen
                name="RetailerMapView"
                component={RetailerMapView}
                options={{ title: "Retailers" }}
            />
        </Stack.Navigator>
    );
};

export default AppStack;
