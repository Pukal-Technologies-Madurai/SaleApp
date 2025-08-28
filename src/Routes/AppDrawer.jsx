import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { customColors, shadows } from "../Config/helper";
import DrawerScreen from "./DrawerScreen";
import AppStack from "./AppStack";

const Drawer = createDrawerNavigator();

const AppDrawer = () => {
    return (
        <Drawer.Navigator
            drawerContent={props => <DrawerScreen {...props} />}
            screenOptions={{
                drawerStyle: {
                    backgroundColor: customColors.white,
                    width: "65%",
                    ...shadows.large,
                },
                // drawerType: "front",
                // overlayColor: "rgba(0, 0, 0, 0.5)",
                // swipeEnabled: true,
                // swipeEdgeWidth: 50,
                // headerShown: false,
                // drawerPosition: "left",
                // drawerHideStatusBarOnOpen: true,
                // sceneContainerStyle: {
                //     backgroundColor: customColors.white,
                // },
            }}>
            <Drawer.Screen
                name="AppStack"
                component={AppStack}
                options={{
                    headerShown: false,
                }}
            />
        </Drawer.Navigator>
    );
};

export default AppDrawer;
