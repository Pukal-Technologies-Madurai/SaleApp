import React from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { customColors, typography } from "../Config/helper";

const { width } = Dimensions.get("window");

const CountModal = ({
    userCount,
    kilometersCount,
    isVisible,
    onClose,
    title,
    visitData = [],
    deliveryData = [],
}) => {
    const [expandedUser, setExpandedUser] = React.useState(null);

    const formatTime = dateString => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const renderVisitDetails = name => {
        const userVisits = visitData
            .filter(visit => visit.EntryByGet === name)
            .sort((a, b) => new Date(a.EntryAt) - new Date(b.EntryAt));

        return userVisits.map((visit, index) => (
            <View key={index} style={styles.visitDetailItem}>
                <Text
                    style={styles.visitDetailText}
                    numberOfLines={3}
                    ellipsizeMode="tail">
                    {visit.Reatailer_Name || "Unknown Customer"}
                </Text>
                <Text style={styles.visitTimeText}>
                    {formatTime(visit.EntryAt)}
                </Text>
            </View>
        ));
    };

    const renderCount = (name, count) => {
        if (title === "Delivery Status") {
            const pending = deliveryData.filter(
                d =>
                    d.Delivery_Person_Name === name &&
                    (d.DeliveryStatusName === "New" ||
                        d.DeliveryStatusName === "Pending"),
            ).length;

            return (
                <Text style={styles.userCountValue}>
                    {count} ({pending} pending)
                </Text>
            );
        }

        return <Text style={styles.userCountValue}>{count}</Text>;
    };

    React.useEffect(() => {
        setExpandedUser(null);
    }, [visitData]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {" "}
                            {title} Statistics
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}>
                            <Icon name="close" size={24} color="#2C3E50" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.userCountContainer}
                        contentContainerStyle={styles.scrollViewContent}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}>
                        {!userCount || Object.keys(userCount).length === 0 ? (
                            <View style={styles.noDataContainer}>
                                <Text style={styles.noDataText}>
                                    No data available
                                </Text>
                            </View>
                        ) : (
                            Object.entries(userCount).map(([name, count]) => (
                                <View key={name}>
                                    <TouchableOpacity
                                        style={styles.userCountItem}
                                        onPress={() => {
                                            if (title === "Check-In's") {
                                                setExpandedUser(
                                                    expandedUser === name
                                                        ? null
                                                        : name,
                                                );
                                            }
                                        }}>
                                        <View style={styles.userNameContainer}>
                                            <Text
                                                style={styles.userCountName}
                                                numberOfLines={3}
                                                ellipsizeMode="tail">
                                                {name}
                                            </Text>
                                            {title === "Check-In's" && (
                                                <Icon
                                                    name={
                                                        expandedUser === name
                                                            ? "chevron-up"
                                                            : "chevron-down"
                                                    }
                                                    size={16}
                                                    color="#95a5a6"
                                                />
                                            )}
                                        </View>
                                        {kilometersCount &&
                                        kilometersCount[name] ? (
                                            <>
                                                {kilometersCount &&
                                                    kilometersCount[name] && (
                                                        <Text
                                                            style={
                                                                styles.kmText
                                                            }>
                                                            Route distance:{" "}
                                                            <Text
                                                                style={{
                                                                    color: "#fc2105",
                                                                }}>
                                                                {
                                                                    kilometersCount[
                                                                        name
                                                                    ].totalKm
                                                                }{" "}
                                                                KM
                                                            </Text>
                                                        </Text>
                                                    )}
                                            </>
                                        ) : (
                                            <Text style={styles.userCountValue}>
                                                {renderCount(name, count)}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {title === "Check-In's" &&
                                        expandedUser === name && (
                                            <View
                                                style={
                                                    styles.visitDetailsContainer
                                                }>
                                                {renderVisitDetails(name)}
                                            </View>
                                        )}

                                    {/* {title === "Sales" && (
                                        <Text style={styles.totalValue}>₹{details.totalValue.toFixed(2)}</Text>
                                    )} */}
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={onClose}>
                        <Text style={styles.modalCloseButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "92%",
        maxHeight: "80%",
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 20,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        paddingBottom: 10,
    },
    modalTitle: {
        ...typography.h4(),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    closeButton: {
        padding: 5,
    },
    userCountContainer: {
        maxHeight: width * 0.9,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    userCountItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    userNameContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginRight: 16,
    },
    userCountName: {
        flexWrap: "wrap",
        width: width * 0.6,
        ...typography.body1(),
        color: "#34495E",
        marginRight: 10,
    },
    userCountValue: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#2ECC71",
    },
    kmText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey,
    },
    visitDetailsContainer: {
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 12,
        borderRadius: 8,
    },

    visitDetailItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    visitDetailText: {
        width: "60%",
        ...typography.body1(),
        color: "#34495e",
    },
    visitTimeText: {
        ...typography.body2(),
        color: "#95a5a6",
    },

    modalCloseButton: {
        backgroundColor: "#3498DB",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 15,
    },
    modalCloseButtonText: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.white,
    },
    noDataContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    noDataText: {
        ...typography.h5(),
        color: "#95a5a6",
        textAlign: "center",
    },
});

export default CountModal;
