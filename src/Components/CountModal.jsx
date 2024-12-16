import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { customColors, typography } from "../Config/helper";

const { width } = Dimensions.get("window");

const CountModal = ({
    userCount,
    isVisible,
    onClose,
    title
}) => {
    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose} >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title} Statistics</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#2C3E50" />
                        </TouchableOpacity>
                    </View>

                    {/* User Count List */}
                    <ScrollView
                        style={styles.userCountContainer}
                        contentContainerStyle={styles.scrollViewContent}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                    >
                        {Object.entries(userCount).map(([name, count]) => (
                            <View key={name} style={styles.userCountItem}>
                                <Text style={styles.userCountName}
                                    numberOfLines={3}
                                    ellipsizeMode="tail"
                                >{name}
                                </Text>
                                <Text style={styles.userCountValue}>{count}</Text>
                                {/* {title === "Sales" && (
                                    <Text style={styles.totalValue}>₹{details.totalValue.toFixed(2)}</Text>
                                )} */}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={onClose}
                    >
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    userCountName: {
        width: "40%",
        ...typography.body1(),
        color: "#34495E",
        marginRight: 10,
        flexWrap: "wrap",
        width: width * 0.6,
    },
    userCountValue: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#3498DB",
        // marginRight: 20
    },
    totalValue: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#af4e33",
        // marginRight: 20
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
});

export default CountModal;