import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/Feather";
import { customColors } from "../Config/helper";

const Accordion = ({ data, renderHeader, renderContent, customStyles = {} }) => {

    const [expanded, setExpanded] = useState(null);

    const toggleAccordion = (index) => {
        const newExpanded = expanded === index ? null : index;
        setExpanded(newExpanded);
    };

    return (
        <ScrollView style={[styles.container, customStyles.container]}>
            {data.map((item, index) => {
                const isExpanded = expanded === index;

                return (
                    <View key={index} style={[styles.itemContainer, customStyles.itemContainer]}>
                        <TouchableOpacity onPress={() => toggleAccordion(index)} activeOpacity={0.7}>
                            <View style={[styles.headerContent, customStyles.headerContent]}>
                                {renderHeader(item, index)}
                                <Icon size={24} color={customColors.white}
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
                )
            })}
        </ScrollView>
    )
}

export default Accordion

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    itemContainer: {
        marginBottom: 10,
        backgroundColor: customColors.primary,
        borderRadius: 10,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15,
    },
    contentContainer: {
        backgroundColor: customColors.background,
        padding: 10,
    },
})