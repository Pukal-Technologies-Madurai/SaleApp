import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import { customColors, typography, spacing, shadows } from "../../Config/helper";
import { useQuery } from "@tanstack/react-query";
import { fetchGodown } from "../../Api/retailers";

const MasterGodown = () => {
    const navigation = useNavigation();
    const [selectedGodown, setSelectedGodown] = React.useState(null);

    const { data: goDownData = [], isLoading, isError } = useQuery({
        queryKey: ["goDownData"],
        queryFn: () => fetchGodown(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        select: (rows) => {
            return rows.map((row) => ({
                id: row.Godown_Id,
                name: row.Godown_Name,
                tallyId: row.Godown_Tally_Id,
            }))
        }
    });

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader
                navigation={navigation}
                title="Master Godown"
            />

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loadingText}>Loading godowns...</Text>
                    </View>
                ) : isError ? (
                    <View style={styles.errorContainer}>
                        <MaterialIcons name="error-outline" size={48} color={customColors.error} />
                        <Text style={styles.errorText}>Failed to load godowns</Text>
                    </View>
                ) : (
                    <View style={styles.contentWrapper}>

                        {/* Section Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Select Active Godown</Text>
                            <Text style={styles.sectionSubtitle}>
                                Choose the godown that will be used for current operations
                            </Text>
                        </View>

                        {/* Godown Cards */}
                        <View style={styles.godownsList}>
                            {goDownData.map((godown) => {
                                const isSelected = selectedGodown?.id === godown.id;
                                return (
                                    <TouchableOpacity
                                        key={godown.id}
                                        style={[styles.godownCard, isSelected && styles.selectedCard]}
                                        onPress={() => setSelectedGodown(godown)}
                                        activeOpacity={0.7}>

                                        <View style={styles.cardHeader}>
                                            <View style={[
                                                styles.iconContainer,
                                                { backgroundColor: isSelected ? customColors.primary : customColors.grey100 }
                                            ]}>
                                                <MaterialIcons
                                                    name="warehouse"
                                                    size={24}
                                                    color={isSelected ? customColors.white : customColors.grey600}
                                                />
                                            </View>

                                            <View style={styles.godownInfo}>
                                                <Text style={[
                                                    styles.godownName,
                                                    isSelected && styles.selectedText
                                                ]}>
                                                    {godown.name}
                                                </Text>
                                                <View style={styles.tallyIdContainer}>
                                                    <MaterialIcons name="tag" size={14} color={customColors.grey500} />
                                                    <Text style={styles.tallyId}>
                                                        {godown.tallyId ? `Tally ID: ${godown.tallyId}` : "No Tally ID"}
                                                    </Text>
                                                </View>
                                            </View>

                                            {isSelected && (
                                                <MaterialIcons name="check-circle" size={24} color={customColors.success} />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Update Button */}
                        {selectedGodown && (
                            <TouchableOpacity style={styles.updateButton} onPress={() => {
                                Alert.alert(
                                    "Update Godown",
                                    `Set "${selectedGodown.name}" as active godown?`,
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Update",
                                            onPress: () => Alert.alert("Success", "Godown updated successfully!")
                                        }
                                    ]
                                );
                            }} activeOpacity={0.8}>
                                <MaterialIcons name="update" size={20} color={customColors.white} />
                                <Text style={styles.updateButtonText}>Set as Active Godown</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

export default MasterGodown

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    }, contentWrapper: {
        padding: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
        gap: spacing.md,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
        gap: spacing.md,
    },
    errorText: {
        ...typography.body1(),
        color: customColors.error,
        textAlign: "center",
    },
    sectionHeader: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
        lineHeight: 20,
    },
    godownsList: {
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    godownCard: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    selectedCard: {
        borderColor: customColors.primary,
        // backgroundColor: customColors.primary + "05",
        // ...shadows.medium,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    godownInfo: {
        flex: 1,
    },
    godownName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    selectedText: {
        color: customColors.primary,
    },
    tallyIdContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    tallyId: {
        ...typography.body2(),
        color: customColors.grey500,
        fontStyle: "italic",
    },
    updateButton: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        ...shadows.medium,
    },
    updateButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});