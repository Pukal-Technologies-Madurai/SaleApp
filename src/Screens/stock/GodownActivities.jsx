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

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

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
            subtitle: "Current stock levels",
            icon: "inventory",
            iconColor: customColors.primary,
            bgColor: customColors.primary + "15",
            onPress: () => navigation.navigate("LiveStock"),
        },
        {
            id: 4,
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
            title: "Delivery Return Items",
            subtitle: "View all delivery return items",
            icon: "assignment-return",
            iconColor: customColors.secondary,
            bgColor: customColors.secondary + "20",
            onPress: () => navigation.navigate("DeliveryReturn", {
                selectedBranch: branchId,
            }),
        },
    ];

    const renderNavCard = item => (
        <TouchableOpacity
            key={item.id}
            style={[styles.navCard, { backgroundColor: item.bgColor }]}
            onPress={item.onPress}
            activeOpacity={0.7}>
            <View
                style={[
                    styles.iconContainer,
                    { backgroundColor: item.iconColor + "20" },
                ]}>
                <MaterialIcons
                    name={item.icon}
                    size={28}
                    color={item.iconColor}
                />
            </View>
            <Text style={styles.navTitle}>{item.title}</Text>
            <Text style={styles.navSubtitle}>{item.subtitle}</Text>
            <View style={styles.arrowContainer}>
                <FeatherIcon
                    name="arrow-right"
                    size={16}
                    color={item.iconColor}
                />
            </View>
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
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: spacing.md,
    },
    navCard: {
        width: CARD_WIDTH,
        padding: spacing.md,
        borderRadius: 16,
        marginBottom: spacing.xs,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    navTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 2,
    },
    navSubtitle: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    arrowContainer: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md,
    },
});