import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import { customColors, typography, spacing } from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";


const GodownActivities = () => {
    const navigation = useNavigation();
    const [branchId, setBranchId] = React.useState(null);

    React.useEffect(() => {
        (async () => {
            try {
                const branchId = await AsyncStorage.getItem("branchId");

                let parsedBranchId = branchId;

                if (typeof branchId === "string") {
                    parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ""));
                } else {
                    parsedBranchId = parseInt(branchId);
                }

                setBranchId(parsedBranchId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const navScreens = [
        {
            id: 1,
            title: "Set Godown",
            subtitle: "Manage godown settings",
            icon: "warehouse",
            iconColor: customColors.warning,
            bgColor: customColors.warning + "15",
            onPress: () => navigation.navigate("MasterGodown"),
        },
        {
            id: 2,
            title: "Godown Transfer",
            subtitle: "Transfer stock",
            icon: "swap-horiz",
            iconColor: customColors.info,
            bgColor: customColors.info + "15",
            onPress: () => navigation.navigate("GodownTransfer"),
        },
        {
            id: 3,
            title: "Live Stock",
            subtitle: "Current sales stock",
            icon: "inventory",
            iconColor: customColors.primary,
            bgColor: customColors.primary + "15",
            onPress: () => navigation.navigate("LiveStock"),
        },
        {
            id: 4,
            title: "Delivery Return Items",
            subtitle: "View all delivery return items",
            icon: "assignment-return",
            iconColor: customColors.secondary,
            bgColor: customColors.secondary + "20",
            onPress: () => navigation.navigate("DeliveryReturn", {
                selectedBranch: branchId,
            }),
        },
        {
            id: 5,
            title: "Sale Orders",
            subtitle: "View all sale orders",
            icon: "assignment-turned-in",
            iconColor: customColors.accent1,
            bgColor: customColors.accent1 + "20",
            onPress: () => navigation.navigate("SalesAdmin"),
        },
        {
            id: 6,
            title: "Invoice List",
            subtitle: "View all invoices",
            icon: "receipt-long",
            iconColor: customColors.success,
            bgColor: customColors.success + "15",
            onPress: () => navigation.navigate("SaleInvoiceList" , {
                isAdmin: true,
                selectedBranch: branchId,
            }),
        },
    ];

    const renderNavCard = item => (
        <TouchableOpacity
            key={item.id}
            style={styles.navCard}
            onPress={item.onPress}
            activeOpacity={0.75}>
            {/* Left icon pill */}
            <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                <MaterialIcons name={item.icon} size={24} color={item.iconColor} />
            </View>

            {/* Label block */}
            <View style={styles.labelBlock}>
                <Text style={styles.navTitle}>{item.title}</Text>
                <Text style={styles.navSubtitle} numberOfLines={1}>
                    {item.subtitle}
                </Text>
            </View>

            {/* Right arrow */}
            <FeatherIcon name="chevron-right" size={20} color={customColors.grey400} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader title="Godown Activities" navigation={navigation} />
            <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}>
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <View style={styles.welcomeIcon}>
                        <MaterialIcons
                            name="warehouse"
                            size={40}
                            color={customColors.primary}
                        />
                    </View>
                    <Text style={styles.welcomeTitle}>Store Keeper Panel</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Manage your godown operations
                    </Text>
                </View>

                {/* Navigation Grid */}
                <View style={styles.navGrid}>
                    {navScreens.map(item => renderNavCard(item))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default GodownActivities;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    welcomeSection: {
        alignItems: "center",
        paddingVertical: spacing.lg,
        marginBottom: spacing.md,
    },
    welcomeIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: customColors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    welcomeTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    welcomeSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    navGrid: {
        gap: spacing.sm,
    },
    navCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 14,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.md,
        // subtle shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    labelBlock: {
        flex: 1,
    },
    navTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 2,
    },
    navSubtitle: {
        ...typography.caption(),
        color: customColors.grey500,
    },
});