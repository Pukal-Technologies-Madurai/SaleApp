import {
    FlatList,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchRetailers } from "../../Api/retailers";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { formatDate } from "../../Config/functions";

const TodayLog = () => {
    const navigation = useNavigation();
    const [companyId, setCompanyId] = useState();
    const [userId, setUserId] = useState(null);
    const [today, setToday] = useState("");

    useEffect(() => {
        const currentDate = new Date();
        setToday(formatDate(currentDate));

        AsyncStorage.getItem("Company_Id").then(id => {
            setCompanyId(id);
        });
        AsyncStorage.getItem("UserId").then(id => {
            setUserId(id);
        });
    }, []);

    const dailyDate = new Date().toISOString().split("T")[0];

    const { data: logData = [] } = useQuery({
        queryKey: ["retailers", companyId, userId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId && !!userId,
        select: data => {
            return data.filter(item => {
                const createdDate = item.Created_Date?.split("T")[0];
                return createdDate === dailyDate;
            });
        },
    });

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.itemContainer} disabled>
            <View style={styles.itemHeader}>
                <Text style={styles.title}>{item.Retailer_Name}</Text>
            </View>

            <View style={styles.itemContent}>
                <View style={styles.infoRow}>
                    <Icon
                        name="location-on"
                        size={20}
                        color={customColors.grey500}
                    />
                    <Text style={styles.subtitle} numberOfLines={2}>
                        {item.Reatailer_Address}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="person"
                        size={20}
                        color={customColors.grey500}
                    />
                    <Text style={styles.subtitle}>
                        Created By: {item.createdBy}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon name="event" size={20} color={customColors.grey500} />
                    <Text style={styles.subtitle}>Created Date: {today}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Today's Log"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialCommunityIcons"
                rightIconName="sale"
                onRightPress={() => navigation.navigate("SalesAdmin")}
            />

            <View style={styles.contentContainer}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>New Retailers</Text>
                    <Text style={styles.headerSubtitle}>
                        {logData.length}{" "}
                        {logData.length === 1 ? "shop" : "shops"} today
                    </Text>
                </View>

                {logData.length > 0 ? (
                    <FlatList
                        data={logData}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Icon
                            name="event-busy"
                            size={64}
                            color={customColors.grey300}
                        />
                        <Text style={styles.emptyText}>
                            No Shops recorded for today
                        </Text>
                        <Text style={styles.emptySubtext}>
                            Your shop logs will appear here
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    headerContainer: {
        padding: spacing.lg,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerTitle: {
        ...typography.h6(),
        color: customColors.text,
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
    },
    listContainer: {
        padding: spacing.md,
    },
    itemContainer: {
        backgroundColor: customColors.white,
        borderRadius: spacing.md,
        marginBottom: spacing.md,
        ...shadows.small,
        overflow: "hidden",
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primaryLight,
    },
    itemContent: {
        padding: spacing.md,
    },
    title: {
        ...typography.h6(),
        color: customColors.black,
        fontWeight: "800",
        flex: 1,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body2(),
        color: customColors.grey700,
        marginLeft: spacing.sm,
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.h6(),
        color: customColors.grey700,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
    },
});

export default TodayLog;
