import {
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    Image,
    StatusBar,
    Linking,
} from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconFont from "react-native-vector-icons/FontAwesome6";
import IconAntDesign from "react-native-vector-icons/AntDesign";
import { customColors, typography, shadows, spacing } from "../Config/helper";
import assetImages from "../Config/Image";

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
            <StatusBar backgroundColor={customColors.primaryDark} />
            <View style={styles.header}>
                <Image source={assetImages.logo} style={styles.logo} />
            </View>

            <View style={styles.drawerContent}>
                <DrawerItem
                    icon={
                        <IconFont
                            name="circle-user"
                            size={24}
                            color={customColors.primary}
                        />
                    }
                    label="Account"
                    onPress={() => navigation.navigate("ProfileScreen")}
                />

                <DrawerItem
                    icon={
                        <IconAntDesign
                            name="adduser"
                            size={24}
                            color={customColors.primary}
                        />
                    }
                    label="Add Retailer"
                    onPress={() => navigation.navigate("AddCustomer")}
                />

                <DrawerItem
                    icon={
                        <IconAntDesign
                            name="setting"
                            size={24}
                            color={customColors.primary}
                        />
                    }
                    label="Master Info"
                    onPress={() => navigation.navigate("MasterData")}
                />

                <DrawerItem
                    label="App Settings"
                    icon={
                        <IconFont
                            name="screwdriver-wrench"
                            size={24}
                            color={customColors.primary}
                        />
                    }
                    onPress={() => {
                        Linking.openSettings();
                    }}
                />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Icon name="logout" size={24} color={customColors.white} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const DrawerItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.drawerItemText}>{label}</Text>
    </TouchableOpacity>
);

export default DrawerScreen;

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    header: {
        padding: spacing.lg,
        backgroundColor: customColors.primaryDark,
        alignItems: "center",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...shadows.medium,
    },
    logo: {
        width: "90%",
        height: 150,
        resizeMode: "contain",
    },
    drawerContent: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
    },
    drawerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 12,
        backgroundColor: customColors.grey50,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.white,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.sm,
        ...shadows.small,
    },
    drawerItemText: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        marginLeft: spacing.md,
        fontWeight: "500",
    },
    footer: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primaryDark,
        padding: spacing.md,
        borderRadius: 12,
        justifyContent: "center",
        ...shadows.small,
    },
    logoutText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginLeft: spacing.sm,
        fontWeight: "600",
    },
});
