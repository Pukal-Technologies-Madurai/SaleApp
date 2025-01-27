import {
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconFont from "react-native-vector-icons/FontAwesome6";
import IconAntDesign from "react-native-vector-icons/AntDesign";

import { customColors, typography } from "../Config/helper";

const DrawerScreen = ({ navigation }) => {
    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "Autheticate_Id",
                "userToken",
                "UserId",
                "userName",
                "Name",
                "UserType",
                "branchId",
                "branchName",
                "userTypeId",
            ]);
            ToastAndroid.show("Log out Successfully", ToastAndroid.LONG);

            navigation.reset({
                index: 0,
                routes: [{ name: "LoginPortal" }],
            });
            navigation.closeDrawer();
        } catch (err) {
            console.error("Error clearing AsyncStorage: ", err);
        }
    };

    return (
        <View style={styles.drawerContainer}>
            <View style={styles.header}>
                <Text style={styles.appName}>Pukal Virpanai</Text>
            </View>

            <View style={styles.drawerContent}>
                <DrawerItem
                    icon={
                        <IconFont
                            name="circle-user"
                            size={24}
                            color={customColors.white}
                        />
                    }
                    label="Account"
                    onPress={() => navigation.navigate("ProfileScreen")}
                />

                <DrawerItem
                    icon={
                        <IconAntDesign
                            name="user"
                            size={24}
                            color={customColors.white}
                        />
                    }
                    label="Retailers"
                    onPress={() => navigation.navigate("Customers")}
                />

                <DrawerItem
                    icon={
                        <IconAntDesign
                            name="adduser"
                            size={24}
                            color={customColors.white}
                        />
                    }
                    label="Add Retailer"
                    onPress={() => navigation.navigate("AddCustomer")}
                />
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Icon name="logout" size={24} color={customColors.primary} />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const DrawerItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
        {icon}
        <Text style={styles.drawerItemText}>{label}</Text>
    </TouchableOpacity>
);

export default DrawerScreen;

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: customColors.background,
        // paddingVertical: 50,
        // paddingHorizontal: 20,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#a0a0a0",
        alignItems: "center",
        marginBottom: 20,
        borderBottomStartRadius: 20,
        borderBottomEndRadius: 20,
    },
    appName: {
        width: "50%",
        textAlign: "center",
        ...typography.h3(),
        fontStyle: "italic",
        fontWeight: "bold",
        color: customColors.white,
    },
    drawerContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    drawerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#a0a0a0",
    },
    drawerItemText: {
        ...typography.h6(),
        marginLeft: 20,
        color: customColors.white,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 8,
    },
    logoutText: {
        ...typography.h5(),
        color: customColors.primary,
        marginLeft: 10,
    },
});
