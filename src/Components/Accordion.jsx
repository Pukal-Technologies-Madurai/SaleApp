import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/Feather";
import { customColors, shadows, spacing, typography } from "../Config/helper";

const Accordion = ({ data, renderHeader, renderContent, customStyles = {} }) => {
    const [expanded, setExpanded] = useState(null);

    const toggleAccordion = (index) => {
        setExpanded(expanded === index ? null : index);
    };

    return (
        <ScrollView 
            style={[styles.container, customStyles.container]}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {data.map((item, index) => (
                <View 
                    key={index} 
                    style={[
                        styles.itemContainer, 
                        customStyles.itemContainer,
                        expanded === index && styles.expandedItem
                    ]}>
                    <TouchableOpacity 
                        onPress={() => toggleAccordion(index)} 
                        activeOpacity={0.7}
                        style={styles.headerButton}>
                        <View style={[styles.headerContent, customStyles.headerContent]}>
                            {renderHeader(item, index)}
                            <Icon 
                                size={24} 
                                color={customColors.white}
                                name={expanded === index ? "chevron-up" : "chevron-down"}
                            />
                        </View>
                    </TouchableOpacity>
                    {expanded === index && (
                        <View style={[styles.contentContainer, customStyles.contentContainer]}>
                            {renderContent(item)}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
};

export default Accordion;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.sm,
    },
    itemContainer: {
        marginBottom: spacing.sm,
        backgroundColor: customColors.primary,
        borderRadius: 12,
        overflow: 'hidden',
        ...shadows.medium,
    },
    expandedItem: {
        ...shadows.large,
    },
    headerButton: {
        width: '100%',
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    contentContainer: {
        backgroundColor: customColors.white,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
});