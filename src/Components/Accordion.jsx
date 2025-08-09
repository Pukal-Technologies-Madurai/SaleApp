import { StyleSheet, View, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { customColors, shadows, spacing } from "../Config/helper";

const Accordion = ({
    data,
    renderHeader,
    renderContent,
    customStyles = {},
}) => {
    const [expanded, setExpanded] = useState(null);

    const toggleAccordion = index => {
        setExpanded(expanded === index ? null : index);
    };

    return (
        <View style={[styles.container, customStyles.container]}>
            {data.map((item, index) => (
                <View
                    key={index}
                    style={[
                        styles.itemContainer,
                        customStyles.itemContainer,
                        expanded === index && styles.expandedItem,
                    ]}>
                    <TouchableOpacity
                        onPress={() => toggleAccordion(index)}
                        activeOpacity={0.8}
                        style={styles.headerButton}>
                        <View style={styles.headerWrapper}>
                            {renderHeader(item, index)}
                        </View>
                    </TouchableOpacity>
                    {expanded === index && (
                        <View
                            style={[
                                styles.contentContainer,
                                customStyles.contentContainer,
                            ]}>
                            {renderContent(item)}
                        </View>
                    )}
                </View>
            ))}
        </View>
    );
};

export default Accordion;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginVertical: spacing.sm,
        marginHorizontal: spacing.sm,
    },
    itemContainer: {
        marginBottom: spacing.xs,
        backgroundColor: customColors.white,
        borderRadius: 8,
        overflow: "hidden",
    },
    expandedItem: {
        ...shadows.medium,
    },
    headerButton: {
        width: "100%",
    },
    headerWrapper: {
        position: "relative",
        width: "100%",
    },
    chevronContainer: {
        position: "absolute",
        right: spacing.sm,
        top: "50%",
        transform: [{ translateY: -9 }],
        width: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
    },
    contentContainer: {
        backgroundColor: customColors.white,
    },
});
