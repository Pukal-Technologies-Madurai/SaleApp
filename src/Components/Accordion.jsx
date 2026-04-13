import { StyleSheet, View, TouchableOpacity, LayoutAnimation } from "react-native";
import React, { useState, useCallback } from "react";
import { customColors, shadows, spacing } from "../Config/helper";

const Accordion = ({
    data,
    renderHeader,
    renderContent,
    customStyles = {},
}) => {
    const [expanded, setExpanded] = useState(null);

    const toggleAccordion = useCallback((index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(prev => prev === index ? null : index);
    }, []);

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
                        activeOpacity={0.9}
                        style={styles.headerButton}>
                        <View style={[
                            styles.headerWrapper,
                            expanded === index && styles.headerExpanded,
                        ]}>
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
        marginVertical: spacing.xs,
        marginHorizontal: spacing.sm,
    },
    itemContainer: {
        marginBottom: spacing.sm,
        backgroundColor: customColors.white,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: customColors.grey100,
    },
    expandedItem: {
        ...shadows.medium,
        borderColor: customColors.primary + "30",
    },
    headerButton: {
        width: "100%",
    },
    headerWrapper: {
        position: "relative",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
    },
    headerExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    contentContainer: {
        backgroundColor: customColors.white,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
});
